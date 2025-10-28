'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function UserDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('User detail error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Something went wrong!</h1>
            <p className="text-muted-foreground max-w-md">
              We encountered an error while loading the user details. This might be a temporary issue.
            </p>
            {error.message && (
              <p className="text-sm text-destructive mt-2">
                Error: {error.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => reset()}
            variant="default"
          >
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link href="/users">
              Back to users
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}