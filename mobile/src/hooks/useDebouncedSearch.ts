import { useState, useEffect, useCallback } from 'react';
import { searchUsersByEmail, searchUsersByDisplayName, searchUsers, SearchResult, SearchOptions } from '../services/user-search';
import { User } from '../types';
import { DocumentSnapshot } from 'firebase/firestore';

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
  searchBy?: 'email' | 'displayName' | 'both';
  pageSize?: number;
}

interface UseDebouncedSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: User[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  clearResults: () => void;
  loadMore: () => Promise<void>;
}

/**
 * Custom hook for debounced user search
 * Automatically searches as user types with configurable delay
 */
export const useDebouncedSearch = (
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn => {
  const {
    delay = 300, // 300ms delay by default
    minLength = 2, // Minimum 2 characters to search
    searchBy = 'email', // Search by email by default
    pageSize = 20, // 20 results per page
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string, isLoadMore = false) => {
    const trimmedQuery = searchQuery.trim();
    
    // Check if query has actually changed (unless it's a load more operation)
    if (!isLoadMore && trimmedQuery === lastSearchedQuery) {
      return; // Skip search if query hasn't changed
    }
    
    if (!trimmedQuery || trimmedQuery.length < minLength) {
      if (!isLoadMore) {
        setResults([]);
        setHasMore(false);
        setLastDoc(null);
        setIsLoading(false);
        setLastSearchedQuery('');
        setCurrentQuery('');
      }
      return;
    }

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setCurrentQuery(trimmedQuery);
      setLastSearchedQuery(trimmedQuery);
      // Reset pagination state for new query
      setLastDoc(null);
      setHasMore(false);
    }
    setError(null);

    try {
      const searchOptions: SearchOptions = {
        limit: pageSize,
        lastDoc: isLoadMore ? lastDoc : null,
      };

      let searchResults: SearchResult;

      // Use the new unified search function for better results
      if (searchBy === 'email') {
        searchResults = await searchUsersByEmail(searchQuery.trim(), searchOptions);
      } else if (searchBy === 'displayName') {
        searchResults = await searchUsersByDisplayName(searchQuery.trim(), searchOptions);
      } else if (searchBy === 'both') {
        // Use unified search for comprehensive results
        searchResults = await searchUsers(searchQuery.trim(), searchOptions);
      } else {
        throw new Error('Invalid searchBy option');
      }

      if (isLoadMore) {
        setResults(prev => [...prev, ...searchResults.users]);
      } else {
        setResults(searchResults.users);
      }
      
      setLastDoc(searchResults.lastDoc);
      setHasMore(searchResults.hasMore);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
      if (!isLoadMore) {
        setResults([]);
        setHasMore(false);
        setLastDoc(null);
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [minLength, searchBy, pageSize, lastDoc, lastSearchedQuery]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !currentQuery) return;
    await performSearch(currentQuery, true);
  }, [isLoadingMore, hasMore, currentQuery, performSearch]);

  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch, delay]);

  // Clear results function
  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    setHasMore(false);
    setLastDoc(null);
    setCurrentQuery('');
    setLastSearchedQuery('');
    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    clearResults,
    loadMore,
  };
};
