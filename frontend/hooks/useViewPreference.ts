'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CONVERSATIONS_VIEW_STORAGE_KEY, DEFAULT_VIEW_TYPE } from '@/lib/constants'

export type ViewType = 'list' | 'card'

/**
 * Hook for managing user's view preference between list and card views.
 * 
 * Features:
 * - Persists preference to localStorage
 * - Syncs with URL query parameters (?view=list)
 * - SSR-safe hydration handling
 * - Defaults to card view for new users
 * 
 * @returns Object with current view and setter function
 */
export function useViewPreference() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [view, setViewState] = useState<ViewType>(DEFAULT_VIEW_TYPE)
  const [isClient, setIsClient] = useState(false)

  // Set client flag after hydration to prevent SSR mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize view from URL or localStorage (SSR-safe)
  useEffect(() => {
    if (!isClient) return // Wait for client-side hydration
    
    const urlView = searchParams.get('view')
    
    if (urlView && isValidView(urlView)) {
      setViewState(urlView as ViewType)
    } else if (!urlView) {
      // Only check localStorage if there's no URL parameter at all
      try {
        const storedView = localStorage.getItem(CONVERSATIONS_VIEW_STORAGE_KEY)
        if (storedView && isValidView(storedView)) {
          setViewState(storedView as ViewType)
        } else {
          setViewState(DEFAULT_VIEW_TYPE)
        }
      } catch (error) {
        // localStorage might not be available (SSR, incognito mode, etc.)
        console.warn('Failed to read from localStorage:', error)
        setViewState(DEFAULT_VIEW_TYPE)
      }
    } else {
      // Invalid URL parameter, fall back to default
      setViewState(DEFAULT_VIEW_TYPE)
    }
  }, [searchParams, isClient])

  const setView = (newView: ViewType) => {
    // Normalize and validate the input
    const normalizedView = normalizeView(newView)
    if (!normalizedView || normalizedView === view) {
      return // No change needed
    }

    // Update state
    setViewState(normalizedView)

    // Save to localStorage
    try {
      localStorage.setItem(CONVERSATIONS_VIEW_STORAGE_KEY, normalizedView)
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }

    // Update URL
    updateUrl(normalizedView)
  }

  const updateUrl = (newView: ViewType) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newView === DEFAULT_VIEW_TYPE) {
      // Remove view parameter for default view to keep URLs clean
      params.delete('view')
    } else {
      params.set('view', newView)
    }

    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    
    router.push(newUrl)
  }

  return {
    view,
    setView,
  }
}

function isValidView(value: string): boolean {
  return value === 'list' || value === 'card'
}

function normalizeView(value: any): ViewType | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim().toLowerCase()
  
  if (trimmed === 'list' || trimmed === 'card') {
    return trimmed as ViewType
  }

  return null
}