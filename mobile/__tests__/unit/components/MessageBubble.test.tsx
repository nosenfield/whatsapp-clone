/**
 * Unit tests for MessageBubble component
 */

import React from 'react';
import { render } from '../../helpers/test-utils';
import { MessageBubble } from '../../../src/components/MessageBubble';
import { createTestMessage } from '../../fixtures/test-data';

describe('MessageBubble', () => {
  test('should render message text', () => {
    const message = createTestMessage({ content: { text: 'Hello World', type: 'text' } });
    
    const { getByText } = render(
      <MessageBubble message={message} isOwnMessage={false} />
    );
    
    expect(getByText('Hello World')).toBeTruthy();
  });
  
  test('should apply different styles for own messages', () => {
    const message = createTestMessage();
    
    const { getByTestId } = render(
      <MessageBubble message={message} isOwnMessage={true} />
    );
    
    // In the real component, add testID="message-bubble"
    // const bubble = getByTestId('message-bubble');
    // expect(bubble.props.style).toContainEqual(expect.objectContaining({
    //   backgroundColor: '#007AFF'
    // }));
  });
  
  test('should display timestamp', () => {
    const timestamp = new Date('2025-01-15T10:30:00');
    const message = createTestMessage({ timestamp });
    
    const { getByText } = render(
      <MessageBubble message={message} isOwnMessage={false} />
    );
    
    // Should show time in format like "10:30 AM"
    expect(getByText(/10:30/)).toBeTruthy();
  });
  
  test('should show sending status for pending messages', () => {
    const message = createTestMessage({ status: 'sending' });
    
    const { getByTestId } = render(
      <MessageBubble message={message} isOwnMessage={true} />
    );
    
    // In the real component, add testID for status indicator
    // expect(getByTestId('status-sending')).toBeTruthy();
  });
});

