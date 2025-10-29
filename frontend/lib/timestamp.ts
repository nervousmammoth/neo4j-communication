/**
 * Timestamp utilities for message display
 * Provides relative time formatting and date grouping functionality
 */

export interface MessageGroup<T = { timestamp: string }> {
  date: string
  displayDate: string
  messages: T[]
}

// Time constants for readability
const MINUTES_IN_HOUR = 60
const MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR
const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY

/**
 * Formats a timestamp for message display
 * Shows relative time for recent messages, absolute time for older ones
 */
export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }
  
  // Just now (less than 1 minute)
  if (diffInMinutes < 1) {
    return 'Just now'
  }
  
  // Minutes ago (1-59 minutes)
  if (diffInMinutes < MINUTES_IN_HOUR) {
    return `${diffInMinutes}m ago`
  }
  
  // Hours ago (1-23 hours)
  if (diffInMinutes < MINUTES_IN_DAY) {
    const hours = Math.floor(diffInMinutes / MINUTES_IN_HOUR)
    return `${hours}h ago`
  }
  
  // Days ago (1-6 days)
  if (diffInMinutes < MINUTES_IN_WEEK) {
    const days = Math.floor(diffInMinutes / MINUTES_IN_DAY)
    return `${days}d ago`
  }
  
  // For older messages, show date
  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
}

/**
 * Returns a full timestamp string for tooltips
 */
export const getFullTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  })
}

/**
 * Formats a timestamp for chat bubble display
 * Returns format like "October 9, 2025 at 2:30 PM"
 */
export const formatChatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }

  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return `${dateStr} at ${timeStr}`
}

/**
 * Checks if a message is recent (within the last hour)
 */
export const isRecentMessage = (timestamp: string): boolean => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  return diffInMinutes < MINUTES_IN_HOUR
}

/**
 * Groups messages by date for display with date separators
 */
export const groupMessagesByDate = <T extends { timestamp: string }>(messages: T[]): MessageGroup<T>[] => {
  if (!messages || messages.length === 0) {
    return []
  }

  // Sort messages by timestamp (oldest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const groups: { [key: string]: T[] } = {}
  
  sortedMessages.forEach(message => {
    const date = new Date(message.timestamp)
    // Handle invalid dates by using a fallback
    const dateKey = isNaN(date.getTime()) ? 'invalid-date' : date.toDateString()
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(message)
  })
  
  // Convert to array and add display dates
  return Object.entries(groups).map(([dateKey, messages]) => ({
    date: dateKey,
    displayDate: formatDateSeparator(dateKey),
    messages
  }))
}

// Helper function to reset time components for date comparison
const resetTime = (date: Date): Date => {
  const newDate = new Date(date)
  newDate.setHours(0, 0, 0, 0)
  return newDate
}

/**
 * Formats a date for use as a separator
 * Shows "Today", "Yesterday", or formatted date
 */
export const formatDateSeparator = (dateString: string): string => {
  if (dateString === 'invalid-date') {
    return 'Invalid Date'
  }
  
  const date = new Date(dateString)
  
  // Handle invalid date strings
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const dateOnly = resetTime(date)
  const todayOnly = resetTime(today)
  const yesterdayOnly = resetTime(yesterday)
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday'
  } else {
    const isThisYear = date.getFullYear() === today.getFullYear()
    
    // Build options object dynamically based on whether year is needed
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }
    
    if (!isThisYear) {
      options.year = 'numeric'
    }
    
    return date.toLocaleDateString('en-US', options)
  }
}