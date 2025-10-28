'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MessageSquareMore, MessageSquare, Users } from 'lucide-react';

/**
 * CommandPalette - Global keyboard-accessible command palette
 *
 * Provides quick access to key features via Cmd/Ctrl+K keyboard shortcut.
 * Enables efficient navigation without using the mouse.
 *
 * Features:
 * - Global Cmd/Ctrl+K keyboard shortcut
 * - Quick navigation to main sections
 * - Searchable command list
 * - Keyboard navigation within palette
 * - Auto-closes after selection
 * - Proper event listener cleanup
 *
 * @example
 * ```tsx
 * // Add to root layout
 * <CommandPalette />
 * ```
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  /**
   * Set up global keyboard shortcut listener
   * Listens for Cmd/Ctrl+K to toggle the command palette
   */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  /**
   * Handle navigation to a route
   * Closes the palette and navigates using Next.js router
   * Memoized to prevent unnecessary re-renders
   */
  const navigateTo = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => navigateTo('/users/communications')}
          >
            <MessageSquareMore className="mr-2 h-4 w-4" />
            Analyze User Communications
          </CommandItem>

          <CommandItem
            onSelect={() => navigateTo('/conversations')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Conversations
          </CommandItem>

          <CommandItem
            onSelect={() => navigateTo('/users')}
          >
            <Users className="mr-2 h-4 w-4" />
            Users
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
