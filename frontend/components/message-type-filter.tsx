'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageSquare, Image as ImageIcon, FileText, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageTypeFilterProps {
  counts?: {
    all: number;
    text: number;
    image: number;
    file: number;
  };
  isLoading?: boolean;
}

type FilterType = 'all' | 'text' | 'image' | 'file';

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Grid3X3 data-testid="filter-icon-all" className="h-4 w-4" aria-hidden="true" /> },
  { value: 'text', label: 'Text', icon: <MessageSquare data-testid="filter-icon-text" className="h-4 w-4" aria-hidden="true" /> },
  { value: 'image', label: 'Images', icon: <ImageIcon data-testid="filter-icon-image" className="h-4 w-4" aria-hidden="true" /> },
  { value: 'file', label: 'Files', icon: <FileText data-testid="filter-icon-file" className="h-4 w-4" aria-hidden="true" /> }
];

export function MessageTypeFilter({ counts, isLoading = false }: MessageTypeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('messageType') || 'all';
  
  const handleFilterChange = (filterType: FilterType) => {
    // Don't update if already selected
    if ((filterType === 'all' && !searchParams.get('messageType')) || 
        filterType === currentFilter) {
      return;
    }
    
    const params = new URLSearchParams(searchParams);
    
    if (filterType === 'all') {
      params.delete('messageType');
    } else {
      params.set('messageType', filterType);
    }
    
    router.push(`?${params.toString()}`);
  };
  
  const getCount = (type: FilterType): string | undefined => {
    if (!counts) return undefined;
    
    const count = type === 'all' ? counts.all :
                  type === 'text' ? counts.text :
                  type === 'image' ? counts.image :
                  counts.file;
    
    return count.toLocaleString();
  };
  
  return (
    <div data-testid="message-type-filter" className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map(option => {
        const isActive = option.value === 'all' 
          ? !searchParams.get('messageType')
          : option.value === currentFilter;
        const count = getCount(option.value);
        
        return (
          <Button
            key={option.value}
            variant={isActive ? 'default' : 'secondary'}
            size="sm"
            disabled={isLoading}
            onClick={() => handleFilterChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFilterChange(option.value);
              }
            }}
            className={cn(
              'flex items-center gap-2',
              isActive && 'bg-primary text-primary-foreground'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {count && (
              <span 
                data-testid={`count-${option.value}`}
                className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-background/20"
              >
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}