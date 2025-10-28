import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserX } from 'lucide-react'

export default function UserNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="rounded-full bg-muted p-3">
            <UserX className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">User not found</h1>
            <p className="text-muted-foreground max-w-md">
              The user you&apos;re looking for doesn&apos;t exist or may have been removed.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/users">
            Back to users
          </Link>
        </Button>
      </div>
    </div>
  )
}