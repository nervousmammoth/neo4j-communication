import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserNotFound from '@/app/(main)/users/[userId]/not-found'

describe('UserNotFound', () => {
  it('renders not found message and back link', () => {
    render(<UserNotFound />)
    
    // Check for the main heading
    expect(screen.getByRole('heading', { name: /User not found/i })).toBeInTheDocument()
    
    // Check for the description text - need to handle the apostrophe correctly
    expect(screen.getByText(/The user you.+re looking for doesn.+t exist or may have been removed/i)).toBeInTheDocument()
    
    // Check for the back link
    const backLink = screen.getByRole('link', { name: /Back to users/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/users')
  })

  it('renders the UserX icon', () => {
    const { container } = render(<UserNotFound />)
    
    // Check for the icon by its class (lucide icons have specific classes)
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('has proper styling classes applied', () => {
    const { container } = render(<UserNotFound />)
    
    // Check that the container has correct structure
    const mainContainer = container.querySelector('.container.mx-auto.px-4.py-8')
    expect(mainContainer).toBeInTheDocument()
    
    // Check for centering styles - adjust selector based on actual classes
    const centeredContent = container.querySelector('.flex.flex-col.items-center.justify-center')
    expect(centeredContent).toBeInTheDocument()
    
    // Check for the icon wrapper
    const iconWrapper = container.querySelector('.rounded-full.bg-muted.p-3')
    expect(iconWrapper).toBeInTheDocument()
  })
})