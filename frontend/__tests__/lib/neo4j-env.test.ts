import { describe, it, expect, vi } from 'vitest'

// This test must run in isolation with no environment variables
describe('Neo4j Environment Variable Fallbacks', () => {
  it('uses default values when environment variables are not set', async () => {
    // Store original env vars
    const originalURI = process.env.NEO4J_01_URI
    const originalUser = process.env.NEO4J_01_USER  
    const originalPassword = process.env.NEO4J_01_PASSWORD
    
    // Clear environment variables
    delete process.env.NEO4J_01_URI
    delete process.env.NEO4J_01_USER
    delete process.env.NEO4J_01_PASSWORD
    
    // Reset modules to clear cached imports
    vi.resetModules()
    
    // Set up mocks for neo4j-driver
    vi.doMock('neo4j-driver', () => {
      const mockDriver = vi.fn().mockReturnValue({
        session: vi.fn().mockReturnValue({
          run: vi.fn(),
          close: vi.fn()
        }),
        close: vi.fn()
      })
      
      return {
        default: {
          driver: mockDriver,
          auth: {
            basic: vi.fn((user, password) => ({ user, password }))
          }
        }
      }
    })
    
    // Import neo4j module after env vars are cleared
    const { getDriver } = await import('@/lib/neo4j')
    const neo4jDriver = (await import('neo4j-driver')).default
    
    // Trigger driver creation
    getDriver()
    
    // Verify default values were used
    expect(neo4jDriver.driver).toHaveBeenCalledWith(
      'bolt://localhost:7687',
      expect.objectContaining({
        user: 'neo4j',
        password: 'changeme123'
      }),
      expect.objectContaining({
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        connectionTimeout: 30000
      })
    )
    
    // Restore environment variables
    if (originalURI !== undefined) process.env.NEO4J_01_URI = originalURI
    if (originalUser !== undefined) process.env.NEO4J_01_USER = originalUser
    if (originalPassword !== undefined) process.env.NEO4J_01_PASSWORD = originalPassword
    
    // Reset modules again
    vi.resetModules()
  })
})