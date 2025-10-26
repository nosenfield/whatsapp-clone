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

export const subscribeToConversation = (
  conversationId: string,
  callback: (conversation: Conversation) => void
): (() => void) => {
  const conversationRef = doc(firestore, 'conversations', conversationId);
  
  const unsubscribe = onSnapshot(conversationRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const conversation: Conversation = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
        lastMessage: data.lastMessage ? {
          id: data.lastMessage.id || '',
          text: data.lastMessage.text,
          senderId: data.lastMessage.senderId,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
        } : undefined,
        lastSeenBy: data.lastSeenBy ? Object.fromEntries(
          Object.entries(data.lastSeenBy).map(([userId, seenData]: [string, any]) => [
            userId,
            {
              lastMessageId: seenData.lastMessageId,
              seenAt: seenData.seenAt?.toDate() || new Date()
            }
          ])
        ) : {},
      } as Conversation;
      
      callback(conversation);
    }
  });
  
  return unsubscribe;
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
        conversationId, // Add conversationId from the subscription
        ...data,
        timestamp: data.timestamp.toDate(),
      } as Message;
    });
    callback(messages);
  });
};
