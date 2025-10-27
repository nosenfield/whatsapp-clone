/**
 * Conversation Display Hook
 * 
 * Handles conversation display name, presence, and typing indicators
 */

import { useMemo, useState } from 'react';
import { Conversation } from '../../types';
import { usePresence, formatLastSeen } from '../usePresence';
import { useMultiplePresence } from '../useMultiplePresence';
import { useTypingIndicators } from '../useTypingIndicators';

interface UseConversationDisplayProps {
  conversation: Conversation | null;
  currentUserId: string;
  conversationId: string;
}

export const useConversationDisplay = ({ 
  conversation, 
  currentUserId, 
  conversationId 
}: UseConversationDisplayProps) => {
  const [showMemberAvatars, setShowMemberAvatars] = useState(false);

  // Determine if this is a group conversation
  const isGroup = conversation?.type === 'group';

  // Get conversation display name
  const conversationName = useMemo(() => {
    if (isGroup) {
      return conversation?.name || 'Group Chat';
    } else {
      const otherParticipant = conversation?.participants.find(
        (p) => p !== currentUserId
      );
      return otherParticipant && conversation?.participantDetails?.[otherParticipant]
        ? conversation.participantDetails[otherParticipant].displayName
        : 'Chat';
    }
  }, [conversation, currentUserId, isGroup]);

  // Get other participant ID (for presence in direct chats)
  const otherParticipantId = useMemo(() => {
    return !isGroup
      ? conversation?.participants.find((p) => p !== currentUserId)
      : undefined;
  }, [conversation, currentUserId, isGroup]);

  // Get other participant's photo URL (for direct chats)
  const otherParticipantPhotoURL = useMemo(() => {
    return !isGroup && otherParticipantId
      ? conversation?.participantDetails?.[otherParticipantId]?.photoURL
      : undefined;
  }, [conversation, otherParticipantId, isGroup]);

  // Subscribe to other participant's presence (only for direct chats)
  const presence = usePresence(otherParticipantId);

  // Get presence for all group members (only for group chats)
  const groupMemberPresence = useMultiplePresence(
    isGroup && conversation ? conversation.participants : []
  );

  // Format header subtitle
  const headerSubtitle = useMemo(() => {
    if (isGroup) {
      return `${conversation?.participants.length || 0} members`;
    } else {
      return presence.online
        ? 'online'
        : formatLastSeen(presence.lastSeen);
    }
  }, [isGroup, conversation, presence]);

  // Subscribe to typing indicators
  const typingUserIds = useTypingIndicators(conversationId, currentUserId);

  // Check if other participant is typing (for direct chats)
  const isOtherParticipantTyping = useMemo(() => {
    return !isGroup && otherParticipantId 
      ? typingUserIds.includes(otherParticipantId)
      : false;
  }, [isGroup, otherParticipantId, typingUserIds]);

  // Override header subtitle to show "typing..." when user is typing
  const finalHeaderSubtitle = useMemo(() => {
    if (!isGroup && isOtherParticipantTyping) {
      return 'typing...';
    }
    return headerSubtitle;
  }, [isGroup, isOtherParticipantTyping, headerSubtitle]);

  return {
    isGroup,
    conversationName,
    otherParticipantId,
    otherParticipantPhotoURL,
    presence,
    groupMemberPresence,
    headerSubtitle: finalHeaderSubtitle,
    typingUserIds,
    showMemberAvatars,
    setShowMemberAvatars,
  };
};
