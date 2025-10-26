/**
 * Calendar Events Hook
 * 
 * React hook for managing extracted calendar events
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getConversationEvents, 
  getUserEvents, 
  confirmEvent, 
  dismissEvent, 
  addEventToDeviceCalendar,
  getUpcomingEvents,
  getEventsByDateRange
} from '../services/calendar-event-service';
import { ExtractedEvent } from '../types';

/**
 * Hook for managing conversation events
 */
export function useConversationEvents(conversationId: string) {
  return useQuery({
    queryKey: ['conversationEvents', conversationId],
    queryFn: () => getConversationEvents(conversationId),
    enabled: !!conversationId,
  });
}

/**
 * Hook for managing user events
 */
export function useUserEvents(userId: string) {
  return useQuery({
    queryKey: ['userEvents', userId],
    queryFn: () => getUserEvents(userId),
    enabled: !!userId,
  });
}

/**
 * Hook for upcoming events
 */
export function useUpcomingEvents(userId: string, days: number = 7) {
  return useQuery({
    queryKey: ['upcomingEvents', userId, days],
    queryFn: () => getUpcomingEvents(userId, days),
    enabled: !!userId,
  });
}

/**
 * Hook for events by date range
 */
export function useEventsByDateRange(userId: string, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['eventsByDateRange', userId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => getEventsByDateRange(userId, startDate, endDate),
    enabled: !!userId,
  });
}

/**
 * Hook for event actions (confirm, dismiss, add to calendar)
 */
export function useEventActions() {
  const queryClient = useQueryClient();

  const confirmEventMutation = useMutation({
    mutationFn: confirmEvent,
    onSuccess: (_, eventId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['conversationEvents'] });
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
    },
  });

  const dismissEventMutation = useMutation({
    mutationFn: dismissEvent,
    onSuccess: (_, eventId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['conversationEvents'] });
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
    },
  });

  const addToCalendarMutation = useMutation({
    mutationFn: addEventToDeviceCalendar,
    onSuccess: (_, event) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['conversationEvents'] });
      queryClient.invalidateQueries({ queryKey: ['userEvents'] });
    },
  });

  return {
    confirmEvent: confirmEventMutation.mutate,
    dismissEvent: dismissEventMutation.mutate,
    addToCalendar: addToCalendarMutation.mutate,
    isConfirming: confirmEventMutation.isPending,
    isDismissing: dismissEventMutation.isPending,
    isAddingToCalendar: addToCalendarMutation.isPending,
  };
}

/**
 * Hook for calendar event statistics
 */
export function useEventStats(userId: string) {
  const { data: events, isLoading } = useUserEvents(userId);

  const stats = {
    total: events?.length || 0,
    confirmed: events?.filter(e => e.status === 'confirmed').length || 0,
    proposed: events?.filter(e => e.status === 'proposed').length || 0,
    cancelled: events?.filter(e => e.status === 'cancelled').length || 0,
    upcoming: events?.filter(e => {
      const eventDate = e.date;
      const now = new Date();
      return eventDate >= now && e.status !== 'cancelled';
    }).length || 0,
  };

  return {
    stats,
    isLoading,
  };
}
