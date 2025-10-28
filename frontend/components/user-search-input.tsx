'use client';

import { useState, useEffect, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { useDebounce } from '@/hooks/useDebounce';
import { searchUsers, getUserContacts } from '@/lib/api-client';
import { UserAvatar } from '@/components/user-avatar';
import type { User } from '@/lib/neo4j';

interface UserSearchInputProps {
  id?: string;
  onSelect: (user: User) => void;
  value: User | null;
  placeholder?: string;
  excludeUserId?: string;
  onError?: (error: string | null) => void;
  autoFocus?: boolean;
  mode?: 'all' | 'contacts';
  contactsOfUserId?: string;
}

export function UserSearchInput({
  id,
  onSelect,
  placeholder,
  excludeUserId,
  onError,
  autoFocus,
  mode = 'all',
  contactsOfUserId
}: UserSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoContacts, setHasNoContacts] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Dynamic placeholder based on mode
  const dynamicPlaceholder = placeholder || (
    mode === 'contacts' && contactsOfUserId
      ? 'Search users who communicated with the selected user...'
      : 'Search users by name, email, or username...'
  );
  
  const debouncedQuery = useDebounce(query, 300);
  
  // Show searching state immediately when query changes
  useEffect(() => {
    if (query && query !== debouncedQuery) {
      setIsSearching(true);
    }
  }, [query, debouncedQuery]);
  
  useEffect(() => {
    // For contacts mode, fetch all contacts even without a query
    if (mode === 'contacts' && contactsOfUserId && !debouncedQuery) {
      // We'll fetch all contacts without a search query
      const fetchAllContacts = async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        setIsLoading(true);
        setHasNoContacts(false);
        
        try {
          const response = await getUserContacts(contactsOfUserId, {
            query: '',
            signal: controller.signal,
            page: 1,
            limit: 1000
          });
          
          if (!controller.signal.aborted) {
            setResults(response.results);
            if (response.total === 0) {
              setHasNoContacts(true);
            }
          }
        } catch {
          if (!controller.signal.aborted) {
            setResults([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
            setIsSearching(false);
          }
        }
      };
      
      fetchAllContacts();
      
      return () => {
        abortControllerRef.current?.abort();
      };
    }
    
    // For 'all' mode or when there's no query, clear results
    if (!debouncedQuery) {
      setResults([]);
      setIsLoading(false);
      setIsSearching(false);
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const searchForUsers = async () => {
      setIsLoading(true);
      setIsSearching(false);
      setHasNoContacts(false);
      onError?.(null);
      
      try {
        let response;
        
        if (mode === 'contacts' && contactsOfUserId) {
          // Search within user contacts
          response = await getUserContacts(contactsOfUserId, {
            query: debouncedQuery,
            signal: controller.signal,
            page: 1,
            limit: 1000
          });
          
          // Check if user has no contacts at all
          if (!debouncedQuery && response.total === 0) {
            setHasNoContacts(true);
          }
        } else {
          // Search all users
          response = await searchUsers(debouncedQuery, {
            signal: controller.signal,
            excludeUserId
          });
        }
        
        if (!controller.signal.aborted) {
          setResults(response.results);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (error instanceof Error && error.name !== 'AbortError') {
            onError?.('Failed to search users. Please try again.');
          }
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    searchForUsers();
    
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, excludeUserId, onError, mode, contactsOfUserId]);

  const handleSelect = (user: User) => {
    onSelect(user);
    setQuery('');
    setResults([]);
    setIsSearching(false);
  };
  
  // Show dropdown when there's a query, results, or no contacts message
  const showDropdown = query.length > 0 || results.length > 0 || hasNoContacts;
  
  return (
    <div className="relative">
      <Command className="rounded-lg border" shouldFilter={false}>
        <CommandInput
          id={id}
          value={query}
          onValueChange={setQuery}
          placeholder={dynamicPlaceholder}
          autoFocus={autoFocus}
          className="h-9"
        />
        {showDropdown && (
          <CommandList>
            {(isSearching || isLoading) && results.length === 0 && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            {!isSearching && !isLoading && hasNoContacts && (
              <CommandEmpty>This user has not communicated with anyone yet</CommandEmpty>
            )}
            {!isSearching && !isLoading && !hasNoContacts && results.length === 0 && query && (
              <CommandEmpty>No users found</CommandEmpty>
            )}
            {results.map((user) => (
              <CommandItem
                key={user.userId}
                value={user.userId}
                onSelect={() => handleSelect(user)}
                className="cursor-pointer"
              >
                <UserAvatar 
                  user={{
                    name: user.name,
                    avatarUrl: user.avatarUrl
                  }} 
                  className="h-6 w-6 mr-2" 
                />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>
    </div>
  );
}