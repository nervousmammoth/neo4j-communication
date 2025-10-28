"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserSummary } from "@/lib/neo4j";
import { formatLastSeen } from "@/lib/date-formatting";
import { UserAvatar } from "@/components/user-avatar";

interface UsersTableProps {
  users: UserSummary[];
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();



  const handleRowClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, userId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(userId);
    }
  };

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="text-right hidden md:table-cell">Conversations</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead className="hidden lg:table-cell">Last Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow 
              key={user.userId}
              className="hover:bg-muted/50 cursor-pointer focus:outline-none focus:bg-muted/50"
              onClick={() => handleRowClick(user.userId)}
              onKeyDown={(e) => handleRowKeyDown(e, user.userId)}
              tabIndex={0}
              role="button"
              aria-label={`View user: ${user.name}`}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    user={{ name: user.name, avatarUrl: user.avatar }} 
                    size="sm" 
                  />
                  <span>{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {user.email}
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {user.conversationCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {user.messageCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {formatLastSeen(user.lastActiveTimestamp)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}