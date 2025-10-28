/**
 * Neo4j database connection management
 *
 * This module handles:
 * - Driver instance creation and lifecycle
 * - Session management
 * - Query execution wrapper
 * - Connection testing
 */

import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_01_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_01_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_01_PASSWORD || 'changeme123';

// Singleton driver instance
let driver: Driver | null = null;

/**
 * Get or create the Neo4j driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        connectionTimeout: 30000,
        disableLosslessIntegers: true, // Return regular JS numbers instead of Integer objects
      }
    );
  }
  return driver;
}

/**
 * Get a new session from the driver
 */
export function getSession(): Session {
  return getDriver().session();
}

/**
 * Close the driver connection
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Reset driver instance (for testing only)
 * @internal
 */
export function resetDriver(): void {
  driver = null;
}

/**
 * Execute a read query with proper error handling
 */
export async function executeReadQuery(
  query: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult> {
  const session = getSession();
  try {
    const result = await session.run(query, params);
    return result;
  } catch (error) {
    console.error('Neo4j query error:', error);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await session.close();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  const session = getSession();
  try {
    await session.run('RETURN 1');
    return true;
  } catch (error) {
    console.error('Neo4j connection test failed:', error);
    return false;
  } finally {
    await session.close();
  }
}
