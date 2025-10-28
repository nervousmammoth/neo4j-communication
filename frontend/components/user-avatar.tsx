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
 * - Consistent fallback colors based on name hash
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
  
  // Memoize fallback colors based on name for consistency
  // Same user will always get the same color
  const fallbackColor = React.useMemo(() => {
    if (!user.name || !user.name.trim()) return 'bg-gray-500'
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500'
    ]
    
    // Use charCodeAt for consistent color selection based on name
    const nameHash = user.name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    
    const index = nameHash % colors.length
    return colors[index]
  }, [user.name])
  
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
      <AvatarFallback className={cn(fallbackColor, 'text-white font-medium')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar