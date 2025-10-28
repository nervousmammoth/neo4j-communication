import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock date-fns functions for error testing
vi.mock('date-fns', () => ({
  format: vi.fn(),
  parseISO: vi.fn(),
  formatDistanceToNow: vi.fn(),
  isValid: vi.fn()
}))

describe('Date Formatting Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console to avoid noise in test output
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('parseISO error coverage', () => {
    it('handles parseISO throwing an error', async () => {
      const { parseISO, isValid } = await import('date-fns')
      const { formatDate } = await import('@/lib/date-formatting')

      // Mock parseISO to throw an error
      vi.mocked(parseISO).mockImplementationOnce(() => {
        throw new Error('parseISO error')
      })

      const result = formatDate('2024-01-01')
      expect(result).toBe('Not available')
    })
  })

  describe('format function error coverage', () => {
    it('handles format throwing error in formatDate', async () => {
      const { parseISO, isValid, format } = await import('date-fns')
      const { formatDate } = await import('@/lib/date-formatting')

      // Mock parseISO and isValid to return a valid date
      const mockDate = new Date('2024-01-01T10:30:00Z')
      vi.mocked(parseISO).mockReturnValue(mockDate)
      vi.mocked(isValid).mockReturnValue(true)
      
      // Mock format to throw an error
      vi.mocked(format).mockImplementationOnce(() => {
        throw new Error('format error')
      })

      const consoleSpy = vi.spyOn(console, 'error')
      const result = formatDate('2024-01-01T10:30:00Z', 'Custom fallback')
      
      expect(result).toBe('Custom fallback')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Date formatting error:',
        expect.any(Error),
        'Input:',
        '2024-01-01T10:30:00Z'
      )
    })

    it('handles format throwing error in formatLastSeen', async () => {
      const { parseISO, isValid, format } = await import('date-fns')
      const { formatLastSeen } = await import('@/lib/date-formatting')

      const mockDate = new Date('2024-01-01T10:30:00Z')
      vi.mocked(parseISO).mockReturnValue(mockDate)
      vi.mocked(isValid).mockReturnValue(true)
      vi.mocked(format).mockImplementationOnce(() => {
        throw new Error('format error')
      })

      const consoleSpy = vi.spyOn(console, 'error')
      const result = formatLastSeen('2024-01-01T10:30:00Z')
      
      expect(result).toBe('Unknown')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Last seen formatting error:',
        expect.any(Error),
        'Input:',
        '2024-01-01T10:30:00Z'
      )
    })

    it('handles format throwing error in formatCreatedAt', async () => {
      const { parseISO, isValid, format } = await import('date-fns')
      const { formatCreatedAt } = await import('@/lib/date-formatting')

      const mockDate = new Date('2024-01-01T10:30:00Z')
      vi.mocked(parseISO).mockReturnValue(mockDate)
      vi.mocked(isValid).mockReturnValue(true)
      vi.mocked(format).mockImplementationOnce(() => {
        throw new Error('format error')
      })

      const consoleSpy = vi.spyOn(console, 'error')
      const result = formatCreatedAt('2024-01-01T10:30:00Z')
      
      expect(result).toBe('Creation date unknown')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Created at formatting error:',
        expect.any(Error),
        'Input:',
        '2024-01-01T10:30:00Z'
      )
    })

    it('handles format throwing error in formatLastActivity', async () => {
      const { parseISO, isValid, format } = await import('date-fns')
      const { formatLastActivity } = await import('@/lib/date-formatting')

      const mockDate = new Date('2024-01-01T10:30:00Z')
      vi.mocked(parseISO).mockReturnValue(mockDate)
      vi.mocked(isValid).mockReturnValue(true)
      vi.mocked(format).mockImplementationOnce(() => {
        throw new Error('format error')
      })

      const consoleSpy = vi.spyOn(console, 'error')
      const result = formatLastActivity('2024-01-01T10:30:00Z')
      
      expect(result).toBe('No activity')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Last activity formatting error:',
        expect.any(Error),
        'Input:',
        '2024-01-01T10:30:00Z'
      )
    })

    it('handles format throwing error in formatFullTimestamp', async () => {
      const { parseISO, isValid, format } = await import('date-fns')
      const { formatFullTimestamp } = await import('@/lib/date-formatting')

      const mockDate = new Date('2024-01-01T10:30:00Z')
      vi.mocked(parseISO).mockReturnValue(mockDate)
      vi.mocked(isValid).mockReturnValue(true)
      vi.mocked(format).mockImplementationOnce(() => {
        throw new Error('format error')
      })

      const consoleSpy = vi.spyOn(console, 'error')
      const result = formatFullTimestamp('2024-01-01T10:30:00Z')
      
      expect(result).toBe('Invalid timestamp')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Full timestamp formatting error:',
        expect.any(Error),
        'Input:',
        '2024-01-01T10:30:00Z'
      )
    })
  })
})