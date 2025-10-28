import { MessageSquareMore } from 'lucide-react';

/**
 * CommunicationsEmptyState - Empty state component for the communications hub
 *
 * Displays when a user has no recent communication analyses.
 * Provides guidance on where to start an analysis from.
 *
 * Features:
 * - Clear visual hierarchy with icon and heading
 * - Informative description of the feature
 * - List of entry points for discoverability
 * - Keyboard shortcut hint (Cmd/Ctrl+K)
 * - Fully accessible with semantic HTML
 * - Responsive design
 *
 * @example
 * ```tsx
 * <CommunicationsEmptyState />
 * ```
 */
export function CommunicationsEmptyState() {
  return (
    <div className="text-center py-12 space-y-4">
      <MessageSquareMore className="h-12 w-12 mx-auto text-muted-foreground" />

      <h2 className="text-xl font-semibold">No Recent Analyses</h2>

      <p className="text-muted-foreground max-w-md mx-auto">
        Start analyzing user communications to understand interaction patterns
        and conversation dynamics.
      </p>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          You can start an analysis from:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Any user&apos;s profile page</li>
          <li>• Conversation participant lists</li>
          <li>
            • The command palette (
            <kbd className="px-1.5 py-0.5 text-xs border rounded">Cmd+K</kbd>
            )
          </li>
        </ul>
      </div>
    </div>
  );
}
