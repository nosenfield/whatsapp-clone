/**
 * Message List Component
 * 
 * Main component that orchestrates message display with pagination
 */

import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Message, Conversation } from '../../types';
import { MessageListItem } from './MessageListItem';
import { LoadMoreButton } from './LoadMoreButton';
import { EmptyState } from './EmptyState';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  conversation?: Conversation | null;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  conversation,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
}) => {
  // Show loading or empty state
  if (isLoading || messages.length === 0) {
    return <EmptyState isLoading={isLoading} />;
  }

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => (
    <MessageListItem
      message={item}
      index={index}
      currentUserId={currentUserId}
      conversation={conversation}
      messages={messages}
    />
  );

  const renderLoadMoreButton = () => (
    <LoadMoreButton
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onPress={fetchNextPage || (() => {})}
    />
  );

  return (
    <FlatList
      data={messages}
      renderItem={renderMessageItem}
      keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
      inverted
      contentContainerStyle={styles.listContent}
      style={styles.list}
      ListFooterComponent={renderLoadMoreButton}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
});
