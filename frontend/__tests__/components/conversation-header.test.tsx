import { render, screen } from '@testing-library/react'
import ConversationHeader from '@/components/conversation-header'
import { describe, it, expect } from 'vitest'
import type { ConversationDetail } from '@/lib/api-client'

describe('ConversationHeader', () => {
  const mockConversation: ConversationDetail = {
    conversationId: 'conv-001',
    title: 'Project Discussion',
    type: 'group',
    priority: 'high',
    createdAt: '2024-01-15T10:00:00Z',
    tags: ['project', 'urgent'],
    participants: []
  }

  it('should render conversation title', () => {
    render(<ConversationHeader conversation={mockConversation} />)
    expect(screen.getByText('Project Discussion')).toBeInTheDocument()
  })

  it('should render "Direct Message" when title is null', () => {
    const conversationWithoutTitle = { ...mockConversation, title: null }
    render(<ConversationHeader conversation={conversationWithoutTitle} />)
    expect(screen.getByText('Direct Message')).toBeInTheDocument()
  })

  it('should render conversation type badge', () => {
    render(<ConversationHeader conversation={mockConversation} />)
    expect(screen.getByText('group')).toBeInTheDocument()
  })

  it('should render priority badge with correct styling', () => {
    render(<ConversationHeader conversation={mockConversation} />)
    const priorityBadge = screen.getByText('high')
    expect(priorityBadge).toBeInTheDocument()
    expect(priorityBadge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('should render normal priority with correct styling', () => {
    const normalPriorityConv = { ...mockConversation, priority: 'normal' }
    render(<ConversationHeader conversation={normalPriorityConv} />)
    const priorityBadge = screen.getByText('normal')
    expect(priorityBadge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('should render low priority with correct styling', () => {
    const lowPriorityConv = { ...mockConversation, priority: 'low' }
    render(<ConversationHeader conversation={lowPriorityConv} />)
    const priorityBadge = screen.getByText('low')
    expect(priorityBadge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('should render unknown priority with default styling', () => {
    const unknownPriorityConv = { ...mockConversation, priority: 'unknown' as any }
    render(<ConversationHeader conversation={unknownPriorityConv} />)
    const priorityBadge = screen.getByText('unknown')
    expect(priorityBadge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('should render tags', () => {
    render(<ConversationHeader conversation={mockConversation} />)
    expect(screen.getByText('project')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  it('should handle empty tags array', () => {
    const conversationWithoutTags = { ...mockConversation, tags: [] }
    const { container } = render(<ConversationHeader conversation={conversationWithoutTags} />)
    const tagElements = container.querySelectorAll('.bg-gray-200')
    // Should only have type and priority badges, no tag badges
    expect(tagElements.length).toBe(0)
  })

  it('should format createdAt date', () => {
    render(<ConversationHeader conversation={mockConversation} />)
    // The exact format will depend on the locale, so we'll check for presence
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
    expect(screen.getByText(/Jan.*15.*2024/)).toBeInTheDocument()
  })

  it('should apply correct layout and styling', () => {
    const { container } = render(<ConversationHeader conversation={mockConversation} />)
    const card = container.firstElementChild
    expect(card).toBeInTheDocument()
    // Check that Card component is rendered
    expect(card?.tagName).toBe('DIV')
  })
})