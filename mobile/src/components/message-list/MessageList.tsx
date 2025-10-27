/**
 * Message List Component
 * 
 * Main component that orchestrates message display with pagination
 */

import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Message, Conversation } from '../../types';
import { MessageListItem } from './MessageListItem';
import { EmptyState } from './EmptyState';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  conversation?: Conversation | null;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  autoScrollOnNewMessage?: boolean;
  initialScrollToBottom?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  conversation,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
  autoScrollOnNewMessage = true,
  initialScrollToBottom = true,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  // Auto-scroll to bottom when new messages arrive (if user was at bottom)
  useEffect(() => {
    if (autoScrollOnNewMessage && isAtBottom && messages.length > 0) {
      // Small delay to ensure messages are rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, autoScrollOnNewMessage, isAtBottom]);

  // Reset initial load state when messages are cleared or when component first mounts
  useEffect(() => {
    if (messages.length === 0) {
      setIsInitialLoad(true);
    }
  }, [messages.length]);

  // Scroll to bottom when component mounts (show recent messages) - only once
  useEffect(() => {
    if (initialScrollToBottom && isInitialLoad && messages.length > 0 && !isLoading) {
      // Wait for FlatList to be ready and loading to complete, then scroll to bottom
      const timeout = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          setIsInitialLoad(false);
        }
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [initialScrollToBottom, isLoading, messages.length, isInitialLoad]); // Run when loading completes

  // Handle scroll events to track if user is at bottom
  const handleScroll = (event: any) => {
    const { y } = event.nativeEvent.contentOffset;
    const { height } = event.nativeEvent.contentSize;
    const { height: screenHeight } = event.nativeEvent.layoutMeasurement;

    // Consider "at bottom" if within 30px of the bottom
    const atBottom = y + screenHeight >= height - 30;
    setIsAtBottom(atBottom);

    // Show scroll to bottom button if user scrolls up significantly and there are enough messages
    const shouldShow = !atBottom && height > screenHeight + 100 && messages.length > 10;
    setShowScrollToBottom(shouldShow);
  };

  // Function to manually scroll to bottom
  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false); // Hide button immediately
  };

  // Handle FlatList layout ready (backup scroll method)
  const handleLayout = React.useCallback(() => {
    if (initialScrollToBottom && isInitialLoad && messages.length > 0 && !isLoading) {
      // Additional attempt to scroll to bottom when layout is ready
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          setIsInitialLoad(false);
        }
      }, 100);
    }
  }, [initialScrollToBottom, isInitialLoad, messages.length, isLoading]);

  // Show loading state while loading (only if we truly have no messages)
  if (isLoading && messages.length === 0) {
    return <EmptyState isLoading={true} />;
  }
  
  // Scroll to bottom button component
  const renderScrollToBottomButton = () => {
    if (!showScrollToBottom || messages.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.scrollToBottomButton}
        onPress={scrollToBottom}
        activeOpacity={0.8}
      >
        <MaterialIcons name="keyboard-arrow-down" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  // If we have messages, show them even if still loading (for smooth transitions)
  // If no messages and not loading, show blank (not empty state to prevent flash)
  if (messages.length === 0 && !isLoading) {
    return <View style={styles.list} />;
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

  // Simple load more button component inline to avoid import issues
  const renderLoadMoreButton = () => {
    if (!hasNextPage) return null;
    
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        {isFetchingNextPage ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: '#F2F2F7',
              borderRadius: 20,
            }}
            onPress={fetchNextPage || (() => {})}
          >
            <Text style={{ fontSize: 14, color: '#007AFF', fontWeight: '600' }}>
              Load more messages
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        ListFooterComponent={renderLoadMoreButton}
        onScroll={handleScroll}
        onLayout={handleLayout}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      {renderScrollToBottomButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
});
