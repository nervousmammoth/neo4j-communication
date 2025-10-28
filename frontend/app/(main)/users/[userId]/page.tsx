import { notFound } from 'next/navigation'
import { getUserDetail } from '@/lib/api-client'
import { UserProfileHeader } from '@/components/user-profile-header'
import { UserStatsDashboard } from '@/components/user-stats-dashboard'
import { UserConversationsList } from '@/components/user-conversations-list'
import { UserActivityTimeline } from '@/components/user-activity-timeline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{
    userId: string
  }>
  searchParams: Promise<{
    from?: string
  }>
}

export default async function UserDetailPage({ params, searchParams }: PageProps) {
  const { userId } = await params
  const { from } = await searchParams

  // Validate userId
  if (!userId) {
    notFound()
  }

  // Fetch user data
  const userDetail = await getUserDetail(userId)

  // Handle user not found
  if (!userDetail) {
    notFound()
  }

  const { user, stats, conversations, activityTimeline } = userDetail

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href={from ? `/users?page=${from}` : '/users'}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to users
        </Link>
      </div>

      {/* User Profile Header */}
      <UserProfileHeader user={user} className="mb-8" />

      {/* Statistics Dashboard */}
      <UserStatsDashboard stats={stats} className="mb-8" />

      {/* Tabbed Content */}
      <Tabs defaultValue="conversations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversations">
            Conversations ({stats.totalConversations})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Recent Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Conversations</h2>
            <UserConversationsList
              conversations={conversations}
              userId={userId}
              totalCount={stats.totalConversations}
            />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Activity Timeline</h2>
            <UserActivityTimeline
              activities={activityTimeline}
              userId={userId}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}