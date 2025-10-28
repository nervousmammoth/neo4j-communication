/**
 * Type-safe parameter validation utilities
 * 
 * Features:
 * - Branded types to ensure parameters are validated
 * - Type guards for runtime validation
 * - Safe default values for invalid inputs
 * - Clear error logging for debugging
 */

// Branded types for type safety
export type ValidatedPage = number & { readonly __brand: 'ValidatedPage' }
export type ValidatedLimit = number & { readonly __brand: 'ValidatedLimit' }

export interface ValidatedPaginationParams {
  page: ValidatedPage
  limit: ValidatedLimit
}

// Configuration constants
const PAGINATION_LIMITS = {
  MIN_PAGE: 1,
  MAX_PAGE: 10000, // Reasonable upper bound
  MIN_LIMIT: 1,
  MAX_LIMIT: 100, // Prevent overly large requests
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
} as const

// Type guards for runtime validation
export const isValidPage = (value: unknown): value is ValidatedPage => {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PAGINATION_LIMITS.MIN_PAGE &&
    value <= PAGINATION_LIMITS.MAX_PAGE
  )
}

export const isValidLimit = (value: unknown): value is ValidatedLimit => {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PAGINATION_LIMITS.MIN_LIMIT &&
    value <= PAGINATION_LIMITS.MAX_LIMIT
  )
}

// Validation functions with safe defaults
export const validatePage = (page: unknown, context?: string): ValidatedPage => {
  // Handle string inputs (common from URL params)
  const parsed = typeof page === 'string' ? parseInt(page, 10) : page
  
  if (isValidPage(parsed)) {
    return parsed
  }
  
  // Log validation failures for debugging
  if (page !== null && page !== undefined && page !== '') {
    const contextMsg = context ? ` (${context})` : ''
    console.warn(`Invalid page parameter${contextMsg}:`, page, '- using default:', PAGINATION_LIMITS.DEFAULT_PAGE)
  }
  
  return PAGINATION_LIMITS.DEFAULT_PAGE as ValidatedPage
}

export const validateLimit = (limit: unknown, context?: string): ValidatedLimit => {
  // Handle string inputs (common from URL params)
  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit
  
  // Check if it's a valid number
  if (typeof parsed === 'number' && Number.isInteger(parsed)) {
    // Cap at boundaries instead of rejecting completely
    if (parsed < PAGINATION_LIMITS.MIN_LIMIT) {
      if (limit !== null && limit !== undefined && limit !== '') {
        const contextMsg = context ? ` (${context})` : ''
        console.warn(`Invalid limit parameter${contextMsg}:`, limit, '- using default:', PAGINATION_LIMITS.DEFAULT_LIMIT)
      }
      return PAGINATION_LIMITS.DEFAULT_LIMIT as ValidatedLimit
    }
    
    if (parsed > PAGINATION_LIMITS.MAX_LIMIT) {
      const contextMsg = context ? ` (${context})` : ''
      console.warn(`Limit parameter${contextMsg} exceeds maximum:`, limit, '- capping at:', PAGINATION_LIMITS.MAX_LIMIT)
      return PAGINATION_LIMITS.MAX_LIMIT as ValidatedLimit
    }
    
    return parsed as ValidatedLimit
  }
  
  // Log validation failures for debugging
  if (limit !== null && limit !== undefined && limit !== '') {
    const contextMsg = context ? ` (${context})` : ''
    console.warn(`Invalid limit parameter${contextMsg}:`, limit, '- using default:', PAGINATION_LIMITS.DEFAULT_LIMIT)
  }
  
  return PAGINATION_LIMITS.DEFAULT_LIMIT as ValidatedLimit
}

/**
 * Validates pagination parameters from URL search params
 * @param searchParams - URLSearchParams or similar object
 * @param context - Optional context for logging
 * @returns Validated pagination parameters
 */
export const validatePaginationParams = (
  searchParams: { get(key: string): string | null },
  context?: string
): ValidatedPaginationParams => {
  const page = validatePage(searchParams.get('page'), context)
  const limit = validateLimit(searchParams.get('limit'), context)
  
  return { page, limit }
}

/**
 * Calculates offset from validated pagination parameters
 * @param params - Validated pagination parameters
 * @returns Zero-based offset for database queries
 */
export const calculateOffset = (params: ValidatedPaginationParams): number => {
  return (params.page - 1) * params.limit
}

/**
 * Creates URL search params from validated pagination parameters
 * @param params - Validated pagination parameters
 * @returns URLSearchParams object
 */
export const createPaginationSearchParams = (params: ValidatedPaginationParams): URLSearchParams => {
  const searchParams = new URLSearchParams()
  searchParams.set('page', params.page.toString())
  searchParams.set('limit', params.limit.toString())
  return searchParams
}

/**
 * Validates and sanitizes pagination parameters for API routes
 * Includes bounds checking and error handling
 * 
 * @param request - Request object with URL
 * @param context - Optional context for logging
 * @returns Validated pagination parameters and calculated offset
 */
export const validateApiPaginationParams = (
  request: Request,
  context?: string
): ValidatedPaginationParams & { offset: number } => {
  const { searchParams } = new URL(request.url)
  const params = validatePaginationParams(searchParams, context)
  const offset = calculateOffset(params)
  
  return { ...params, offset }
}

// Export constants for use in components
export const PAGINATION_CONFIG = PAGINATION_LIMITS