import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ConversationDetail } from '@/lib/api-client'
import { formatCreatedAt } from '@/lib/date-formatting'

interface ConversationHeaderProps {
  conversation: ConversationDetail
}

export default function ConversationHeader({ conversation }: ConversationHeaderProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'normal':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {conversation.title || 'Direct Message'}
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            {conversation.type}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(conversation.priority)}`}>
            {conversation.priority}
          </span>
          {conversation.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
              {tag}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          Created: {formatCreatedAt(conversation.createdAt)}
        </p>
      </CardContent>
    </Card>
  )
}