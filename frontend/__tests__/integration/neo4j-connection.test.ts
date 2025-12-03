/**
 * Integration tests for Neo4j database connection
 *
 * These tests require a running Neo4j instance via docker-compose.test.yml
 * Run: docker compose -f docker-compose.test.yml up -d --wait
 *
 * Port: 7689 (unique to neo4j-communication)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import neo4j, { Driver } from 'neo4j-driver'

const TEST_URI = process.env.NEO4J_01_URI || 'bolt://localhost:7689'
const TEST_USER = process.env.NEO4J_01_USER || 'neo4j'
const TEST_PASSWORD = process.env.NEO4J_01_PASSWORD || 'testpassword'

describe('Neo4j Connection Integration Tests', () => {
  let driver: Driver

  beforeAll(async () => {
    driver = neo4j.driver(TEST_URI, neo4j.auth.basic(TEST_USER, TEST_PASSWORD))
  })

  afterAll(async () => {
    await driver.close()
  })

  it('should connect to the test database', async () => {
    const serverInfo = await driver.getServerInfo()
    expect(serverInfo.address).toBeDefined()
  })

  it('should execute a simple read query', async () => {
    const session = driver.session()
    try {
      const result = await session.run('RETURN 1 as num')
      expect(result.records[0].get('num').toNumber()).toBe(1)
    } finally {
      await session.close()
    }
  })

  it('should handle user and conversation data structures', async () => {
    const session = driver.session()
    try {
      // Create test communication data
      await session.run(`
        CREATE (u1:TestUser {userId: 'test-user-1', name: 'Test User 1'})
        CREATE (u2:TestUser {userId: 'test-user-2', name: 'Test User 2'})
        CREATE (c:TestConversation {conversationId: 'test-conv-1', title: 'Test Conversation'})
        CREATE (u1)-[:PARTICIPATES_IN]->(c)
        CREATE (u2)-[:PARTICIPATES_IN]->(c)
        CREATE (m:TestMessage {messageId: 'test-msg-1', content: 'Hello', timestamp: datetime()})
        CREATE (u1)-[:SENT]->(m)
        CREATE (m)-[:PART_OF]->(c)
      `)

      // Query conversation with participants
      const result = await session.run(`
        MATCH (c:TestConversation {conversationId: 'test-conv-1'})
        OPTIONAL MATCH (u:TestUser)-[:PARTICIPATES_IN]->(c)
        OPTIONAL MATCH (m:TestMessage)-[:PART_OF]->(c)
        RETURN c.title as title,
               collect(DISTINCT u.name) as participants,
               count(DISTINCT m) as messageCount
      `)

      expect(result.records.length).toBe(1)
      expect(result.records[0].get('title')).toBe('Test Conversation')
      expect(result.records[0].get('participants')).toContain('Test User 1')
      expect(result.records[0].get('participants')).toContain('Test User 2')

      // Cleanup
      await session.run(`
        MATCH (n) WHERE n.userId IN ['test-user-1', 'test-user-2']
           OR n.conversationId = 'test-conv-1'
           OR n.messageId = 'test-msg-1'
        DETACH DELETE n
      `)
    } finally {
      await session.close()
    }
  })
})
