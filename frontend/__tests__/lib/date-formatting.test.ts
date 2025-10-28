import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatLastSeen,
  formatCreatedAt,
  formatLastActivity,
  formatFullTimestamp,
  isRecent
} from '@/lib/date-formatting'

describe('Enhanced Date Formatting', () => {
  beforeEach(() => {
    // Mock console.warn and console.error for clean test output
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('formatDate', () => {
    it('formats valid date strings correctly', () => {
      const result = formatDate('2024-01-15T10:30:00Z')
      expect(result).toBe('Jan 15, 2024')
    })

    it('formats Date objects correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date)
      expect(result).toBe('Jan 15, 2024')
    })

    it('handles null input gracefully', () => {
      const result = formatDate(null)
      expect(result).toBe('Not available')
    })

    it('handles undefined input gracefully', () => {
      const result = formatDate(undefined)
      expect(result).toBe('Not available')
    })

    it('handles invalid date strings with warning', () => {
      const result = formatDate('invalid-date')
      expect(result).toBe('Not available')
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid date provided to formatDate:',
        'invalid-date'
      )
    })

    it('uses custom fallback text', () => {
      const result = formatDate(null, 'Custom fallback')
      expect(result).toBe('Custom fallback')
    })

    it('handles formatting errors gracefully', () => {
      // Create a date that might cause formatting issues
      const invalidDate = new Date('not-a-date')
      const result = formatDate(invalidDate)
      expect(result).toBe('Not available')
    })
  })

  describe('formatLastSeen', () => {
    beforeEach(() => {
      // Mock Date.now() to have consistent test results
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows "Just now" for very recent activity', () => {
      const thirtyMinutesAgo = new Date('2024-01-15T11:30:00Z')
      const result = formatLastSeen(thirtyMinutesAgo)
      expect(result).toBe('Just now')
    })

    it('shows hours ago for recent activity', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00Z')
      const result = formatLastSeen(twoHoursAgo)
      expect(result).toBe('2h ago')
    })

    it('shows relative time for activity within a week', () => {
      const threeDaysAgo = new Date('2024-01-12T12:00:00Z')
      const result = formatLastSeen(threeDaysAgo)
      expect(result).toContain('ago') // date-fns formatDistanceToNow result
    })

    it('shows formatted date for older activity', () => {
      const twoWeeksAgo = new Date('2024-01-01T12:00:00Z')
      const result = formatLastSeen(twoWeeksAgo)
      expect(result).toBe('Jan 01')
    })

    it('handles null input', () => {
      const result = formatLastSeen(null)
      expect(result).toBe('Never')
    })

    it('handles undefined input', () => {
      const result = formatLastSeen(undefined)
      expect(result).toBe('Never')
    })

    it('handles invalid date with warning', () => {
      const result = formatLastSeen('invalid-date')
      expect(result).toBe('Unknown')
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid date provided to formatLastSeen:',
        'invalid-date'
      )
    })

    it('handles formatting errors gracefully', () => {
      // Force an error in the formatting logic
      const result = formatLastSeen(new Date('not-a-date'))
      expect(result).toBe('Unknown')
    })
  })

  describe('formatCreatedAt', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('formats date in current year without year', () => {
      const date = '2024-01-10T15:30:00Z'
      const result = formatCreatedAt(date)
      expect(result).toMatch(/Jan 10 at \d{1,2}:\d{2} [AP]M/)
    })

    it('formats date in different year with year', () => {
      const date = '2023-12-25T09:15:00Z'
      const result = formatCreatedAt(date)
      expect(result).toMatch(/Dec 25, 2023 at \d{1,2}:\d{2} [AP]M/)
    })

    it('handles null input', () => {
      const result = formatCreatedAt(null)
      expect(result).toBe('Creation date unknown')
    })

    it('handles invalid date', () => {
      const result = formatCreatedAt('invalid')
      expect(result).toBe('Creation date unknown')
    })
  })

  describe('formatLastActivity', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows "Just now" for very recent activity', () => {
      const recent = new Date('2024-01-15T11:59:30Z') // 30 seconds ago
      const result = formatLastActivity(recent)
      expect(result).toBe('Just now')
    })

    it('shows minutes ago for recent activity', () => {
      const recent = new Date('2024-01-15T11:45:00Z')
      const result = formatLastActivity(recent)
      expect(result).toBe('15m ago')
    })

    it('shows hours ago for same day activity', () => {
      const recent = new Date('2024-01-15T08:00:00Z')
      const result = formatLastActivity(recent)
      expect(result).toBe('4h ago')
    })

    it('shows days ago for recent days', () => {
      const recent = new Date('2024-01-13T12:00:00Z')
      const result = formatLastActivity(recent)
      expect(result).toBe('2d ago')
    })

    it('shows formatted date for older activity in same year', () => {
      const older = new Date('2024-01-01T12:00:00Z')
      const result = formatLastActivity(older)
      expect(result).toBe('Jan 01')
    })

    it('shows formatted date with year for different year', () => {
      const older = new Date('2023-12-01T12:00:00Z')
      const result = formatLastActivity(older)
      expect(result).toBe('Dec 01, 2023')
    })

    it('handles null input', () => {
      const result = formatLastActivity(null)
      expect(result).toBe('No activity')
    })

    it('handles invalid date', () => {
      const result = formatLastActivity('invalid')
      expect(result).toBe('No activity')
    })
  })

  describe('formatFullTimestamp', () => {
    it('formats complete timestamp information', () => {
      const date = '2024-01-15T15:30:45Z'
      const result = formatFullTimestamp(date)
      // This will vary by timezone, but should contain key elements
      expect(result).toContain('Monday')
      expect(result).toContain('January')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('handles null input', () => {
      const result = formatFullTimestamp(null)
      expect(result).toBe('Invalid timestamp')
    })

    it('handles invalid date', () => {
      const result = formatFullTimestamp('invalid')
      expect(result).toBe('Invalid timestamp')
    })
  })

  describe('isRecent', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true for timestamps within the last hour', () => {
      const recent = new Date('2024-01-15T11:30:00Z')
      expect(isRecent(recent)).toBe(true)
    })

    it('returns false for timestamps older than an hour', () => {
      const old = new Date('2024-01-15T10:30:00Z')
      expect(isRecent(old)).toBe(false)
    })

    it('returns false for null input', () => {
      expect(isRecent(null)).toBe(false)
    })

    it('returns false for invalid date', () => {
      expect(isRecent('invalid')).toBe(false)
    })
  })

  describe('Error handling and edge cases', () => {
    it('handles empty string input', () => {
      expect(formatDate('')).toBe('Not available')
      expect(formatLastSeen('')).toBe('Never')
      expect(formatCreatedAt('')).toBe('Creation date unknown')
    })

    it('handles very large timestamp numbers', () => {
      const farFuture = new Date(8640000000000000) // Max safe date
      const result = formatDate(farFuture)
      // Should handle gracefully without throwing
      expect(typeof result).toBe('string')
    })

    it('handles very small timestamp numbers', () => {
      const farPast = new Date(-8640000000000000) // Min safe date
      const result = formatDate(farPast)
      // Should handle gracefully without throwing
      expect(typeof result).toBe('string')
    })

    it('does not log warnings for null/undefined/empty inputs', () => {
      formatDate(null)
      formatDate(undefined)
      formatDate('')
      formatLastSeen(null)
      formatLastSeen(undefined)
      formatLastSeen('')
      
      // Should not have called console.warn for these expected cases
      expect(console.warn).not.toHaveBeenCalled()
    })
  })

})