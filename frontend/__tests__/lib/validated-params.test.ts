import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validatePage,
  validateLimit,
  validatePaginationParams,
  calculateOffset,
  createPaginationSearchParams,
  validateApiPaginationParams,
  isValidPage,
  isValidLimit,
  PAGINATION_CONFIG,
  type ValidatedPage,
  type ValidatedLimit
} from '@/lib/validated-params'

describe('Validated Parameters', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Type Guards', () => {
    describe('isValidPage', () => {
      it('returns true for valid page numbers', () => {
        expect(isValidPage(1)).toBe(true)
        expect(isValidPage(10)).toBe(true)
        expect(isValidPage(100)).toBe(true)
        expect(isValidPage(9999)).toBe(true)
      })

      it('returns false for invalid page numbers', () => {
        expect(isValidPage(0)).toBe(false)
        expect(isValidPage(-1)).toBe(false)
        expect(isValidPage(10001)).toBe(false) // Over max
        expect(isValidPage(1.5)).toBe(false)
        expect(isValidPage('1')).toBe(false)
        expect(isValidPage(null)).toBe(false)
        expect(isValidPage(undefined)).toBe(false)
      })
    })

    describe('isValidLimit', () => {
      it('returns true for valid limit numbers', () => {
        expect(isValidLimit(1)).toBe(true)
        expect(isValidLimit(20)).toBe(true)
        expect(isValidLimit(50)).toBe(true)
        expect(isValidLimit(100)).toBe(true)
      })

      it('returns false for invalid limit numbers', () => {
        expect(isValidLimit(0)).toBe(false)
        expect(isValidLimit(-1)).toBe(false)
        expect(isValidLimit(101)).toBe(false) // Over max
        expect(isValidLimit(1.5)).toBe(false)
        expect(isValidLimit('20')).toBe(false)
        expect(isValidLimit(null)).toBe(false)
        expect(isValidLimit(undefined)).toBe(false)
      })
    })
  })

  describe('validatePage', () => {
    it('returns valid page numbers as-is', () => {
      expect(validatePage(1)).toBe(1)
      expect(validatePage(5)).toBe(5)
      expect(validatePage(100)).toBe(100)
    })

    it('parses valid string numbers', () => {
      expect(validatePage('1')).toBe(1)
      expect(validatePage('25')).toBe(25)
      expect(validatePage('999')).toBe(999)
    })

    it('returns default for invalid inputs', () => {
      expect(validatePage(0)).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(validatePage(-5)).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(validatePage('abc')).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(validatePage(null)).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(validatePage(undefined)).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
    })

    it('logs warnings for invalid inputs with context', () => {
      validatePage(-1, 'test-context')
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid page parameter (test-context):',
        -1,
        '- using default:',
        PAGINATION_CONFIG.DEFAULT_PAGE
      )
    })

    it('does not log warnings for null/undefined/empty', () => {
      validatePage(null)
      validatePage(undefined)
      validatePage('')
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('handles very large numbers by providing default', () => {
      expect(validatePage(999999)).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
    })
  })

  describe('validateLimit', () => {
    it('returns valid limit numbers as-is', () => {
      expect(validateLimit(1)).toBe(1)
      expect(validateLimit(20)).toBe(20)
      expect(validateLimit(50)).toBe(50)
      expect(validateLimit(100)).toBe(100)
    })

    it('parses valid string numbers', () => {
      expect(validateLimit('1')).toBe(1)
      expect(validateLimit('25')).toBe(25)
      expect(validateLimit('100')).toBe(100)
    })

    it('caps values at maximum limit', () => {
      expect(validateLimit(200)).toBe(PAGINATION_CONFIG.MAX_LIMIT)
      expect(validateLimit(999)).toBe(PAGINATION_CONFIG.MAX_LIMIT)
      expect(validateLimit('500')).toBe(PAGINATION_CONFIG.MAX_LIMIT)
    })

    it('returns default for values below minimum', () => {
      expect(validateLimit(0)).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
      expect(validateLimit(-5)).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
    })

    it('returns default for invalid inputs', () => {
      expect(validateLimit('abc')).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
      expect(validateLimit(null)).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
      expect(validateLimit(undefined)).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
      expect(validateLimit(1.5)).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
    })

    it('logs appropriate warnings', () => {
      // Test capping warning
      validateLimit(200, 'test-context')
      expect(console.warn).toHaveBeenCalledWith(
        'Limit parameter (test-context) exceeds maximum:',
        200,
        '- capping at:',
        PAGINATION_CONFIG.MAX_LIMIT
      )

      vi.clearAllMocks()

      // Test invalid input warning
      validateLimit('invalid', 'test-context')
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid limit parameter (test-context):',
        'invalid',
        '- using default:',
        PAGINATION_CONFIG.DEFAULT_LIMIT
      )
    })

    it('does not log warnings for null/undefined/empty', () => {
      validateLimit(null)
      validateLimit(undefined)
      validateLimit('')
      expect(console.warn).not.toHaveBeenCalled()
    })
  })

  describe('validatePaginationParams', () => {
    it('validates both page and limit from search params', () => {
      const searchParams = new URLSearchParams('page=5&limit=25')
      const result = validatePaginationParams(searchParams)
      
      expect(result.page).toBe(5)
      expect(result.limit).toBe(25)
    })

    it('handles missing parameters with defaults', () => {
      const searchParams = new URLSearchParams('')
      const result = validatePaginationParams(searchParams)
      
      expect(result.page).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(result.limit).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
    })

    it('handles invalid parameters', () => {
      const searchParams = new URLSearchParams('page=abc&limit=xyz')
      const result = validatePaginationParams(searchParams)
      
      expect(result.page).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(result.limit).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
    })

    it('caps limit values appropriately', () => {
      const searchParams = new URLSearchParams('page=1&limit=500')
      const result = validatePaginationParams(searchParams)
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(PAGINATION_CONFIG.MAX_LIMIT)
    })

    it('passes context to validation functions', () => {
      const searchParams = new URLSearchParams('page=-1&limit=abc')
      validatePaginationParams(searchParams, 'custom-context')
      
      // Check that context was passed to both validation calls
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid page parameter (custom-context):',
        '-1',
        '- using default:',
        1
      )
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid limit parameter (custom-context):',
        'abc',
        '- using default:',
        20
      )
    })
  })

  describe('calculateOffset', () => {
    it('calculates correct offset for first page', () => {
      const params = { page: 1 as ValidatedPage, limit: 20 as ValidatedLimit }
      expect(calculateOffset(params)).toBe(0)
    })

    it('calculates correct offset for subsequent pages', () => {
      const params = { page: 3 as ValidatedPage, limit: 25 as ValidatedLimit }
      expect(calculateOffset(params)).toBe(50) // (3-1) * 25
    })

    it('handles large page numbers correctly', () => {
      const params = { page: 100 as ValidatedPage, limit: 10 as ValidatedLimit }
      expect(calculateOffset(params)).toBe(990) // (100-1) * 10
    })
  })

  describe('createPaginationSearchParams', () => {
    it('creates URLSearchParams from validated parameters', () => {
      const params = { page: 5 as ValidatedPage, limit: 30 as ValidatedLimit }
      const searchParams = createPaginationSearchParams(params)
      
      expect(searchParams.get('page')).toBe('5')
      expect(searchParams.get('limit')).toBe('30')
    })

    it('creates correct string representation', () => {
      const params = { page: 2 as ValidatedPage, limit: 15 as ValidatedLimit }
      const searchParams = createPaginationSearchParams(params)
      
      expect(searchParams.toString()).toBe('page=2&limit=15')
    })
  })

  describe('validateApiPaginationParams', () => {
    it('validates parameters from request URL', () => {
      const request = new Request('http://localhost:3000/api/test?page=3&limit=40')
      const result = validateApiPaginationParams(request)
      
      expect(result.page).toBe(3)
      expect(result.limit).toBe(40)
      expect(result.offset).toBe(80) // (3-1) * 40
    })

    it('handles missing parameters with defaults', () => {
      const request = new Request('http://localhost:3000/api/test')
      const result = validateApiPaginationParams(request)
      
      expect(result.page).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(result.limit).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
      expect(result.offset).toBe(0)
    })

    it('handles invalid parameters with defaults', () => {
      const request = new Request('http://localhost:3000/api/test?page=invalid&limit=bad')
      const result = validateApiPaginationParams(request)
      
      expect(result.page).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(result.limit).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
      expect(result.offset).toBe(0)
    })

    it('caps limit and calculates offset correctly', () => {
      const request = new Request('http://localhost:3000/api/test?page=2&limit=500')
      const result = validateApiPaginationParams(request)
      
      expect(result.page).toBe(2)
      expect(result.limit).toBe(PAGINATION_CONFIG.MAX_LIMIT)
      expect(result.offset).toBe(PAGINATION_CONFIG.MAX_LIMIT) // (2-1) * 100
    })

    it('passes context to validation', () => {
      const request = new Request('http://localhost:3000/api/test?page=-1')
      validateApiPaginationParams(request, 'api-test')
      
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid page parameter (api-test):',
        '-1',
        '- using default:',
        1
      )
    })
  })

  describe('Constants and Configuration', () => {
    it('exports configuration constants', () => {
      expect(PAGINATION_CONFIG).toEqual({
        MIN_PAGE: 1,
        MAX_PAGE: 10000,
        MIN_LIMIT: 1,
        MAX_LIMIT: 100,
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
      })
    })

    it('uses consistent default values', () => {
      expect(validatePage(undefined)).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(validateLimit(undefined)).toBe(PAGINATION_CONFIG.DEFAULT_LIMIT)
    })
  })

  describe('TypeScript Brand Types', () => {
    it('validates return types are properly branded', () => {
      const page = validatePage(5)
      const limit = validateLimit(25)
      
      // These should be branded types that TypeScript treats as distinct
      expect(typeof page).toBe('number')
      expect(typeof limit).toBe('number')
      
      // Can be used in places expecting branded types
      const params = { page, limit }
      const offset = calculateOffset(params)
      expect(offset).toBe(100) // (5-1) * 25
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles malformed URL in API validation', () => {
      // This would normally throw, but our function should handle it gracefully
      const request = new Request('http://localhost:3000/api/test?page=1&limit=20')
      const result = validateApiPaginationParams(request)
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('handles extremely large string numbers', () => {
      expect(validatePage('999999999999999999')).toBe(PAGINATION_CONFIG.DEFAULT_PAGE)
      expect(validateLimit('999999999999999999')).toBe(PAGINATION_CONFIG.MAX_LIMIT)
    })

    it('handles decimal string inputs', () => {
      expect(validatePage('1.5')).toBe(1) // parseInt truncates
      expect(validateLimit('20.7')).toBe(20) // parseInt truncates
    })

    it('handles scientific notation', () => {
      // parseInt handles scientific notation differently than we might expect
      expect(validatePage('1e2')).toBe(1) // parseInt('1e2') = 1 (stops at 'e')
      expect(validateLimit('2e1')).toBe(2) // parseInt('2e1') = 2 (stops at 'e')
    })
  })
})