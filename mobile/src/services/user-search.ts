import { firestore } from '../../firebase.config';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { User } from '../types';

/**
 * Search for users by email address
 * Uses exact match or prefix search
 */
export const searchUsersByEmail = async (email: string): Promise<User[]> => {
  try {
    const usersRef = collection(firestore, 'users');
    
    // Search for exact match first
    const exactQuery = query(
      usersRef,
      where('email', '==', email),
      limit(10)
    );
    
    const exactSnapshot = await getDocs(exactQuery);
    
    if (!exactSnapshot.empty) {
      return exactSnapshot.docs.map(doc => {
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
    }
    
    // If no exact match, try prefix search (less efficient, but works for MVP)
    const allUsersSnapshot = await getDocs(query(usersRef, limit(100)));
    const matchingUsers: User[] = [];
    
    allUsersSnapshot.docs.forEach(doc => {
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
    
    return matchingUsers.slice(0, 10); // Limit to 10 results
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Search for users by display name
 */
export const searchUsersByDisplayName = async (name: string): Promise<User[]> => {
  try {
    const usersRef = collection(firestore, 'users');
    
    // Firestore doesn't support case-insensitive searches natively
    // For MVP, we'll fetch and filter client-side
    const snapshot = await getDocs(query(usersRef, limit(100)));
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
    
    return matchingUsers.slice(0, 10);
  } catch (error) {
    console.error('Error searching users by name:', error);
    throw error;
  }
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

