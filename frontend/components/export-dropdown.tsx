'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import { exportToCSV, downloadFile } from '@/lib/export-utils';
import type { UserCommunicationData } from '@/lib/neo4j';

interface ExportDropdownProps {
  data: UserCommunicationData;
  filename: string;
}

export function ExportDropdown({ data, filename }: ExportDropdownProps) {
  const handleExportCSV = () => {
    try {
      const csv = exportToCSV({
        conversations: data.sharedConversations,
        messages: data.messageTimeline,
        stats: data.communicationStats,
      });
      
      downloadFile(csv, `${filename}.csv`, 'text/csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  const handleExportJSON = () => {
    try {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, `${filename}.json`, 'application/json');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-haspopup="true">
          <Download className="h-4 w-4 mr-2" data-testid="download-icon" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}