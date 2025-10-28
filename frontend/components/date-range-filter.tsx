'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useRouter, useSearchParams } from 'next/navigation';

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  
  // Applied date range (what's actually filtering the data)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(undefined);
  
  // Temporary date range (what the user is selecting in the popover)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  
  // Initialize from URL on mount
  useEffect(() => {
    const from = searchParams.get('dateFrom');
    const to = searchParams.get('dateTo');
    
    if (from || to) {
      const range: DateRange = {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined
      };
      setAppliedDateRange(range);
      setTempDateRange(range);
    }
  }, [searchParams]);
  
  const applyFilter = () => {
    if (!tempDateRange?.from) return;
    
    // Update the applied range
    setAppliedDateRange(tempDateRange);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    
    if (tempDateRange.from) {
      // Use date-only format (YYYY-MM-DD) to avoid timezone issues
      const year = tempDateRange.from.getFullYear();
      const month = String(tempDateRange.from.getMonth() + 1).padStart(2, '0');
      const day = String(tempDateRange.from.getDate()).padStart(2, '0');
      params.set('dateFrom', `${year}-${month}-${day}`);
    } else {
      params.delete('dateFrom');
    }
    
    if (tempDateRange.to) {
      // Use date-only format (YYYY-MM-DD) to avoid timezone issues
      const year = tempDateRange.to.getFullYear();
      const month = String(tempDateRange.to.getMonth() + 1).padStart(2, '0');
      const day = String(tempDateRange.to.getDate()).padStart(2, '0');
      params.set('dateTo', `${year}-${month}-${day}`);
    } else {
      params.delete('dateTo');
    }
    
    router.push(`?${params.toString()}`);
    setOpen(false);
  };
  
  const cancelSelection = () => {
    // Reset temp range to applied range
    setTempDateRange(appliedDateRange);
    setOpen(false);
  };
  
  const clearFilter = () => {
    setAppliedDateRange(undefined);
    setTempDateRange(undefined);
    const params = new URLSearchParams(searchParams);
    params.delete('dateFrom');
    params.delete('dateTo');
    router.push(`?${params.toString()}`);
    setOpen(false);
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // When opening, sync temp with applied
      setTempDateRange(appliedDateRange);
    }
    setOpen(newOpen);
  };

  const getDisplayText = () => {
    if (!appliedDateRange?.from && !appliedDateRange?.to) {
      return 'Pick a date range';
    }
    if (appliedDateRange.from && !appliedDateRange.to) {
      return format(appliedDateRange.from, 'MMM d, y');
    }
    if (appliedDateRange.from && appliedDateRange.to) {
      return `${format(appliedDateRange.from, 'MMM d, y')} - ${format(appliedDateRange.to, 'MMM d, y')}`;
    }
    return 'Pick a date range';
  };

  // Set date limits (e.g., only allow dates from 2020 to current year + 1)
  const currentYear = new Date().getFullYear();
  const fromDate = new Date(2020, 0, 1);
  const toDate = new Date(currentYear + 1, 11, 31);
  
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="justify-start min-w-[260px]"
            aria-label="Pick a date range"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={tempDateRange}
            onSelect={setTempDateRange}
            numberOfMonths={2}
            fromDate={fromDate}
            toDate={toDate}
            disabled={(date) => date < fromDate || date > toDate}
          />
          <div className="p-3 border-t flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilter}
              disabled={!appliedDateRange?.from}
            >
              Clear All
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelSelection}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyFilter}
                disabled={!tempDateRange?.from}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {appliedDateRange?.from && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFilter}
          aria-label="Clear date filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}