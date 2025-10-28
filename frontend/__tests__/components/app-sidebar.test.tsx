import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AppSidebar } from '@/components/app-sidebar'

// Mock the sidebar components
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: any) => <div data-testid="sidebar" {...props}>{children}</div>,
  SidebarContent: ({ children, ...props }: any) => <div data-testid="sidebar-content" {...props}>{children}</div>,
  SidebarGroup: ({ children, ...props }: any) => <div data-testid="sidebar-group" {...props}>{children}</div>,
  SidebarGroupContent: ({ children, ...props }: any) => <div data-testid="sidebar-group-content" {...props}>{children}</div>,
  SidebarGroupLabel: ({ children, ...props }: any) => <div data-testid="sidebar-group-label" {...props}>{children}</div>,
  SidebarMenu: ({ children, ...props }: any) => <div data-testid="sidebar-menu" {...props}>{children}</div>,
  SidebarMenuItem: ({ children, ...props }: any) => <div data-testid="sidebar-menu-item" {...props}>{children}</div>,
  SidebarMenuButton: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <div data-testid="sidebar-menu-button" {...props}>{children}</div>
    }
    return <button data-testid="sidebar-menu-button" {...props}>{children}</button>
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

describe('AppSidebar', () => {
  it('renders without crashing', () => {
    render(<AppSidebar />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders the main navigation header', () => {
    render(<AppSidebar />)
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
  })

  it('renders the sidebar content area', () => {
    render(<AppSidebar />)
    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
  })

  it('renders navigation group with correct label', () => {
    render(<AppSidebar />)
    expect(screen.getByTestId('sidebar-group-label')).toHaveTextContent('Navigation')
  })

  it('renders conversations navigation link', () => {
    render(<AppSidebar />)
    const conversationsLink = screen.getByRole('link', { name: /conversations/i })
    expect(conversationsLink).toBeInTheDocument()
    expect(conversationsLink).toHaveAttribute('href', '/conversations')
  })

  it('renders users navigation link', () => {
    render(<AppSidebar />)
    const usersLink = screen.getByRole('link', { name: /users/i })
    expect(usersLink).toBeInTheDocument()
    expect(usersLink).toHaveAttribute('href', '/users')
  })

  it('renders conversation and user icons', () => {
    render(<AppSidebar />)
    const messageIcons = screen.getAllByTestId('message-circle-icon')
    expect(messageIcons).toHaveLength(2) // One in header, one in navigation
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
  })

  it('uses proper sidebar structure', () => {
    render(<AppSidebar />)
    
    // Verify hierarchy: Sidebar > SidebarHeader + SidebarContent > SidebarGroup
    const sidebar = screen.getByTestId('sidebar')
    const header = screen.getByTestId('sidebar-header')
    const content = screen.getByTestId('sidebar-content')
    const group = screen.getByTestId('sidebar-group')
    
    expect(sidebar).toContainElement(header)
    expect(sidebar).toContainElement(content)
    expect(content).toContainElement(group)
  })

  it('renders navigation menu items', () => {
    render(<AppSidebar />)
    const menuItems = screen.getAllByTestId('sidebar-menu-item')
    expect(menuItems).toHaveLength(3) // Conversations + Users + Communications Hub
  })
})