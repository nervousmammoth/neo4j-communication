'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Communication analysis error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-2xl font-semibold">Something went wrong!</h2>
          <p className="text-muted-foreground max-w-md">
            We encountered an error while loading the communication analysis. 
            This might be a temporary issue. Please try again.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}