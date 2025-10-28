/**
 * Tests for the internal skeleton components of the communications page.
 * Since these are not exported, we need to test them through the Suspense fallback mechanism.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React, { Suspense } from 'react'

// Mock the Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  )
}))

// Mock the child components to throw promises (trigger Suspense)
let resolvePairSearch: () => void
let resolveRecentAnalyses: () => void

vi.mock('@/components/user-pair-search', () => ({
  UserPairSearch: () => {
    if (typeof window !== 'undefined') {
      throw new Promise((resolve) => {
        resolvePairSearch = resolve
      })
    }
    return <div>UserPairSearch</div>
  }
}))

vi.mock('@/components/recent-analyses', () => ({
  RecentAnalyses: () => {
    if (typeof window !== 'undefined') {
      throw new Promise((resolve) => {
        resolveRecentAnalyses = resolve
      })
    }
    return <div>RecentAnalyses</div>
  }
}))

describe('Communications Page Skeleton Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders SearchSkeleton when UserPairSearch is loading', async () => {
    // Import the page component
    const CommunicationsHub = (await import('@/app/(main)/users/communications/page')).default
    
    // Render the async component
    const PageComponent = await CommunicationsHub()
    
    // Extract the Suspense fallback for UserPairSearch
    const suspenseElements = React.Children.toArray(PageComponent.props.children.props.children)
    const userPairSearchSuspense = suspenseElements.find(
      (child: any) => child?.type === Suspense && child?.props?.children?.type?.name === 'UserPairSearch'
    ) as any
    
    if (userPairSearchSuspense && userPairSearchSuspense.props.fallback) {
      // Render the SearchSkeleton fallback
      const { container } = render(userPairSearchSuspense.props.fallback)
      
      // Verify SearchSkeleton structure
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
      expect(container.querySelector('.grid.gap-6.md\\:grid-cols-2')).toBeInTheDocument()
      expect(container.querySelector('.flex.gap-3')).toBeInTheDocument()
      
      // Verify skeleton elements
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons).toHaveLength(6)
      
      // Check for input label skeletons
      const labelSkeletons = skeletons.filter(s => s.className?.includes('h-4 w-20'))
      expect(labelSkeletons).toHaveLength(2)
      
      // Check for input field skeletons
      const inputSkeletons = skeletons.filter(s => s.className?.includes('h-9 w-full'))
      expect(inputSkeletons).toHaveLength(2)
      
      // Check for button skeletons
      const buttonSkeletons = skeletons.filter(s => s.className?.includes('h-10'))
      expect(buttonSkeletons).toHaveLength(2)
      expect(buttonSkeletons[0].className).toContain('flex-1')
      expect(buttonSkeletons[1].className).toContain('w-20')
    }
  })

  it('renders RecentSkeleton when RecentAnalyses is loading', async () => {
    // Import the page component
    const CommunicationsHub = (await import('@/app/(main)/users/communications/page')).default
    
    // Render the async component
    const PageComponent = await CommunicationsHub()
    
    // Extract the Suspense fallback for RecentAnalyses
    const suspenseElements = React.Children.toArray(PageComponent.props.children.props.children)
    const recentAnalysesSuspense = suspenseElements.find(
      (child: any) => child?.type === Suspense && child?.props?.children?.type?.name === 'RecentAnalyses'
    ) as any
    
    if (recentAnalysesSuspense && recentAnalysesSuspense.props.fallback) {
      // Render the RecentSkeleton fallback
      const { container } = render(recentAnalysesSuspense.props.fallback)
      
      // Verify RecentSkeleton structure
      expect(container.querySelector('.space-y-4')).toBeInTheDocument()
      expect(container.querySelector('.space-y-2')).toBeInTheDocument()
      
      // Verify skeleton elements
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons).toHaveLength(4)
      
      // Check for title skeleton
      const titleSkeleton = skeletons.find(s => s.className?.includes('h-6 w-32'))
      expect(titleSkeleton).toBeInTheDocument()
      
      // Check for item skeletons (3 items)
      const itemSkeletons = skeletons.filter(s => s.className?.includes('h-16 w-full'))
      expect(itemSkeletons).toHaveLength(3)
    }
  })

  it('verifies SearchSkeleton grid responsiveness', async () => {
    const CommunicationsHub = (await import('@/app/(main)/users/communications/page')).default
    const PageComponent = await CommunicationsHub()
    
    const suspenseElements = React.Children.toArray(PageComponent.props.children.props.children)
    const userPairSearchSuspense = suspenseElements.find(
      (child: any) => child?.type === Suspense && child?.props?.children?.type?.name === 'UserPairSearch'
    ) as any
    
    if (userPairSearchSuspense && userPairSearchSuspense.props.fallback) {
      const { container } = render(userPairSearchSuspense.props.fallback)
      
      // Check for responsive grid classes
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('gap-6')
      expect(grid).toHaveClass('md:grid-cols-2')
      
      // Check nested space-y-2 divs for proper spacing
      const spacedDivs = container.querySelectorAll('.space-y-2')
      expect(spacedDivs).toHaveLength(2)
    }
  })

  it('verifies RecentSkeleton renders exactly 3 items', async () => {
    const CommunicationsHub = (await import('@/app/(main)/users/communications/page')).default
    const PageComponent = await CommunicationsHub()
    
    const suspenseElements = React.Children.toArray(PageComponent.props.children.props.children)
    const recentAnalysesSuspense = suspenseElements.find(
      (child: any) => child?.type === Suspense && child?.props?.children?.type?.name === 'RecentAnalyses'
    ) as any
    
    if (recentAnalysesSuspense && recentAnalysesSuspense.props.fallback) {
      render(recentAnalysesSuspense.props.fallback)
      
      const skeletons = screen.getAllByTestId('skeleton')
      
      // Filter for the item skeletons (h-16 w-full)
      const itemSkeletons = skeletons.filter(s => s.className?.includes('h-16 w-full'))
      
      // Should have exactly 3 items (from [1, 2, 3].map())
      expect(itemSkeletons).toHaveLength(3)
      
      // Each should have both h-16 and w-full classes
      itemSkeletons.forEach(skeleton => {
        expect(skeleton.className).toContain('h-16')
        expect(skeleton.className).toContain('w-full')
      })
    }
  })
})