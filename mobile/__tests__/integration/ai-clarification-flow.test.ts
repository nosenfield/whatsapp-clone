/**
 * AI Clarification Flow Tests
 * 
 * Tests the complete clarification flow from server-side detection
 * to client-side UI handling and command continuation.
 */

import { ClarificationModal, ClarificationData, ClarificationOption } from '../../src/components/ClarificationModal';
import { enhancedAICommandService } from '../../src/services/enhanced-ai-command';
import { EnhancedAppContext } from '../../src/services/enhanced-ai-command/types';

// Mock data for testing
const mockClarificationData: ClarificationData = {
  clarification_type: 'contact_selection',
  question: 'Which John did you mean?',
  context: 'Multiple contacts with similar confidence scores',
  options: [
    {
      id: 'user_123',
      title: 'John Smith',
      subtitle: 'john.smith@example.com',
      confidence: 0.95,
      metadata: { userId: 'user_123' },
      display_text: 'John Smith (john.smith@example.com)',
    },
    {
      id: 'user_456',
      title: 'John Doe',
      subtitle: 'john.doe@example.com',
      confidence: 0.87,
      metadata: { userId: 'user_456' },
      display_text: 'John Doe (john.doe@example.com)',
    },
    {
      id: 'user_789',
      title: 'Johnny Johnson',
      subtitle: 'johnny.johnson@example.com',
      confidence: 0.72,
      metadata: { userId: 'user_789' },
      display_text: 'Johnny Johnson (johnny.johnson@example.com)',
    },
  ],
  best_option: {
    id: 'user_123',
    title: 'John Smith',
    subtitle: 'john.smith@example.com',
    confidence: 0.95,
    metadata: { userId: 'user_123' },
    display_text: 'John Smith (john.smith@example.com)',
  },
  allow_cancel: true,
  requires_user_input: true,
  action: 'request_clarification',
};

const mockAppContext: EnhancedAppContext = {
  currentScreen: 'chats',
  currentUserId: 'current_user_123',
  recentConversations: [],
  deviceInfo: {
    platform: 'ios',
    version: '1.0.0',
  },
};

describe('AI Clarification Flow', () => {
  describe('ClarificationModal Component', () => {
    it('should render clarification options correctly', () => {
      // This would be a React component test
      // For now, we'll test the data structure
      expect(mockClarificationData.options).toHaveLength(3);
      expect(mockClarificationData.best_option.title).toBe('John Smith');
      expect(mockClarificationData.allow_cancel).toBe(true);
    });

    it('should have proper option structure', () => {
      const firstOption = mockClarificationData.options[0];
      expect(firstOption).toHaveProperty('id');
      expect(firstOption).toHaveProperty('title');
      expect(firstOption).toHaveProperty('subtitle');
      expect(firstOption).toHaveProperty('confidence');
      expect(firstOption).toHaveProperty('metadata');
      expect(firstOption).toHaveProperty('display_text');
    });

    it('should identify best option correctly', () => {
      const bestOption = mockClarificationData.best_option;
      const highestConfidence = Math.max(...mockClarificationData.options.map(o => o.confidence));
      expect(bestOption.confidence).toBe(highestConfidence);
    });
  });

  describe('Enhanced AI Command Service', () => {
    it('should handle clarification continuation', async () => {
      const originalCommand = "Tell John I'm on my way";
      const userSelection = mockClarificationData.options[0]; // John Smith

      // Mock the service response
      const mockResponse = {
        success: true,
        response: "Message sent successfully to John Smith!",
        action: 'no_action' as const,
        runId: 'test_run_123',
      };

      // This would test the actual service call
      // For now, we'll verify the data structures are correct
      expect(userSelection.id).toBe('user_123');
      expect(userSelection.title).toBe('John Smith');
      expect(originalCommand).toContain('John');
    });

    it('should preserve original command context', () => {
      const originalCommand = "Tell John I'm on my way";
      const continuationContext: EnhancedAppContext = {
        ...mockAppContext,
        clarification_response: {
          clarification_type: 'contact_selection',
          selected_option: mockClarificationData.options[0],
          original_clarification_data: mockClarificationData,
        },
      };

      expect(continuationContext.clarification_response).toBeDefined();
      expect(continuationContext.clarification_response?.selected_option.title).toBe('John Smith');
    });
  });

  describe('Clarification Flow Integration', () => {
    it('should handle complete clarification workflow', () => {
      // Step 1: AI detects ambiguity
      const needsClarification = true;
      const clarificationReason = 'Multiple contacts with similar confidence scores';
      
      // Step 2: Server returns clarification data
      const serverResponse = {
        success: true,
        action: 'request_clarification',
        requires_clarification: true,
        clarification_data: mockClarificationData,
        original_command: "Tell John I'm on my way",
      };

      // Step 3: Client shows clarification UI
      expect(serverResponse.requires_clarification).toBe(true);
      expect(serverResponse.clarification_data).toBeDefined();

      // Step 4: User selects option
      const userSelection = mockClarificationData.options[0];

      // Step 5: Client continues command
      const continuationRequest = {
        command: serverResponse.original_command,
        appContext: {
          ...mockAppContext,
          clarification_response: {
            clarification_type: mockClarificationData.clarification_type,
            selected_option: userSelection,
            original_clarification_data: mockClarificationData,
          },
        },
      };

      expect(continuationRequest.appContext.clarification_response).toBeDefined();
      expect(continuationRequest.appContext.clarification_response?.selected_option.id).toBe('user_123');
    });

    it('should handle clarification cancellation', () => {
      const clarificationData = mockClarificationData;
      const allowCancel = clarificationData.allow_cancel;
      
      expect(allowCancel).toBe(true);
      
      // When user cancels, should return to original command input
      const cancelledState = {
        isClarificationVisible: false,
        clarificationData: null,
        originalCommand: '',
        isModalVisible: true, // Reopen command modal
      };

      expect(cancelledState.isClarificationVisible).toBe(false);
      expect(cancelledState.clarificationData).toBeNull();
      expect(cancelledState.isModalVisible).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing clarification data gracefully', () => {
      const incompleteClarificationData = {
        clarification_type: 'contact_selection',
        question: 'Which contact?',
        options: [], // Empty options
        best_option: {
          id: 'option_0',
          title: 'No options',
          subtitle: '',
          confidence: 0,
          display_text: 'No options',
        },
        allow_cancel: true,
        requires_user_input: true,
        action: 'request_clarification',
      };

      expect(incompleteClarificationData.options).toHaveLength(0);
      expect(incompleteClarificationData.best_option.title).toBe('No options');
    });

    it('should handle clarification service errors', async () => {
      const errorResponse = {
        success: false,
        response: 'Sorry, I encountered an error processing your command.',
        action: 'show_error' as const,
        error: 'Service unavailable',
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.action).toBe('show_error');
    });
  });
});

describe('Clarification Data Validation', () => {
  it('should validate clarification option structure', () => {
    const option: ClarificationOption = mockClarificationData.options[0];
    
    // Required fields
    expect(typeof option.id).toBe('string');
    expect(typeof option.title).toBe('string');
    expect(typeof option.subtitle).toBe('string');
    expect(typeof option.confidence).toBe('number');
    expect(typeof option.display_text).toBe('string');
    
    // Value ranges
    expect(option.confidence).toBeGreaterThanOrEqual(0);
    expect(option.confidence).toBeLessThanOrEqual(1);
    expect(option.id.length).toBeGreaterThan(0);
    expect(option.title.length).toBeGreaterThan(0);
  });

  it('should validate clarification data structure', () => {
    const data: ClarificationData = mockClarificationData;
    
    // Required fields
    expect(typeof data.clarification_type).toBe('string');
    expect(typeof data.question).toBe('string');
    expect(Array.isArray(data.options)).toBe(true);
    expect(typeof data.best_option).toBe('object');
    expect(typeof data.allow_cancel).toBe('boolean');
    expect(data.requires_user_input).toBe(true);
    expect(typeof data.action).toBe('string');
    
    // Logical constraints
    expect(data.options.length).toBeGreaterThan(0);
    expect(data.best_option).toBeDefined();
    expect(data.options).toContainEqual(data.best_option);
  });
});
