import { firestore } from '../../firebase.config';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { User } from '../types';

/**
 * Enhanced search logic that mimics comprehensive contact search
 * Searches across multiple fields with various combinations
 */
const searchUsersComprehensive = (
  users: User[],
  searchTerm: string
): User[] => {
  const term = searchTerm.toLowerCase().trim();
  
  if (!term) return users;
  
  return users.filter(user => {
    const email = user.email.toLowerCase();
    const displayName = user.displayName.toLowerCase();
    
    // Split display name into parts for more flexible matching
    const nameParts = displayName.split(/\s+/).filter(part => part.length > 0);
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';
    const fullName = displayName;
    
    // Create various name combinations for flexible matching
    const nameCombinations = [
      firstName,
      lastName,
      fullName,
      ...nameParts, // All individual name parts
      ...nameParts.map((part, index) => 
        nameParts.slice(0, index + 1).join(' ')
      ), // Progressive name combinations
    ];
    
    // Remove duplicates and empty strings
    const uniqueCombinations = Array.from(new Set(nameCombinations)).filter(combo => combo.length > 0);
    
    // Check if search term matches any combination
    const matchesName = uniqueCombinations.some(combo => 
      combo.includes(term) || term.includes(combo)
    );
    
    // Check email match
    const matchesEmail = email.includes(term) || term.includes(email);
    
    return matchesName || matchesEmail;
  });
};

// Pagination interfaces
export interface SearchResult {
  users: User[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface SearchOptions {
  limit?: number;
  lastDoc?: DocumentSnapshot | null;
}

/**
 * Search for users by email address with enhanced comprehensive search
 * Uses exact match first, then falls back to comprehensive search
 */
export const searchUsersByEmail = async (
  email: string, 
  options: SearchOptions = {}
): Promise<SearchResult> => {
  const { limit: pageSize = 20, lastDoc } = options;
  
  try {
    const usersRef = collection(firestore, 'users');
    
    // Search for exact match first (no orderBy to avoid index requirement)
    let exactQuery = query(
      usersRef,
      where('email', '==', email),
      limit(pageSize)
    );
    
    if (lastDoc) {
      exactQuery = query(
        usersRef,
        where('email', '==', email),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }
    
    const exactSnapshot = await getDocs(exactQuery);
    
    if (!exactSnapshot.empty) {
      const users = exactSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
        } as User;
      });
      
      // Sort by display name for consistent ordering
      users.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      return {
        users,
        lastDoc: exactSnapshot.docs[exactSnapshot.docs.length - 1] || null,
        hasMore: exactSnapshot.docs.length === pageSize,
      };
    }
    
    // If no exact match, use comprehensive search
    // Fetch users and apply enhanced search logic
    let comprehensiveQuery = query(
      usersRef,
      limit(100) // Fetch more users to ensure we find matches
    );
    
    const snapshot = await getDocs(comprehensiveQuery);
    const allUsers: User[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      } as User;
    });
    
    // Apply comprehensive search logic
    const matchingUsers = searchUsersComprehensive(allUsers, email);
    
    // Sort by display name for consistent ordering
    matchingUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Limit results and determine if there are more
    const limitedUsers = matchingUsers.slice(0, pageSize);
    const hasMore = matchingUsers.length > pageSize;
    
    return {
      users: limitedUsers,
      lastDoc: null, // No pagination for comprehensive search to avoid cursor issues
      hasMore,
    };
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Search for users by display name with enhanced comprehensive search
 */
export const searchUsersByDisplayName = async (
  name: string, 
  options: SearchOptions = {}
): Promise<SearchResult> => {
  const { limit: pageSize = 20, lastDoc } = options;
  
  try {
    const usersRef = collection(firestore, 'users');
    
    // Firestore doesn't support case-insensitive searches natively
    // For MVP, we'll fetch and filter client-side with comprehensive search
    let queryRef = query(
      usersRef,
      limit(100) // Fetch more users to ensure we find matches
    );
    
    const snapshot = await getDocs(queryRef);
    const allUsers: User[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      } as User;
    });
    
    // Apply comprehensive search logic
    const matchingUsers = searchUsersComprehensive(allUsers, name);
    
    // Sort by display name for consistent ordering
    matchingUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Limit results and determine if there are more
    const limitedUsers = matchingUsers.slice(0, pageSize);
    const hasMore = matchingUsers.length > pageSize;
    
    return {
      users: limitedUsers,
      lastDoc: null, // No pagination for comprehensive search to avoid cursor issues
      hasMore,
    };
  } catch (error) {
    console.error('Error searching users by name:', error);
    throw error;
  }
};

/**
 * Unified search function that searches both email and display name with comprehensive logic
 * This is the recommended function for general user search
 */
export const searchUsers = async (
  searchTerm: string,
  options: SearchOptions = {}
): Promise<SearchResult> => {
  const { limit: pageSize = 20 } = options;
  
  try {
    const usersRef = collection(firestore, 'users');
    
    // Fetch users and apply comprehensive search logic
    let queryRef = query(
      usersRef,
      limit(100) // Fetch more users to ensure we find matches
    );
    
    const snapshot = await getDocs(queryRef);
    const allUsers: User[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      } as User;
    });
    
    // Apply comprehensive search logic
    const matchingUsers = searchUsersComprehensive(allUsers, searchTerm);
    
    // Sort by display name for consistent ordering
    matchingUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Limit results and determine if there are more
    const limitedUsers = matchingUsers.slice(0, pageSize);
    const hasMore = matchingUsers.length > pageSize;
    
    return {
      users: limitedUsers,
      lastDoc: null, // No pagination for comprehensive search to avoid cursor issues
      hasMore,
    };
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Backward-compatible function for email search (returns User[] for existing code)
 * @deprecated Use searchUsersByEmail with pagination instead
 */
export const searchUsersByEmailLegacy = async (email: string): Promise<User[]> => {
  const result = await searchUsersByEmail(email, { limit: 10 });
  return result.users;
};

/**
 * Backward-compatible function for display name search (returns User[] for existing code)
 * @deprecated Use searchUsersByDisplayName with pagination instead
 */
export const searchUsersByDisplayNameLegacy = async (name: string): Promise<User[]> => {
  const result = await searchUsersByDisplayName(name, { limit: 10 });
  return result.users;
};

/**
 * Get a user by their ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { getUser } = await import('./firebase-firestore');
    return await getUser(userId);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

