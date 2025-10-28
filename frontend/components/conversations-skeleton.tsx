import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ConversationsSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden sm:table-cell">Priority</TableHead>
            <TableHead className="text-right hidden md:table-cell">Participants</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-[250px]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-[60px] rounded-full" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-[50px]" />
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                <Skeleton className="h-4 w-[20px] ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-[40px] ml-auto" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-[100px]" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}