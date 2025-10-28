'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ViewToggle } from '@/components/view-toggle'
import { UsersTable } from '@/components/users-table'
import { useViewPreference } from '@/hooks/useViewPreference'
import { MessageCircle, Users, Clock, Mail } from 'lucide-react'
import Link from 'next/link'
import type { UserSummary } from '@/lib/neo4j'
import { formatLastSeen } from '@/lib/date-formatting'
import { UserAvatar } from '@/components/user-avatar'

interface UsersViewProps {
  users: UserSummary[]
  currentPage: number
}

export function UsersView({ users, currentPage }: UsersViewProps) {
  const { view, setView } = useViewPreference()



  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Users display based on selected view */}
      {view === 'list' ? (
        <UsersTable users={users} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Link
              key={user.userId}
              href={`/users/${user.userId}?from=${currentPage}`}
              className="block transition-transform hover:scale-[1.02]"
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      user={{ name: user.name, avatarUrl: user.avatar }} 
                      size="lg" 
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold line-clamp-1">
                        {user.name}
                      </h2>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>{user.conversationCount} conversations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{user.messageCount} messages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatLastSeen(user.lastActiveTimestamp)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}