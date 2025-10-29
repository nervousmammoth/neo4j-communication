import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getCommunicationData } from '@/lib/api-client'
import { CommunicationHeader } from '@/components/communication-header'
import { SharedConversations } from '@/components/shared-conversations'
import { MessageTimeline } from '@/components/message-timeline'
import { CommunicationSkeleton } from '@/components/communication-skeleton'
import { CommunicationAnalytics } from '@/components/communication-analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PageProps {
  params: Promise<{ userId1: string; userId2: string }>
  searchParams: Promise<{
    page?: string
    limit?: string
    conversation?: string
    primary?: string
    search?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function CommunicationAnalysisPage({
  params,
  searchParams
}: PageProps) {
  const { userId1, userId2 } = await params
  const resolvedSearchParams = await searchParams
  const {
    page = '1',
    limit = '50',
    conversation,
    primary,
    search
  } = resolvedSearchParams
  
  // Normalize IDs for consistent caching
  const [normalizedId1, normalizedId2] = [userId1, userId2].sort()
  
  // Redirect if not normalized
  if (userId1 !== normalizedId1 || userId2 !== normalizedId2) {
    redirect(`/users/communications/${normalizedId1}/${normalizedId2}`)
  }
  
  try {
    // Parse and validate pagination params
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
    
    const data = await getCommunicationData(
      normalizedId1,
      normalizedId2,
      { 
        page: pageNum, 
        limit: limitNum,
        conversationId: conversation || undefined
      }
    )
    
    if (!data || !data.user1 || !data.user2) {
      return notFound()
    }
    
    // Determine primary user for display
    // Use actual user IDs from data, not normalized IDs
    const primaryUserId = primary || data.user1.userId
    const displayUser1 = primaryUserId === data.user1.userId ? data.user1 : data.user2
    const displayUser2 = primaryUserId === data.user1.userId ? data.user2 : data.user1
    
    return (
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<CommunicationSkeleton />}>
          <CommunicationHeader
            user1={displayUser1}
            user2={displayUser2}
            stats={data.communicationStats}
            primaryUserId={primaryUserId}
          />
          
          <Tabs defaultValue="messages" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <SharedConversations
                    conversations={data.sharedConversations}
                    selectedId={conversation}
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <MessageTimeline
                    messages={data.messageTimeline}
                    pagination={data.pagination}
                    user1={displayUser1}
                    user2={displayUser2}
                    searchQuery={search}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="analytics">
              <CommunicationAnalytics
                data={data}
                user1={displayUser1}
                user2={displayUser2}
              />
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error('Error loading communication analysis:', error)
    throw error // Let error boundary handle it
  }
}