import { describe, it, expect, vi } from 'vitest'
import Home from '@/app/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}))

import { redirect } from 'next/navigation'

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /conversations', () => {
    Home()
    
    expect(redirect).toHaveBeenCalledWith('/conversations')
    expect(redirect).toHaveBeenCalledTimes(1)
  })
})