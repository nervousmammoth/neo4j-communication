import { describe, it, expect } from 'vitest'
import nextConfig from '../next.config'

describe('Next.js Configuration', () => {
  describe('Image Configuration', () => {
    it('should have proper image configuration structure', () => {
      expect(nextConfig.images).toMatchObject({
        domains: expect.arrayContaining(['api.dicebear.com'])
      })
    })

    it('should allow dicebear avatar URLs', () => {
      const testUrl = 'https://api.dicebear.com/7.x/notionists/svg?seed=test'
      const url = new URL(testUrl)
      
      expect(nextConfig.images?.domains).toContain(url.hostname)
    })

    it('should enable SVG support for Dicebear avatars', () => {
      expect(nextConfig.images?.dangerouslyAllowSVG).toBe(true)
      expect(nextConfig.images?.contentDispositionType).toBe('attachment')
    })
  })
})