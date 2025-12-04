import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/errors/route'
import { NextRequest } from 'next/server'

describe('/api/errors route', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  describe('successful error report submission', () => {
    it('should return 200 with received:true for valid error report using message field', async () => {
      const validReport = {
        message: 'Test error message',
        stack: 'Error: Test\n  at test.js:1:1',
        componentStack: '\n  at Component\n  at App',
        timestamp: '2025-01-15T10:00:00.000Z',
        url: 'http://localhost:3000/users',
      }

      const request = createRequest(validReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ received: true })
    })

    it('should return 200 with received:true for valid error report using error field', async () => {
      const validReport = {
        type: 'user-list-error',
        error: 'Test error message',
        stack: 'Error: Test\n  at test.js:1:1',
        componentStack: '\n  at Component\n  at App',
        timestamp: '2025-01-15T10:00:00.000Z',
        url: 'http://localhost:3000/users',
      }

      const request = createRequest(validReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ received: true })
    })

    it('should log error report with structured format', async () => {
      const validReport = {
        type: 'user-list-error',
        error: 'Test error message',
        stack: 'Error: Test\n  at test.js:1:1',
        componentStack: '\n  at Component\n  at App',
        timestamp: '2025-01-15T10:00:00.000Z',
        url: 'http://localhost:3000/users',
      }

      const request = createRequest(validReport)
      await POST(request)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Client Error Report]',
        expect.objectContaining({
          type: 'user-list-error',
          message: 'Test error message',
          stack: 'Error: Test\n  at test.js:1:1',
          componentStack: '\n  at Component\n  at App',
          timestamp: '2025-01-15T10:00:00.000Z',
          url: 'http://localhost:3000/users',
          receivedAt: expect.any(String),
        })
      )
    })

    it('should accept report with only required fields', async () => {
      const minimalReport = {
        message: 'Minimal error',
        timestamp: '2025-01-15T10:00:00.000Z',
        url: 'http://localhost:3000/',
      }

      const request = createRequest(minimalReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ received: true })
    })
  })

  describe('missing required fields validation', () => {
    it('should return 400 when message/error field is missing', async () => {
      const invalidReport = {
        timestamp: '2025-01-15T10:00:00.000Z',
        url: 'http://localhost:3000/',
      }

      const request = createRequest(invalidReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Missing required fields' })
    })

    it('should return 400 when timestamp is missing', async () => {
      const invalidReport = {
        message: 'Test error',
        url: 'http://localhost:3000/',
      }

      const request = createRequest(invalidReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Missing required fields' })
    })

    it('should return 400 when url is missing', async () => {
      const invalidReport = {
        message: 'Test error',
        timestamp: '2025-01-15T10:00:00.000Z',
      }

      const request = createRequest(invalidReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Missing required fields' })
    })

    it('should return 400 when message is empty string', async () => {
      const invalidReport = {
        message: '',
        timestamp: '2025-01-15T10:00:00.000Z',
        url: 'http://localhost:3000/',
      }

      const request = createRequest(invalidReport)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Missing required fields' })
    })
  })

  describe('malformed request handling', () => {
    it('should return 400 for empty request body', async () => {
      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Missing required fields' })
    })

    it('should return 400 for malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Failed to process error report' })
    })
  })
})
