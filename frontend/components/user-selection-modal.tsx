'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserSearchInput } from '@/components/user-search-input';
import { Button } from '@/components/ui/button';
import { SelectedUserCard } from '@/components/selected-user-card';
import type { User } from '@/lib/neo4j';

interface UserSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (user: User) => void;
  excludeUserId?: string;
  title?: string;
}

/**
 * UserSelectionModal - A modal dialog for selecting a user for communication analysis
 *
 * Features:
 * - Search functionality for finding users
 * - Displays selected user before confirmation
 * - Proper accessibility with ARIA attributes
 * - Keyboard navigation support (Escape to close)
 * - Focus management
 *
 * @example
 * ```tsx
 * <UserSelectionModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSelect={(user) => router.push(`/users/communications/${userId}/${user.userId}`)}
 *   excludeUserId="current-user-id"
 *   title="Select a user to analyze"
 * />
 * ```
 */
export function UserSelectionModal({
  open,
  onClose,
  onSelect,
  excludeUserId,
  title = 'Select a user'
}: UserSelectionModalProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  /**
   * Handle user selection from search input
   * Updates the selected user state to show preview
   * Memoized to prevent unnecessary re-renders
   */
  const handleUserSelect = useCallback((user: User) => {
    setSelectedUser(user);
  }, []);

  /**
   * Handle final analysis action
   * Calls onSelect callback with the selected user
   * Memoized to prevent unnecessary re-renders
   */
  const handleAnalyze = useCallback(() => {
    if (selectedUser) {
      onSelect(selectedUser);
    }
  }, [onSelect, selectedUser]);

  /**
   * Handle modal close
   * Resets selected user state and calls onClose callback
   * Memoized to prevent unnecessary re-renders
   */
  const handleClose = useCallback(() => {
    setSelectedUser(null);
    onClose();
  }, [onClose]);

  // Extract base user name from title for screen reader description
  // Fallback to 'the user' if title doesn't contain "'s"
  const baseUserName = title?.includes("'s") ? title.split("'s")[0] : 'the user';

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      aria-describedby="user-selection-description"
    >
      <DialogContent
        className="sm:max-w-md"
        aria-label="Select user for communication analysis"
        onEscapeKeyDown={handleClose}
        onPointerDownOutside={handleClose}
      >
        <DialogHeader>
          <DialogTitle id="user-selection-title">{title}</DialogTitle>
          <span id="user-selection-description" className="sr-only">
            Search and select a user to analyze communications with {baseUserName}
          </span>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <UserSearchInput
            placeholder="Search users by name, email, or username..."
            onSelect={handleUserSelect}
            value={selectedUser}
            excludeUserId={excludeUserId}
            autoFocus
          />

          {selectedUser && (
            <div className="p-3 rounded-lg border bg-accent/50">
              <SelectedUserCard
                user={selectedUser}
                onRemove={() => setSelectedUser(null)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!selectedUser}
          >
            Analyze Communications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
