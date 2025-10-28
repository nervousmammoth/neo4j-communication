import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConversationDetailError from '@/app/(main)/conversations/[id]/error'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}))

// Mock next/navigation
const mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams
}))

// Mock the AppSidebar component
vi.mock('@/components/app-sidebar', () => ({
  AppSidebar: () => <div data-testid="app-sidebar">Mocked AppSidebar</div>
}))

// Mock the sidebar components  
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children, ...props }: any) => (
    <div data-testid="sidebar-provider" {...props}>{children}</div>
  ),
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle Sidebar</button>,
  SidebarInset: ({ children, ...props }: any) => (
    <div data-testid="sidebar-inset" {...props}>{children}</div>
  ),
}))

describe('ConversationDetailError', () => {
  const mockReset = vi.fn()
  const mockError = new Error('Failed to load conversation') as Error & { digest?: string }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key))
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render error message', () => {
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    expect(screen.getByText('Error Loading Conversation')).toBeInTheDocument()
    expect(screen.getByText('Failed to load conversation')).toBeInTheDocument()
  })

  it('should render default error message when error.message is empty', () => {
    const errorWithoutMessage = new Error('') as Error & { digest?: string }
    render(<ConversationDetailError error={errorWithoutMessage} reset={mockReset} />)
    
    expect(screen.getByText('Failed to load the conversation details.')).toBeInTheDocument()
  })

  it('should render Try again button', () => {
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    const tryAgainButton = screen.getByText('Try again')
    expect(tryAgainButton).toBeInTheDocument()
    expect(tryAgainButton.tagName).toBe('BUTTON')
  })

  it('should call reset when Try again is clicked', async () => {
    const user = userEvent.setup()
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    await user.click(screen.getByText('Try again'))
    
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('should render Back to Conversations link with default page 1', () => {
    mockSearchParams.delete('from')
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    const backLink = screen.getByText('Back to Conversations')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/conversations?page=1')
  })

  it('should preserve page number in back link when from parameter is provided', () => {
    mockSearchParams.set('from', '7')
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    const backLink = screen.getByText('Back to Conversations')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/conversations?page=7')
  })

  it('should default to page 1 in back link when no from parameter', () => {
    mockSearchParams.delete('from')
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    const backLink = screen.getByText('Back to Conversations')
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/conversations?page=1')
  })

  it('should log error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Conversation detail error:', mockError)
  })

  it('should have correct styling classes', () => {
    const { container } = render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    const main = container.querySelector('main')
    expect(main).toHaveClass('flex', 'min-h-screen', 'flex-col', 'items-center', 'justify-center', 'p-4')
    
    const card = container.querySelector('[data-slot="card"]')
    expect(card).toHaveClass('w-full', 'max-w-md')
  })

  it('should render error title with red color', () => {
    render(<ConversationDetailError error={mockError} reset={mockReset} />)
    
    const title = screen.getByText('Error Loading Conversation')
    expect(title).toHaveClass('text-center', 'text-red-600')
  })
})