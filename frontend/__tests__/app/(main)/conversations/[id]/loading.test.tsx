import { render, screen } from '@testing-library/react'
import ConversationDetailLoading from '@/app/(main)/conversations/[id]/loading'
import { describe, it, expect } from 'vitest'

describe('ConversationDetailLoading', () => {
  it('should render loading skeleton', () => {
    render(<ConversationDetailLoading />)
    
    // Check for skeleton elements
    const skeletons = screen.getAllByTestId(/^skeleton-/)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should have correct layout structure', () => {
    const { container } = render(<ConversationDetailLoading />)
    
    const main = container.querySelector('main')
    expect(main).toHaveClass('flex', 'min-h-screen', 'flex-col', 'p-4', 'md:p-8')
  })

  it('should render multiple card sections', () => {
    const { container } = render(<ConversationDetailLoading />)
    
    // Should have cards for header, participants, and messages
    const cards = container.querySelectorAll('[data-slot="card"]')
    expect(cards).toHaveLength(3)
  })

  it('should render participant skeleton avatars', () => {
    const { container } = render(<ConversationDetailLoading />)
    
    const avatarSkeletons = container.querySelectorAll('.rounded-full.h-10.w-10')
    expect(avatarSkeletons).toHaveLength(3)
  })

  it('should render message skeletons', () => {
    const { container } = render(<ConversationDetailLoading />)
    
    const messageSkeletons = container.querySelectorAll('.flex.gap-3')
    // 5 message skeletons expected
    expect(messageSkeletons.length).toBeGreaterThanOrEqual(5)
  })
})