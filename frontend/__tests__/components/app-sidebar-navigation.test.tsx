import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AppSidebar } from '@/components/app-sidebar'

// Mock Next.js usePathname hook
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock the sidebar components
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: any) => <div data-testid="sidebar" {...props}>{children}</div>,
  SidebarContent: ({ children, ...props }: any) => <div data-testid="sidebar-content" {...props}>{children}</div>,
  SidebarGroup: ({ children, ...props }: any) => <div data-testid="sidebar-group" {...props}>{children}</div>,
  SidebarGroupContent: ({ children, ...props }: any) => <div data-testid="sidebar-group-content" {...props}>{children}</div>,
  SidebarGroupLabel: ({ children, ...props }: any) => <div data-testid="sidebar-group-label" {...props}>{children}</div>,
  SidebarMenu: ({ children, ...props }: any) => <div data-testid="sidebar-menu" {...props}>{children}</div>,
  SidebarMenuItem: ({ children, ...props }: any) => <div data-testid="sidebar-menu-item" {...props}>{children}</div>,
  SidebarMenuButton: ({ children, asChild, isActive, ...props }: any) => {
    if (asChild) {
      return <div data-testid="sidebar-menu-button" data-active={isActive} {...props}>{children}</div>
    }
    return <button data-testid="sidebar-menu-button" data-active={isActive} {...props}>{children}</button>
  },
  SidebarHeader: ({ children, ...props }: any) => <div data-testid="sidebar-header" {...props}>{children}</div>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  UserCheck: () => <div data-testid="user-check-icon" />,
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

describe('AppSidebar Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks conversations link as active when on conversations page', () => {
    mockUsePathname.mockReturnValue('/conversations')
    
    render(<AppSidebar />)
    
    const buttons = screen.getAllByTestId('sidebar-menu-button')
    const conversationsButton = buttons.find(button => 
      button.querySelector('a[href="/conversations"]')
    )
    
    expect(conversationsButton).toHaveAttribute('data-active', 'true')
    expect(conversationsButton?.querySelector('a[href="/conversations"]')).toBeInTheDocument()
  })

  it('marks conversations link as active when on specific conversation page', () => {
    mockUsePathname.mockReturnValue('/conversations/123')
    
    render(<AppSidebar />)
    
    const buttons = screen.getAllByTestId('sidebar-menu-button')
    const conversationsButton = buttons.find(button => 
      button.querySelector('a[href="/conversations"]')
    )
    
    expect(conversationsButton).toHaveAttribute('data-active', 'true')
  })

  it('marks users link as active when on users page', () => {
    mockUsePathname.mockReturnValue('/users')
    
    render(<AppSidebar />)
    
    const buttons = screen.getAllByTestId('sidebar-menu-button')
    const usersButton = buttons.find(button => 
      button.querySelector('a[href="/users"]')
    )
    
    expect(usersButton).toHaveAttribute('data-active', 'true')
  })

  it('marks no links as active when on root page', () => {
    mockUsePathname.mockReturnValue('/')
    
    render(<AppSidebar />)
    
    const buttons = screen.getAllByTestId('sidebar-menu-button')
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('data-active', 'false')
    })
  })

  it('marks no links as active when on unknown page', () => {
    mockUsePathname.mockReturnValue('/unknown-page')
    
    render(<AppSidebar />)
    
    const buttons = screen.getAllByTestId('sidebar-menu-button')
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('data-active', 'false')
    })
  })

  it('correctly handles active state for both navigation items', () => {
    mockUsePathname.mockReturnValue('/conversations')
    
    render(<AppSidebar />)
    
    const buttons = screen.getAllByTestId('sidebar-menu-button')
    const conversationsButton = buttons.find(button => 
      button.querySelector('a[href="/conversations"]')
    )
    const usersButton = buttons.find(button => 
      button.querySelector('a[href="/users"]')
    )
    
    expect(conversationsButton).toHaveAttribute('data-active', 'true')
    expect(usersButton).toHaveAttribute('data-active', 'false')
  })
})