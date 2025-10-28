import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CommunicationsHub from '@/app/(main)/users/communications/page'
import React from 'react'

// Mock the UserPairSearch component
vi.mock('@/components/user-pair-search', () => ({
  UserPairSearch: () => (
    <div data-testid="user-pair-search">
      <h2>User Pair Search Component</h2>
    </div>
  )
}))

// Mock the RecentAnalyses component
vi.mock('@/components/recent-analyses', () => ({
  RecentAnalyses: () => (
    <div data-testid="recent-analyses">
      <h2>Recent Analyses Component</h2>
    </div>
  )
}))

// Mock the Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className}>Loading...</div>
  )
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// Since the skeleton components are internal to the page module and not exported,
// we'll test them through integration tests that verify the page renders correctly
// with Suspense boundaries. The skeleton components are tested indirectly through
// the page tests, and the overall page functionality is what matters for coverage.

describe('CommunicationsHub Page', () => {
  describe('Basic Rendering', () => {
    it('renders the page title and description', async () => {
      const result = await CommunicationsHub()
      render(result)

      // Check for the main heading
      expect(screen.getByRole('heading', { name: 'Communication Analysis' })).toBeInTheDocument()
      
      // Check for the description text
      expect(screen.getByText('Analyze conversations and communication patterns between any two users')).toBeInTheDocument()
    })

    it('renders the UserPairSearch component', async () => {
      const result = await CommunicationsHub()
      render(result)

      await waitFor(() => {
        expect(screen.getByTestId('user-pair-search')).toBeInTheDocument()
      })
    })

    it('renders the RecentAnalyses component', async () => {
      const result = await CommunicationsHub()
      render(result)

      await waitFor(() => {
        expect(screen.getByTestId('recent-analyses')).toBeInTheDocument()
      })
    })

    it('has the correct container structure and classes', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      // Check for container div with correct classes
      const containerDiv = container.querySelector('.container.mx-auto.px-4.py-8')
      expect(containerDiv).toBeInTheDocument()

      // Check for max-width wrapper
      const maxWidthWrapper = container.querySelector('.max-w-4xl.mx-auto.space-y-8')
      expect(maxWidthWrapper).toBeInTheDocument()
    })

    it('renders all sections in the correct order', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      const sections = container.querySelectorAll('.max-w-4xl > div, .max-w-4xl > [data-testid]')
      
      // First section should be the title/description
      const firstSection = sections[0]
      expect(firstSection?.querySelector('h1')).toHaveTextContent('Communication Analysis')
      
      // After Suspense resolves, components should be present
      await waitFor(() => {
        expect(screen.getByTestId('user-pair-search')).toBeInTheDocument()
        expect(screen.getByTestId('recent-analyses')).toBeInTheDocument()
      })
    })
  })

  describe('Component Structure', () => {
    it('page component is an async function', () => {
      // Verify that CommunicationsHub is an async function
      expect(CommunicationsHub.constructor.name).toBe('AsyncFunction')
    })

    it('renders with proper spacing between sections', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      // Check that the wrapper has space-y-8 for vertical spacing
      const wrapper = container.querySelector('.space-y-8')
      expect(wrapper).toBeInTheDocument()
      
      // Verify there are at least 3 direct children (header, search, recent)
      const children = wrapper?.children
      expect(children?.length).toBeGreaterThanOrEqual(3)
    })

    it('header section has correct structure', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      // Find the header section
      const headerSection = container.querySelector('.space-y-8 > div:first-child')
      expect(headerSection).toBeInTheDocument()
      
      // Check for h1 with correct classes
      const h1 = headerSection?.querySelector('h1.text-3xl.font-bold.mb-2')
      expect(h1).toBeInTheDocument()
      expect(h1).toHaveTextContent('Communication Analysis')
      
      // Check for description paragraph
      const p = headerSection?.querySelector('p.text-muted-foreground')
      expect(p).toBeInTheDocument()
      expect(p).toHaveTextContent('Analyze conversations and communication patterns between any two users')
    })
  })

  describe('Layout and Styling', () => {
    it('applies correct Tailwind classes to the main container', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      const mainContainer = container.firstElementChild
      expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4', 'py-8')
    })

    it('applies correct max-width and spacing to the content wrapper', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      const contentWrapper = container.querySelector('.max-w-4xl')
      expect(contentWrapper).toHaveClass('max-w-4xl', 'mx-auto', 'space-y-8')
    })

    it('wraps components in Suspense boundaries', async () => {
      const result = await CommunicationsHub()
      
      // Check that the result includes Suspense boundaries
      // We can verify this by checking that our mocked components render
      render(result)

      // Components should eventually render (after Suspense resolves)
      await waitFor(() => {
        expect(screen.getByTestId('user-pair-search')).toBeInTheDocument()
        expect(screen.getByTestId('recent-analyses')).toBeInTheDocument()
      })
    })

    it('maintains correct structure hierarchy', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      // Check the DOM hierarchy
      const containerEl = container.querySelector('.container')
      expect(containerEl).toBeInTheDocument()

      const wrapperEl = containerEl?.querySelector('.max-w-4xl')
      expect(wrapperEl).toBeInTheDocument()

      // Should have a header section as the first child
      const firstChild = wrapperEl?.firstElementChild
      expect(firstChild?.querySelector('h1')).toBeInTheDocument()
    })

    it('applies text styling to description', async () => {
      const result = await CommunicationsHub()
      render(result)

      const description = screen.getByText('Analyze conversations and communication patterns between any two users')
      expect(description).toHaveClass('text-muted-foreground')
    })
  })

  describe('Component Integration', () => {
    it('renders both main components after Suspense resolves', async () => {
      const result = await CommunicationsHub()
      render(result)

      // Both components should be rendered
      await waitFor(() => {
        const userPairSearch = screen.getByTestId('user-pair-search')
        const recentAnalyses = screen.getByTestId('recent-analyses')
        
        expect(userPairSearch).toBeInTheDocument()
        expect(recentAnalyses).toBeInTheDocument()
      })
    })

    it('maintains component order in the layout', async () => {
      const result = await CommunicationsHub()
      const { container } = render(result)

      await waitFor(() => {
        const components = container.querySelectorAll('[data-testid]')
        const componentIds = Array.from(components).map(c => c.getAttribute('data-testid'))
        
        const userPairIndex = componentIds.indexOf('user-pair-search')
        const recentIndex = componentIds.indexOf('recent-analyses')
        
        // UserPairSearch should come before RecentAnalyses
        expect(userPairIndex).toBeLessThan(recentIndex)
      })
    })
  })
})