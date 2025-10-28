import { CommunicationSkeleton } from '@/components/communication-skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CommunicationSkeleton />
    </div>
  )
}