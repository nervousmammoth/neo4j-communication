import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TalkListenRatio } from '@/components/charts/talk-listen-ratio'
import React from 'react'

describe('TalkListenRatio', () => {
  const mockUser1 = {
    userId: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    conversationCount: 10,
    messageCount: 100,
    lastActiveTimestamp: '2024-01-15T10:00:00Z'
  }

  const mockUser2 = {
    userId: 'user-456',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: null,
    conversationCount: 10,
    messageCount: 80,
    lastActiveTimestamp: '2024-01-15T09:00:00Z'
  }

  describe('Ratio Calculations', () => {
    it('should display correct percentages for equal messages', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={1000}
          user2Messages={1000}
        />
      )

      expect(screen.getByTestId('percentage-user-123')).toHaveTextContent('50.0%')
      expect(screen.getByTestId('percentage-user-456')).toHaveTextContent('50.0%')
      expect(screen.getByText('Balanced conversation')).toBeInTheDocument()
    })

    it('should display correct percentages when user1 dominates', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={1500}
          user2Messages={500}
        />
      )

      expect(screen.getByText('75.0%')).toBeInTheDocument()
      expect(screen.getByText('25.0%')).toBeInTheDocument()
      expect(screen.getByText('John Doe dominates the conversation')).toBeInTheDocument()
    })

    it('should display correct percentages when user2 dominates', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={300}
          user2Messages={700}
        />
      )

      expect(screen.getByText('30.0%')).toBeInTheDocument()
      expect(screen.getByText('70.0%')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith dominates the conversation')).toBeInTheDocument()
    })

    it('should handle zero messages gracefully', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={0}
          user2Messages={0}
        />
      )

      expect(screen.getByTestId('percentage-user-123')).toHaveTextContent('50.0%')
      expect(screen.getByTestId('percentage-user-456')).toHaveTextContent('50.0%')
      expect(screen.getByText('Balanced conversation')).toBeInTheDocument()
    })

    it('should handle one-sided conversations', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={1000}
          user2Messages={0}
        />
      )

      expect(screen.getByText('100.0%')).toBeInTheDocument()
      expect(screen.getByText('0.0%')).toBeInTheDocument()
      expect(screen.getByText('John Doe dominates the conversation')).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('should render progress bars', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={600}
          user2Messages={400}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(2)
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '60')
      expect(progressBars[1]).toHaveAttribute('aria-valuenow', '40')
    })

    it('should display user names', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={500}
          user2Messages={500}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should display message counts', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={1234}
          user2Messages={5678}
        />
      )

      expect(screen.getByText('1,234 messages')).toBeInTheDocument()
      expect(screen.getByText('5,678 messages')).toBeInTheDocument()
    })

    it('should display title', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={100}
          user2Messages={100}
        />
      )

      expect(screen.getByText('Talk-to-Listen Ratio')).toBeInTheDocument()
    })
  })

  describe('Large Numbers', () => {
    it('should format large numbers with commas', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={4000000}
          user2Messages={4500000}
        />
      )

      expect(screen.getByText('4,000,000 messages')).toBeInTheDocument()
      expect(screen.getByText('4,500,000 messages')).toBeInTheDocument()
    })

    it('should calculate percentages correctly for large numbers', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={3999999}
          user2Messages={4000001}
        />
      )

      expect(screen.getByTestId('percentage-user-123')).toHaveTextContent('50.0%')
      expect(screen.getByTestId('percentage-user-456')).toHaveTextContent('50.0%')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small percentages', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={1}
          user2Messages={999}
        />
      )

      expect(screen.getByText('0.1%')).toBeInTheDocument()
      expect(screen.getByText('99.9%')).toBeInTheDocument()
    })

    it('should round percentages to one decimal place', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={333}
          user2Messages={667}
        />
      )

      expect(screen.getByText('33.3%')).toBeInTheDocument()
      expect(screen.getByText('66.7%')).toBeInTheDocument()
    })

    it('should handle negative numbers as zero', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={-100}
          user2Messages={100}
        />
      )

      expect(screen.getByText('0.0%')).toBeInTheDocument()
      expect(screen.getByText('100.0%')).toBeInTheDocument()
      expect(screen.getByText('0 messages')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible progress bars', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={600}
          user2Messages={400}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars[0]).toHaveAttribute('aria-label', expect.stringContaining('John Doe'))
      expect(progressBars[1]).toHaveAttribute('aria-label', expect.stringContaining('Jane Smith'))
    })

    it('should have proper heading hierarchy', () => {
      render(
        <TalkListenRatio
          user1={mockUser1}
          user2={mockUser2}
          user1Messages={500}
          user2Messages={500}
        />
      )

      const heading = screen.getByRole('heading', { name: 'Talk-to-Listen Ratio' })
      expect(heading).toBeInTheDocument()
    })
  })
})