import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatMessageTime,
  getFullTimestamp,
  isRecentMessage,
  groupMessagesByDate,
  formatDateSeparator,
  type MessageGroup
} from '@/lib/timestamp'

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T15:30:00Z')

describe('formatMessageTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Just now" for messages less than 1 minute old', () => {
    const timestamp = new Date('2024-01-15T15:29:30Z').toISOString()
    expect(formatMessageTime(timestamp)).toBe('Just now')
  })

  it('should return minutes ago for messages less than 1 hour old', () => {
    const timestamp = new Date('2024-01-15T15:15:00Z').toISOString() // 15 minutes ago
    expect(formatMessageTime(timestamp)).toBe('15m ago')
  })

  it('should return hours ago for messages less than 24 hours old', () => {
    const timestamp = new Date('2024-01-15T13:30:00Z').toISOString() // 2 hours ago
    expect(formatMessageTime(timestamp)).toBe('2h ago')
  })

  it('should return days ago for messages less than 7 days old', () => {
    const timestamp = new Date('2024-01-13T15:30:00Z').toISOString() // 2 days ago
    expect(formatMessageTime(timestamp)).toBe('2d ago')
  })

  it('should return month and day for older messages in same year', () => {
    const timestamp = new Date('2024-01-01T15:30:00Z').toISOString() // 14 days ago
    expect(formatMessageTime(timestamp)).toBe('Jan 1')
  })

  it('should return month, day and year for messages from different year', () => {
    const timestamp = new Date('2023-12-01T15:30:00Z').toISOString() // Different year
    expect(formatMessageTime(timestamp)).toBe('Dec 1, 2023')
  })

  it('should handle invalid timestamps', () => {
    expect(formatMessageTime('invalid-date')).toBe('Invalid date')
  })

  it('should handle edge case of exactly 1 minute', () => {
    const timestamp = new Date('2024-01-15T15:29:00Z').toISOString() // Exactly 1 minute ago
    expect(formatMessageTime(timestamp)).toBe('1m ago')
  })

  it('should handle edge case of exactly 1 hour', () => {
    const timestamp = new Date('2024-01-15T14:30:00Z').toISOString() // Exactly 1 hour ago
    expect(formatMessageTime(timestamp)).toBe('1h ago')
  })

  it('should handle edge case of exactly 1 day', () => {
    const timestamp = new Date('2024-01-14T15:30:00Z').toISOString() // Exactly 1 day ago
    expect(formatMessageTime(timestamp)).toBe('1d ago')
  })
})

describe('getFullTimestamp', () => {
  it('should return full formatted timestamp', () => {
    const timestamp = '2024-01-15T15:30:45Z'
    const result = getFullTimestamp(timestamp)
    
    // Check that the result contains expected components
    expect(result).toContain('2024')
    expect(result).toContain('January')
    expect(result).toContain('15')
    expect(result).toContain('30:45') // Time format may vary by locale, check for minutes:seconds
  })

  it('should handle invalid timestamps', () => {
    expect(getFullTimestamp('invalid-date')).toBe('Invalid date')
  })

  it('should include timezone information', () => {
    const timestamp = '2024-01-15T15:30:45Z'
    const result = getFullTimestamp(timestamp)
    
    // Should contain some timezone info (exact format varies by system)
    expect(result.length).toBeGreaterThan(20)
  })
})

describe('isRecentMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for messages within the last hour', () => {
    const timestamp = new Date('2024-01-15T15:00:00Z').toISOString() // 30 minutes ago
    expect(isRecentMessage(timestamp)).toBe(true)
  })

  it('should return false for messages older than 1 hour', () => {
    const timestamp = new Date('2024-01-15T14:00:00Z').toISOString() // 90 minutes ago
    expect(isRecentMessage(timestamp)).toBe(false)
  })

  it('should return true for messages exactly 59 minutes old', () => {
    const timestamp = new Date('2024-01-15T14:31:00Z').toISOString() // 59 minutes ago
    expect(isRecentMessage(timestamp)).toBe(true)
  })

  it('should return false for messages exactly 60 minutes old', () => {
    const timestamp = new Date('2024-01-15T14:30:00Z').toISOString() // 60 minutes ago
    expect(isRecentMessage(timestamp)).toBe(false)
  })
})

describe('groupMessagesByDate', () => {
  const mockMessages = [
    { messageId: '1', timestamp: '2024-01-15T10:00:00Z', content: 'Message 1' },
    { messageId: '2', timestamp: '2024-01-15T14:00:00Z', content: 'Message 2' },
    { messageId: '3', timestamp: '2024-01-14T16:00:00Z', content: 'Message 3' },
    { messageId: '4', timestamp: '2024-01-14T18:00:00Z', content: 'Message 4' },
    { messageId: '5', timestamp: '2024-01-13T12:00:00Z', content: 'Message 5' }
  ]

  it('should group messages by date', () => {
    const groups = groupMessagesByDate(mockMessages)
    
    expect(groups).toHaveLength(3) // 3 different dates
    
    // Check that each group has the correct number of messages
    const jan15Group = groups.find(g => g.date.includes('Jan 15'))
    const jan14Group = groups.find(g => g.date.includes('Jan 14'))
    const jan13Group = groups.find(g => g.date.includes('Jan 13'))
    
    expect(jan15Group?.messages).toHaveLength(2)
    expect(jan14Group?.messages).toHaveLength(2)
    expect(jan13Group?.messages).toHaveLength(1)
  })

  it('should sort messages within groups by timestamp (oldest first)', () => {
    const groups = groupMessagesByDate(mockMessages)
    const jan15Group = groups.find(g => g.date.includes('Jan 15'))
    
    expect(jan15Group?.messages[0].messageId).toBe('1') // 10:00 comes before 14:00
    expect(jan15Group?.messages[1].messageId).toBe('2')
  })

  it('should handle empty array', () => {
    const groups = groupMessagesByDate([])
    expect(groups).toEqual([])
  })

  it('should handle invalid timestamps', () => {
    const invalidMessages = [
      { messageId: '1', timestamp: 'invalid-date', content: 'Message 1' }
    ]
    
    const groups = groupMessagesByDate(invalidMessages)
    expect(groups).toHaveLength(1)
    expect(groups[0].date).toBe('invalid-date')
    expect(groups[0].displayDate).toBe('Invalid Date')
  })

  it('should handle single message', () => {
    const singleMessage = [mockMessages[0]]
    const groups = groupMessagesByDate(singleMessage)
    
    expect(groups).toHaveLength(1)
    expect(groups[0].messages).toHaveLength(1)
    expect(groups[0].messages[0].messageId).toBe('1')
  })

  it('should include displayDate for each group', () => {
    const groups = groupMessagesByDate(mockMessages)
    
    groups.forEach(group => {
      expect(group.displayDate).toBeDefined()
      expect(typeof group.displayDate).toBe('string')
      expect(group.displayDate.length).toBeGreaterThan(0)
    })
  })
})

describe('formatDateSeparator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate) // Monday, January 15, 2024
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "Today" for today\'s date', () => {
    const todayString = mockDate.toDateString() // "Mon Jan 15 2024"
    expect(formatDateSeparator(todayString)).toBe('Today')
  })

  it('should return "Yesterday" for yesterday\'s date', () => {
    const yesterday = new Date('2024-01-14T12:00:00Z')
    const yesterdayString = yesterday.toDateString()
    expect(formatDateSeparator(yesterdayString)).toBe('Yesterday')
  })

  it('should return formatted date for older dates in same year', () => {
    const olderDate = new Date('2024-01-10T12:00:00Z')
    const olderDateString = olderDate.toDateString()
    const result = formatDateSeparator(olderDateString)
    
    expect(result).toContain('Wednesday')
    expect(result).toContain('January')
    expect(result).toContain('10')
    expect(result).not.toContain('2024') // Same year, so no year
  })

  it('should return formatted date with year for different year', () => {
    const differentYear = new Date('2023-12-25T12:00:00Z')
    const differentYearString = differentYear.toDateString()
    const result = formatDateSeparator(differentYearString)
    
    expect(result).toContain('Monday')
    expect(result).toContain('December')
    expect(result).toContain('25')
    expect(result).toContain('2023')
  })

  it('should handle invalid date string', () => {
    expect(formatDateSeparator('invalid-date')).toBe('Invalid Date')
  })

  it('should handle NaN date from malformed string', () => {
    // This tests lines 156-158 in timestamp.ts
    // Some strings create Date objects but with NaN time value
    expect(formatDateSeparator('not-a-date')).toBe('Invalid Date')
    expect(formatDateSeparator('2024-13-45')).toBe('Invalid Date')  // Invalid month/day
    expect(formatDateSeparator('')).toBe('Invalid Date')  // Empty string
  })

  it('should handle future dates', () => {
    const futureDate = new Date('2024-01-20T12:00:00Z')
    const futureDateString = futureDate.toDateString()
    const result = formatDateSeparator(futureDateString)
    
    expect(result).toContain('Saturday')
    expect(result).toContain('January')
    expect(result).toContain('20')
  })
})

describe('integration tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should work together to format messages correctly', () => {
    const messages = [
      { messageId: '1', timestamp: '2024-01-15T15:25:00Z', content: 'Recent message' }, // 5 minutes ago
      { messageId: '2', timestamp: '2024-01-15T14:30:00Z', content: 'Hour old message' }, // 1 hour ago
      { messageId: '3', timestamp: '2024-01-14T15:30:00Z', content: 'Yesterday message' } // Yesterday
    ]

    const groups = groupMessagesByDate(messages)
    
    // Should have 2 groups (today and yesterday)
    expect(groups).toHaveLength(2)
    
    // Check today's group
    const todayGroup = groups.find(g => g.displayDate === 'Today')
    expect(todayGroup?.messages).toHaveLength(2)
    
    // Check formatting of recent vs older messages
    const recentTimestamp = formatMessageTime(messages[0].timestamp)
    const hourOldTimestamp = formatMessageTime(messages[1].timestamp)
    
    expect(recentTimestamp).toBe('5m ago')
    expect(hourOldTimestamp).toBe('1h ago')
    
    // Check yesterday's group
    const yesterdayGroup = groups.find(g => g.displayDate === 'Yesterday')
    expect(yesterdayGroup?.messages).toHaveLength(1)
  })
})