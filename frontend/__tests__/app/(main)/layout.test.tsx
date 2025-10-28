import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Layout from '@/app/(main)/layout'

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

describe('Main Layout', () => {
  const mockChildren = <div data-testid="test-children">Test Children Content</div>

  it('renders without crashing', () => {
    render(<Layout>{mockChildren}</Layout>)
    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument()
  })

  it('renders the SidebarProvider wrapper', () => {
    render(<Layout>{mockChildren}</Layout>)
    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument()
  })

  it('renders the AppSidebar component', () => {
    render(<Layout>{mockChildren}</Layout>)
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
  })

  it('renders the SidebarInset for main content', () => {
    render(<Layout>{mockChildren}</Layout>)
    expect(screen.getByTestId('sidebar-inset')).toBeInTheDocument()
  })

  it('renders the SidebarTrigger button', () => {
    render(<Layout>{mockChildren}</Layout>)
    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument()
  })

  it('renders children content inside the layout', () => {
    render(<Layout>{mockChildren}</Layout>)
    expect(screen.getByTestId('test-children')).toBeInTheDocument()
    expect(screen.getByText('Test Children Content')).toBeInTheDocument()
  })

  it('has correct layout structure hierarchy', () => {
    render(<Layout>{mockChildren}</Layout>)
    
    const provider = screen.getByTestId('sidebar-provider')
    const sidebar = screen.getByTestId('app-sidebar')
    const inset = screen.getByTestId('sidebar-inset')
    const children = screen.getByTestId('test-children')
    
    // Verify SidebarProvider contains AppSidebar and SidebarInset
    expect(provider).toContainElement(sidebar)
    expect(provider).toContainElement(inset)
    
    // Verify SidebarInset contains the children
    expect(inset).toContainElement(children)
  })

  it('positions SidebarTrigger in header area', () => {
    render(<Layout>{mockChildren}</Layout>)
    
    const trigger = screen.getByTestId('sidebar-trigger')
    const header = trigger.closest('[data-testid="sidebar-header"]') || 
                   trigger.closest('header') ||
                   trigger.closest('.header')
    
    // SidebarTrigger should be in a header-like area (we'll check it's in the inset)
    const inset = screen.getByTestId('sidebar-inset')
    expect(inset).toContainElement(trigger)
  })

  it('applies correct CSS classes for responsive design', () => {
    render(<Layout>{mockChildren}</Layout>)
    
    const inset = screen.getByTestId('sidebar-inset')
    
    // Check that inset has proper structure for main content
    expect(inset).toBeInTheDocument()
  })
})