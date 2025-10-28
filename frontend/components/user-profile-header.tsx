import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatLastSeen } from '@/lib/date-formatting'
import { MessageCircle, Users, MapPin, Building, Mail, AtSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface UserProfileHeaderProps {
  user: {
    userId: string
    name: string
    email: string
    username?: string
    avatarUrl?: string
    bio?: string
    status: string
    lastSeen?: string
    department?: string
    location?: string
    role?: string
  }
  className?: string
}

export function UserProfileHeader({ user, className }: UserProfileHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'text-green-600 bg-green-100'
      case 'busy':
        return 'text-yellow-600 bg-yellow-100'
      case 'away':
        return 'text-orange-600 bg-orange-100'
      case 'offline':
      default:
        return 'text-gray-500 bg-gray-100'
    }
  }

  return (
    <div className={cn('bg-card rounded-lg border p-6', className)}>
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Avatar */}
        <UserAvatar
          user={{ name: user.name, avatarUrl: user.avatarUrl }}
          size="lg"
        />

        {/* User Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            {user.username && (
              <p className="text-muted-foreground">@{user.username}</p>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{user.email}</span>
            </div>
            {user.role && (
              <div className="flex items-center gap-1">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                <span>{user.role}</span>
              </div>
            )}
          </div>

          {/* Department & Location */}
          {(user.department || user.location) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {user.department && (
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{user.department}</span>
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {user.bio}
            </p>
          )}

          {/* Status & Last Seen */}
          <div className="flex flex-wrap items-center gap-4">
            <Badge className={cn('capitalize', getStatusColor(user.status))}>
              {user.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatLastSeen(user.lastSeen)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="default" disabled>
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/users/${user.userId}/conversations`}>
                <Users className="h-4 w-4 mr-2" />
                View Conversations
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}