/**
 * Calendar Event Service
 * 
 * Manages extracted calendar events on the client side
 */

import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { firestore } from '../../firebase.config';
import { ExtractedEvent } from '../../types';

/**
 * Get extracted events for a conversation
 */
export async function getConversationEvents(conversationId: string): Promise<ExtractedEvent[]> {
  try {
    const eventsRef = collection(firestore, 'extractedEvents');
    const q = query(
      eventsRef,
      where('conversationId', '==', conversationId),
      orderBy('extractedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      extractedAt: doc.data().extractedAt?.toDate() || new Date(),
      date: doc.data().date?.toDate() || new Date(),
    })) as ExtractedEvent[];
  } catch (error) {
    console.error('Error fetching conversation events:', error);
    return [];
  }
}

/**
 * Get all extracted events for a user
 */
export async function getUserEvents(userId: string): Promise<ExtractedEvent[]> {
  try {
    // Get all conversations where user is a participant
    const conversationsRef = collection(firestore, 'conversations');
    const conversationsQuery = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );
    
    const conversationsSnapshot = await getDocs(conversationsQuery);
    const conversationIds = conversationsSnapshot.docs.map(doc => doc.id);

    if (conversationIds.length === 0) {
      return [];
    }

    // Get events for all user's conversations
    const eventsRef = collection(firestore, 'extractedEvents');
    const eventsQuery = query(
      eventsRef,
      where('conversationId', 'in', conversationIds),
      orderBy('extractedAt', 'desc')
    );

    const eventsSnapshot = await getDocs(eventsQuery);
    return eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      extractedAt: doc.data().extractedAt?.toDate() || new Date(),
      date: doc.data().date?.toDate() || new Date(),
    })) as ExtractedEvent[];
  } catch (error) {
    console.error('Error fetching user events:', error);
    return [];
  }
}

/**
 * Confirm an extracted event
 */
export async function confirmEvent(eventId: string): Promise<void> {
  try {
    const eventRef = doc(firestore, 'extractedEvents', eventId);
    await updateDoc(eventRef, {
      status: 'confirmed',
      confirmedAt: new Date(),
    });
  } catch (error) {
    console.error('Error confirming event:', error);
    throw error;
  }
}

/**
 * Dismiss an extracted event
 */
export async function dismissEvent(eventId: string): Promise<void> {
  try {
    const eventRef = doc(firestore, 'extractedEvents', eventId);
    await updateDoc(eventRef, {
      status: 'cancelled',
      dismissedAt: new Date(),
    });
  } catch (error) {
    console.error('Error dismissing event:', error);
    throw error;
  }
}

/**
 * Add event to device calendar
 */
export async function addEventToDeviceCalendar(event: ExtractedEvent): Promise<void> {
  try {
    // This would integrate with Expo Calendar API
    // For now, we'll just mark it as added to device calendar
    const eventRef = doc(firestore, 'extractedEvents', event.id);
    await updateDoc(eventRef, {
      deviceCalendarEventId: `device_${Date.now()}`,
      addedToDeviceCalendarAt: new Date(),
    });
  } catch (error) {
    console.error('Error adding event to device calendar:', error);
    throw error;
  }
}

/**
 * Get upcoming events for a user
 */
export async function getUpcomingEvents(userId: string, days: number = 7): Promise<ExtractedEvent[]> {
  try {
    const allEvents = await getUserEvents(userId);
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    return allEvents.filter(event => {
      const eventDate = event.date;
      return eventDate >= now && eventDate <= futureDate && event.status !== 'cancelled';
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }
}

/**
 * Get events by date range
 */
export async function getEventsByDateRange(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<ExtractedEvent[]> {
  try {
    const allEvents = await getUserEvents(userId);
    
    return allEvents.filter(event => {
      const eventDate = event.date;
      return eventDate >= startDate && eventDate <= endDate && event.status !== 'cancelled';
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error('Error fetching events by date range:', error);
    return [];
  }
}
