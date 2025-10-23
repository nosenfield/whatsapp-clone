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
 * Search for users by email address with pagination
 * Uses exact match or prefix search
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
    
    // If no exact match, try prefix search with pagination (no orderBy to avoid index requirement)
    let prefixQuery = query(
      usersRef,
      limit(pageSize * 2) // Get more to filter client-side
    );
    
    if (lastDoc) {
      prefixQuery = query(
        usersRef,
        startAfter(lastDoc),
        limit(pageSize * 2)
      );
    }
    
    const prefixSnapshot = await getDocs(prefixQuery);
    const matchingUsers: User[] = [];
    
    prefixSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.email.toLowerCase().includes(email.toLowerCase())) {
        matchingUsers.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
        });
      }
    });
    
    // Sort by display name for consistent ordering
    matchingUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Limit results and determine if there are more
    const limitedUsers = matchingUsers.slice(0, pageSize);
    const hasMore = matchingUsers.length > pageSize || prefixSnapshot.docs.length === pageSize * 2;
    
    return {
      users: limitedUsers,
      lastDoc: prefixSnapshot.docs[prefixSnapshot.docs.length - 1] || null,
      hasMore,
    };
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Search for users by display name with pagination
 */
export const searchUsersByDisplayName = async (
  name: string, 
  options: SearchOptions = {}
): Promise<SearchResult> => {
  const { limit: pageSize = 20, lastDoc } = options;
  
  try {
    const usersRef = collection(firestore, 'users');
    
    // Firestore doesn't support case-insensitive searches natively
    // For MVP, we'll fetch and filter client-side with pagination (no orderBy to avoid index requirement)
    let queryRef = query(
      usersRef,
      limit(pageSize * 2) // Get more to filter client-side
    );
    
    if (lastDoc) {
      queryRef = query(
        usersRef,
        startAfter(lastDoc),
        limit(pageSize * 2)
      );
    }
    
    const snapshot = await getDocs(queryRef);
    const matchingUsers: User[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.displayName.toLowerCase().includes(name.toLowerCase())) {
        matchingUsers.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
        });
      }
    });
    
    // Sort by display name for consistent ordering
    matchingUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Limit results and determine if there are more
    const limitedUsers = matchingUsers.slice(0, pageSize);
    const hasMore = matchingUsers.length > pageSize || snapshot.docs.length === pageSize * 2;
    
    return {
      users: limitedUsers,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore,
    };
  } catch (error) {
    console.error('Error searching users by name:', error);
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

