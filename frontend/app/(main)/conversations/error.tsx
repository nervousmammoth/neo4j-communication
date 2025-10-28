'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function ConversationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Conversations page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Conversations</h1>
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4 text-red-600">
          Something went wrong!
        </h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'An error occurred while loading conversations'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}