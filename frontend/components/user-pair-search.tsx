'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserSearchInput } from '@/components/user-search-input';
import { SelectedUserCard } from '@/components/selected-user-card';
import { ArrowLeftRight } from 'lucide-react';
import type { User } from '@/lib/neo4j';

export function UserPairSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user1, setUser1] = useState<User | null>(null);
  const [user2, setUser2] = useState<User | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Update URL query params when users change
  const updateQueryParams = useCallback((u1: User | null, u2: User | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (u1) {
      params.set('user1', u1.userId);
    } else {
      params.delete('user1');
    }
    if (u2) {
      params.set('user2', u2.userId);
    } else {
      params.delete('user2');
    }
    router.replace(`/users/communications?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  
  // Reset user2 when user1 changes
  const handleUser1Select = (user: User) => {
    setUser1(user);
    setUser2(null); // Reset second user when first user changes
    setSearchError(null);
    updateQueryParams(user, null);
  };
  
  const handleAnalyze = () => {
    if (!user1 || !user2) return;
    
    // Validate users are different
    if (user1.userId === user2.userId) {
      setSearchError('Please select two different users');
      return;
    }
    
    // Normalize URL (smaller ID first)
    const [id1, id2] = [user1.userId, user2.userId].sort();
    
    // Store in recent analyses
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const recent = JSON.parse(localStorage.getItem('recentAnalyses') || '[]');
        recent.unshift({
          user1,
          user2,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('recentAnalyses', JSON.stringify(recent.slice(0, 10)));
      }
    } catch (e) {
      console.error('Failed to save to recent analyses:', e);
    }
    
    setIsAnalyzing(true);
    router.push(`/users/communications/${id1}/${id2}`);
  };
  
  const handleSwap = useCallback(() => {
    const temp = user1;
    setUser1(user2);
    setUser2(temp);
    updateQueryParams(user2, temp);
  }, [user1, user2, updateQueryParams]);
  
  const handleClear = () => {
    setUser1(null);
    setUser2(null);
    setSearchError(null);
    updateQueryParams(null, null);
  };
  
  return (
    <div className="space-y-6">
      {searchError && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {searchError}
        </div>
      )}
      
      <div className="relative grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="user1-search" className="text-sm font-medium">First User</label>
          <UserSearchInput
            id="user1-search"
            placeholder="Search for the primary user..."
            onSelect={handleUser1Select}
            value={user1}
            excludeUserId={user2?.userId}
            onError={setSearchError}
            mode="all"
          />
          {user1 && (
            <SelectedUserCard 
              user={user1} 
              onRemove={() => {
                setUser1(null);
                setUser2(null); // Also reset user2 when user1 is removed
                updateQueryParams(null, null);
              }} 
            />
          )}
        </div>
        
        {/* Swap button positioned between the two inputs */}
        {user1 && user2 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwap}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex"
            aria-label="Swap users"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        )}
        
        <div className="space-y-2">
          <label htmlFor="user2-search" className="text-sm font-medium">
            {user1 ? `Users who communicated with ${user1.name}` : 'Second User'}
          </label>
          <UserSearchInput
            id="user2-search"
            placeholder={
              user1 
                ? `Search users who communicated with ${user1.name}...`
                : 'Select the first user to see available contacts'
            }
            onSelect={(user) => {
              setUser2(user);
              setSearchError(null);
              updateQueryParams(user1, user);
            }}
            value={user2}
            excludeUserId={user1?.userId}
            onError={setSearchError}
            mode={user1 ? 'contacts' : 'all'}
            contactsOfUserId={user1?.userId}
          />
          {user2 && (
            <SelectedUserCard 
              user={user2} 
              onRemove={() => {
                setUser2(null);
                updateQueryParams(user1, null);
              }} 
            />
          )}
        </div>
      </div>

      {/* Mobile swap button */}
      {user1 && user2 && (
        <Button
          variant="outline"
          onClick={handleSwap}
          className="w-full md:hidden"
          aria-label="Swap users"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Swap Users
        </Button>
      )}
      
      <div className="flex gap-3">
        <Button
          onClick={handleAnalyze}
          disabled={!user1 || !user2 || isAnalyzing}
          className="flex-1"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Communication'}
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={!user1 && !user2}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}