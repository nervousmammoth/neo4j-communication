/**
 * Enhanced date formatting utilities
 * Provides consistent, robust date formatting across the application
 * 
 * Features:
 * - Better error handling with meaningful fallbacks
 * - Consistent date-fns integration for reliability
 * - Context-specific formatters for different use cases
 * - Null/undefined safety
 */

import { format, isValid, parseISO, formatDistanceToNow } from 'date-fns'

/**
 * Safely parses a date string or date object into a Date
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Valid Date object or null if invalid
 */
const safeParseDate = (dateInput: string | Date | null | undefined): Date | null => {
  if (!dateInput) return null
  
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * General-purpose date formatter with graceful fallbacks
 * Replaces the various formatDate functions across components
 * 
 * @param dateInput - Date string, Date object, or null/undefined
 * @param fallback - Custom fallback text (default: 'Not available')
 * @returns Formatted date string or fallback
 */
export const formatDate = (
  dateInput: string | Date | null | undefined, 
  fallback: string = 'Not available'
): string => {
  const date = safeParseDate(dateInput)
  
  if (!date) {
    if (dateInput) {
      console.warn('Invalid date provided to formatDate:', dateInput)
    }
    return fallback
  }
  
  try {
    return format(date, 'MMM dd, yyyy')
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', dateInput)
    return fallback
  }
}

/**
 * Formats the last seen/active timestamp for user displays
 * Shows relative time for recent activity, absolute date for older
 * 
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted last seen string
 */
export const formatLastSeen = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return 'Never'
  
  const date = safeParseDate(dateInput)
  if (!date) {
    console.warn('Invalid date provided to formatLastSeen:', dateInput)
    return 'Unknown'
  }
  
  try {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    
    // Just now (less than 1 hour)
    if (diffInHours < 1) return 'Just now'
    
    // Less than 24 hours - show hours
    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours}h ago`
    }
    
    // Less than 7 days - use formatDistanceToNow
    if (diffInHours < 24 * 7) {
      return formatDistanceToNow(date, { addSuffix: true })
    }
    
    // Older than a week - show date
    return format(date, 'MMM dd')
  } catch (error) {
    console.error('Last seen formatting error:', error, 'Input:', dateInput)
    return 'Unknown'
  }
}

/**
 * Formats a date for conversation creation time
 * Provides detailed timestamp for tooltips and detailed views
 * 
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted creation date string
 */
export const formatCreatedAt = (dateInput: string | Date | null | undefined): string => {
  const date = safeParseDate(dateInput)
  
  if (!date) {
    return 'Creation date unknown'
  }
  
  try {
    const now = new Date()
    const isThisYear = date.getFullYear() === now.getFullYear()
    
    if (isThisYear) {
      return format(date, 'MMM dd \'at\' h:mm a')
    } else {
      return format(date, 'MMM dd, yyyy \'at\' h:mm a')
    }
  } catch (error) {
    console.error('Created at formatting error:', error, 'Input:', dateInput)
    return 'Creation date unknown'
  }
}

/**
 * Formats a timestamp for message last activity
 * Used in conversation lists and similar contexts
 * 
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Formatted last activity string
 */
export const formatLastActivity = (dateInput: string | Date | null | undefined): string => {
  const date = safeParseDate(dateInput)
  
  if (!date) {
    return 'No activity'
  }
  
  try {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInHours / 24
    
    // Less than 1 hour
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60))
      return minutes < 1 ? 'Just now' : `${minutes}m ago`
    }
    
    // Less than 24 hours
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    }
    
    // Less than 7 days
    if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`
    }
    
    // Older - show formatted date
    const isThisYear = date.getFullYear() === now.getFullYear()
    return isThisYear ? format(date, 'MMM dd') : format(date, 'MMM dd, yyyy')
  } catch (error) {
    console.error('Last activity formatting error:', error, 'Input:', dateInput)
    return 'No activity'
  }
}

/**
 * Returns a full timestamp for tooltips and detailed displays
 * 
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns Full formatted timestamp or fallback
 */
export const formatFullTimestamp = (dateInput: string | Date | null | undefined): string => {
  const date = safeParseDate(dateInput)
  
  if (!date) {
    return 'Invalid timestamp'
  }
  
  try {
    return format(date, 'EEEE, MMMM dd, yyyy \'at\' h:mm:ss a zzz')
  } catch (error) {
    console.error('Full timestamp formatting error:', error, 'Input:', dateInput)
    return 'Invalid timestamp'
  }
}

/**
 * Checks if a timestamp represents recent activity (within the last hour)
 * 
 * @param dateInput - Date string, Date object, or null/undefined
 * @returns True if recent, false otherwise
 */
export const isRecent = (dateInput: string | Date | null | undefined): boolean => {
  const date = safeParseDate(dateInput)
  if (!date) return false
  
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  
  return diffInHours < 1
}

/**
 * Legacy compatibility - exports formatDate as default for easy migration
 */
export default formatDate