'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';

interface SelectedUser {
  userId: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
}

interface SelectedUserCardProps {
  user: SelectedUser;
  onRemove: () => void;
}

export function SelectedUserCard({ user, onRemove }: SelectedUserCardProps) {
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRemove();
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <UserAvatar 
        user={{
          name: user.name,
          avatarUrl: user.avatarUrl
        }} 
        className="h-10 w-10" 
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{user.name}</div>
        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        onKeyDown={handleKeyDown}
        className="h-8 w-8 hover:bg-accent"
        aria-label="Remove user"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}