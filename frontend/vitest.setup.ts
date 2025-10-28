import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

// Mock Neo4j driver to prevent real database connections in tests
// Using vi.hoisted to allow individual tests to override these mocks
vi.mock('@/lib/neo4j', async () => {
  const actual = await vi.importActual<typeof import('@/lib/neo4j')>('@/lib/neo4j')
  return {
    ...actual,
    executeReadQuery: vi.fn().mockResolvedValue({
      records: []
    }),
    getAggregatedCommunicationData: vi.fn().mockResolvedValue({
      frequency: [],
      responseTime: { 
        buckets: [], 
        average: 0, 
        median: 0 
      },
      activityHeatmap: Array(7).fill(Array(24).fill(0)),
      talkToListenRatio: { 
        user1Messages: 50, 
        user2Messages: 50 
      },
      conversationTypes: {
        direct: 5,
        group: 3
      }
    })
  }
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEO4J_01_URI = 'bolt://localhost:7687'
process.env.NEO4J_01_USER = 'neo4j'
process.env.NEO4J_01_PASSWORD = 'test-password'
process.env.NEXT_PUBLIC_URL = 'http://localhost:3000'
// Disable ETags for general tests, enable only for ETag-specific tests
process.env.ETAGS_ENABLED = 'false'

// Suppress console errors during tests unless debugging
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOMTestUtils.act is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock DOM APIs for Radix UI components
if (typeof window !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false)
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  }
  
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }
  
  // Mock ResizeObserver for cmdk
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

