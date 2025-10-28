import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Participant } from '@/lib/api-client'
import { UserAvatar } from '@/components/user-avatar'

interface ParticipantListProps {
  participants: Participant[]
}

export default function ParticipantList({ participants }: ParticipantListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants ({participants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-gray-500">No participants</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => (
              <div key={participant.userId} className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar 
                    user={{ name: participant.name, avatarUrl: participant.avatarUrl }} 
                    size="md" 
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                      participant.status
                    )}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {participant.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {participant.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}