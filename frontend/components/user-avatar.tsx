// Client component needed for onError event handler in AvatarImage
'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: {
    name: string
    avatarUrl?: string | null
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Optimized UserAvatar component with memoization
 *
 * Features:
 * - Memoized initials generation to prevent recalculation
 * - Memoized size classes for performance
 * - Monochrome fallback design (bg-gray-200, text-gray-700)
 * - Supports multiple sizes
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  className 
}) => {
  // Memoize initials generation to prevent recalculation on every render
  const initials = React.useMemo(() => {
    if (!user.name || !user.name.trim()) return '?'
    
    const parts = user.name.trim().split(' ').filter(Boolean)
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [user.name])
  
  // Memoize size classes for performance
  const sizeClasses = React.useMemo(() => {
    switch (size) {
      case 'sm': return 'h-8 w-8 text-xs'
      case 'lg': return 'h-16 w-16 text-lg'
      default: return 'h-10 w-10 text-sm'
    }
  }, [size])
  
  return (
    <Avatar className={cn(sizeClasses, className)}>
      {user.avatarUrl && (
        <AvatarImage
          src={user.avatarUrl}
          alt={`${user.name} avatar`}
          onError={(e) => {
            // Hide broken images gracefully
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <AvatarFallback className={cn('bg-gray-200 text-gray-700', 'font-medium')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar