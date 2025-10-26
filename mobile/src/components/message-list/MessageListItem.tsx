/**
 * Message List Item Component
 * 
 * Handles rendering of individual messages with read receipts
 */

import React from 'react';
import { View } from 'react-native';
import { MessageBubble } from '../MessageBubble';
import { ReadReceiptLine } from '../ReadReceiptLine';
import { Message, Conversation, User } from '../../types';
import { getUsersWhoReadMessage } from '../../services/read-receipt-service';

interface MessageListItemProps {
  message: Message;
  index: number;
  currentUserId: string;
  conversation?: Conversation | null;
  messages: Message[];
}

export const MessageListItem: React.FC<MessageListItemProps> = ({
  message,
  index,
  currentUserId,
  conversation,
  messages,
}) => {
  const isGroup = conversation?.type === 'group';

  // Debug: Check conversation data
  console.log('📖 Debug - Conversation:', conversation?.id);
  console.log('📖 Debug - lastSeenBy:', conversation?.lastSeenBy);
  console.log('📖 Debug - participants:', conversation?.participants);
  
  // Use timestamp-based approach to determine who has read this message
  const usersWhoRead = getUsersWhoReadMessage(
    message,
    conversation?.lastSeenBy,
    conversation?.participants,
    messages
  );
  
  const hasReadReceipts = usersWhoRead.length > 0;
  
  console.log('📖 Message:', message.id, 'hasReadReceipts:', hasReadReceipts, 'readers:', usersWhoRead.length);

  // Get user details for read receipts
  const readReceiptUsers = usersWhoRead.map(receipt => {
    const participantDetails = conversation?.participantDetails?.[receipt.userId];
    return {
      userId: receipt.userId,
      user: {
        id: receipt.userId,
        displayName: participantDetails?.displayName || 'Unknown',
        email: '', // We don't store email in participantDetails
        photoURL: participantDetails?.photoURL,
        createdAt: new Date(),
        lastActive: new Date(),
      } as User,
      readAt: receipt.readAt
    };
  });

  // Determine if this is the first message (chronologically earliest)
  const firstMessage = messages.reduce((earliest, current) => 
    current.timestamp < earliest.timestamp ? current : earliest
  );
  const isFirstMessage = message.id === firstMessage.id;

  // Check if any users haven't opened the conversation (should show above first message)
  const usersWhoNeverOpened = readReceiptUsers.filter(user => {
    const userLastSeen = conversation?.lastSeenBy?.[user.userId];
    return !userLastSeen || !userLastSeen.lastMessageId;
  });

  // Check if any users have read messages (should show below their last read message)
  const usersWhoReadMessages = readReceiptUsers.filter(user => {
    const userLastSeen = conversation?.lastSeenBy?.[user.userId];
    return userLastSeen && userLastSeen.lastMessageId;
  });

  return (
    <View key={message.id || message.localId || String(message.timestamp)}>
      {/* Show read receipt ABOVE first message for users who never opened conversation */}
      {isFirstMessage && usersWhoNeverOpened.length > 0 && (
        <ReadReceiptLine
          readBy={usersWhoNeverOpened}
          currentUserId={currentUserId}
        />
      )}
      
      <MessageBubble
        message={message}
        isOwnMessage={message.senderId === currentUserId}
        showSender={isGroup}
        conversation={conversation || undefined}
      />
      
      {/* Show read receipt BELOW message for users who have read messages */}
      {usersWhoReadMessages.length > 0 && (
        <ReadReceiptLine
          readBy={usersWhoReadMessages}
          currentUserId={currentUserId}
        />
      )}
    </View>
  );
};
