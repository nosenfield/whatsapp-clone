import { firestore } from '../../firebase.config';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  addDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { User, Conversation, Message } from '../types';

// User operations
export const createUser = async (userId: string, userData: Partial<User>): Promise<void> => {
  const userRef = doc(firestore, 'users', userId);
  await setDoc(userRef, {
    ...userData,
    createdAt: Timestamp.now(),
    lastActive: Timestamp.now(),
  });
};

export const getUser = async (userId: string): Promise<User | null> => {
  const userRef = doc(firestore, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      id: userSnap.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      lastActive: data.lastActive.toDate(),
    } as User;
  }
  return null;
};

export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(firestore, 'users', userId);
  await updateDoc(userRef, { ...data, lastActive: Timestamp.now() });
};

// Conversation operations
export const createConversation = async (participants: string[]): Promise<string> => {
  const conversationRef = await addDoc(collection(firestore, 'conversations'), {
    type: 'direct',
    participants,
    createdAt: Timestamp.now(),
    lastMessageAt: Timestamp.now(),
  });
  return conversationRef.id;
};

export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  const conversationRef = doc(firestore, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);
  
  if (conversationSnap.exists()) {
    const data = conversationSnap.data();
    return {
      id: conversationSnap.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      lastMessageAt: data.lastMessageAt.toDate(),
    } as Conversation;
  }
  return null;
};

// Message operations
export const sendMessage = async (
  conversationId: string,
  message: Partial<Message>
): Promise<string> => {
  const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');
  const messageDoc = await addDoc(messagesRef, {
    ...message,
    timestamp: Timestamp.now(),
  });
  return messageDoc.id;
};

// Real-time subscriptions
export const subscribeToConversation = (
  conversationId: string,
  callback: (conversation: Conversation) => void
): (() => void) => {
  const conversationRef = doc(firestore, 'conversations', conversationId);
  return onSnapshot(conversationRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        lastMessageAt: data.lastMessageAt.toDate(),
      } as Conversation);
    }
  });
};

export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
      } as Message;
    });
    callback(messages);
  });
};
