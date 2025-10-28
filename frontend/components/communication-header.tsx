'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { ArrowLeftRight } from 'lucide-react'
import type { UserSummary, CommunicationStats } from '@/lib/neo4j'

interface CommunicationHeaderProps {
  user1: UserSummary
  user2: UserSummary
  stats: CommunicationStats
  primaryUserId?: string
}

export function CommunicationHeader({ 
  user1, 
  user2, 
  stats, 
  primaryUserId 
}: CommunicationHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const handleSwitch = () => {
    // Toggle primary user via query param, not URL path
    const params = new URLSearchParams(searchParams)
    const currentPrimary = primaryUserId || user1.userId
    const newPrimary = currentPrimary === user1.userId ? user2.userId : user1.userId
    params.set('primary', newPrimary)
    router.push(`${pathname}?${params.toString()}`)
  }
  
  // Calculate percentages
  const user1Percentage = stats.totalMessages > 0 
    ? ((stats.user1Messages / stats.totalMessages) * 100).toFixed(1)
    : '0'
  const user2Percentage = stats.totalMessages > 0
    ? ((stats.user2Messages / stats.totalMessages) * 100).toFixed(1)
    : '0'
  
  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }
  
  return (
    <div className="space-y-6">
      {/* User Profiles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <UserProfile user={user1} />
          <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          <UserProfile user={user2} />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleSwitch}
          title="Switch user positions"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Switch
        </Button>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Shared Conversations"
          value={formatNumber(stats.totalSharedConversations)}
        />
        <StatCard
          label="Total Messages"
          value={formatNumber(stats.totalMessages)}
        />
        <StatCard
          label={`${user1.name} Messages`}
          value={formatNumber(stats.user1Messages)}
          percentage={`${user1Percentage}%`}
        />
        <StatCard
          label={`${user2.name} Messages`}
          value={formatNumber(stats.user2Messages)}
          percentage={`${user2Percentage}%`}
        />
      </div>
    </div>
  )
}

function UserProfile({ user }: { user: UserSummary }) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar user={user} size="lg" />
      <div className="space-y-1">
        <h3 className="font-medium">{user.name}</h3>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  percentage?: string
}

function StatCard({ label, value, percentage }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {percentage && (
            <span className="text-sm text-muted-foreground">
              {percentage}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}