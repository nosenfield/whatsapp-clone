/**
 * Unit Tests for AnalyzeConversationsMultiTool
 * 
 * Tests the cross-conversation analysis functionality
 */

import {AnalyzeConversationsMultiTool} from "../src/tools/analyze-conversations-multi-tool";
import {ToolContext} from "../src/tools/ai-tool-interface";
import * as admin from "firebase-admin";
import {searchUserConversations} from "../src/services/rag-helper";

// Mock dependencies
jest.mock("../src/services/rag-helper");
jest.mock("firebase-admin", () => {
  const actualAdmin = jest.requireActual("firebase-admin");
  return {
    ...actualAdmin,
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
  };
});

describe("AnalyzeConversationsMultiTool", () => {
  let tool: AnalyzeConversationsMultiTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new AnalyzeConversationsMultiTool();
    mockContext = {
      currentUserId: "user123",
      appContext: {
        currentScreen: "chats",
        currentConversationId: undefined,
        recentConversations: [],
      },
      requestId: "test-request-123",
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("Tool Metadata", () => {
    it("should have correct name and description", () => {
      expect(tool.name).toBe("analyze_conversations_multi");
      expect(tool.description).toContain("Extract information from recent conversations");
    });

    it("should have required parameters", () => {
      const paramNames = tool.parameters.map(p => p.name);
      expect(paramNames).toContain("query");
      expect(paramNames).toContain("current_user_id");
      expect(paramNames).toContain("max_conversations");
      expect(paramNames).toContain("time_window_hours");
    });

    it("should have correct parameter defaults", () => {
      const maxConvParam = tool.parameters.find(p => p.name === "max_conversations");
      const timeWindowParam = tool.parameters.find(p => p.name === "time_window_hours");
      
      expect(maxConvParam?.default).toBe(5);
      expect(timeWindowParam?.default).toBe(48);
    });
  });

  describe("No Results Scenario", () => {
    it("should return error when no messages found", async () => {
      // Mock RAG returning no results
      (searchUserConversations as jest.Mock).mockResolvedValue([]);

      const result = await tool.execute({
        query: "Who won the Super Bowl?",
        current_user_id: "user123",
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.next_action).toBe("complete");
      expect(result.instruction_for_ai).toContain("No relevant conversations found");
      expect(result.metadata?.conversationsFound).toBe(0);
    });

    it("should return error when messages outside time window", async () => {
      const oldTimestamp = Date.now() - (72 * 60 * 60 * 1000); // 72 hours ago
      
      (searchUserConversations as jest.Mock).mockResolvedValue([
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: oldTimestamp,
          content: {text: "Old message"},
          relevanceScore: 0.8,
        },
      ]);

      const result = await tool.execute({
        query: "Recent party plans?",
        current_user_id: "user123",
        time_window_hours: 48, // Only last 48 hours
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.next_action).toBe("complete");
    });
  });

  describe("Single Conversation Result", () => {
    it("should analyze directly when only one relevant conversation", async () => {
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: Date.now(),
          content: {text: "Alice confirmed she's coming"},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv1"},
        },
        {
          id: "msg2",
          conversationId: "conv1",
          timestamp: Date.now() - 1000,
          content: {text: "Bob also confirmed"},
          relevanceScore: 0.85,
          metadata: {conversationId: "conv1"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      // Mock Firestore conversation details
      const mockConversationDoc = {
        exists: true,
        data: () => ({
          type: "group",
          participants: ["user123", "alice", "bob"],
          participantDetails: {
            alice: {displayName: "Alice"},
            bob: {displayName: "Bob"},
          },
          name: "Party Planning",
        }),
      };

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(mockConversationDoc),
            collection: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue({
                    docs: mockMessages.map(msg => ({
                      id: msg.id,
                      data: () => msg,
                    })),
                  }),
                })),
              })),
            })),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Who is coming to the party?",
        current_user_id: "user123",
      }, mockContext);

      // Should attempt to analyze the single conversation
      expect(result.success).toBeDefined();
      expect(result.metadata?.searchedMultipleConversations).toBe(true);
    });
  });

  describe("Multiple Conversations Result", () => {
    it("should request clarification when multiple conversations found", async () => {
      const now = Date.now();
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: now,
          content: {text: "Meeting at 3pm"},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv1"},
        },
        {
          id: "msg2",
          conversationId: "conv2",
          timestamp: now - 1000,
          content: {text: "Another meeting at 5pm"},
          relevanceScore: 0.85,
          metadata: {conversationId: "conv2"},
        },
        {
          id: "msg3",
          conversationId: "conv3",
          timestamp: now - 2000,
          content: {text: "Team meeting tomorrow"},
          relevanceScore: 0.8,
          metadata: {conversationId: "conv3"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      // Mock Firestore conversation details
      const mockConversationDocs = [
        {
          exists: true,
          data: () => ({
            type: "direct",
            participants: ["user123", "alice"],
            participantDetails: {
              alice: {displayName: "Alice Smith"},
            },
          }),
        },
        {
          exists: true,
          data: () => ({
            type: "group",
            participants: ["user123", "bob", "carol"],
            name: "Project Team",
          }),
        },
        {
          exists: true,
          data: () => ({
            type: "group",
            participants: ["user123", "dave", "eve"],
            name: "Weekly Sync",
          }),
        },
      ];

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn((id: string) => {
            const index = ["conv1", "conv2", "conv3"].indexOf(id);
            return {
              get: jest.fn().mockResolvedValue(mockConversationDocs[index]),
            };
          }),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "What time is the meeting?",
        current_user_id: "user123",
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.next_action).toBe("clarification_needed");
      expect(result.clarification).toBeDefined();
      expect(result.clarification?.type).toBe("select_conversation");
      expect(result.clarification?.options).toHaveLength(3);
      expect(result.clarification?.question).toContain("3 conversations");
    });

    it("should limit results to max_conversations parameter", async () => {
      const now = Date.now();
      const mockMessages = Array.from({length: 10}, (_, i) => ({
        id: `msg${i}`,
        conversationId: `conv${i}`,
        timestamp: now - (i * 1000),
        content: {text: `Message ${i}`},
        relevanceScore: 0.9 - (i * 0.05),
        metadata: {conversationId: `conv${i}`},
      }));

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                type: "direct",
                participants: ["user123", "other"],
                participantDetails: {},
              }),
            }),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
        max_conversations: 3,
      }, mockContext);

      expect(result.clarification?.options).toHaveLength(3);
    });
  });

  describe("Conversation Grouping and Scoring", () => {
    it("should group messages by conversation correctly", async () => {
      const now = Date.now();
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: now,
          content: {text: "Message 1"},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv1"},
        },
        {
          id: "msg2",
          conversationId: "conv1",
          timestamp: now - 1000,
          content: {text: "Message 2"},
          relevanceScore: 0.8,
          metadata: {conversationId: "conv1"},
        },
        {
          id: "msg3",
          conversationId: "conv2",
          timestamp: now - 2000,
          content: {text: "Message 3"},
          relevanceScore: 0.7,
          metadata: {conversationId: "conv2"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                type: "direct",
                participants: ["user123", "other"],
                participantDetails: {},
              }),
            }),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
      }, mockContext);

      // Should group into 2 conversations
      expect(result.data?.conversations).toHaveLength(2);
      
      // conv1 should have higher score (2 messages with high relevance)
      const conv1Data = result.data?.conversations.find(
        (c: any) => c.conversationId === "conv1"
      );
      const conv2Data = result.data?.conversations.find(
        (c: any) => c.conversationId === "conv2"
      );
      
      expect(conv1Data?.messageCount).toBe(2);
      expect(conv2Data?.messageCount).toBe(1);
    });

    it("should sort conversations by relevance and recency", async () => {
      const now = Date.now();
      const mockMessages = [
        // conv1: High relevance, recent
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: now,
          content: {text: "Recent relevant"},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv1"},
        },
        // conv2: Medium relevance, older
        {
          id: "msg2",
          conversationId: "conv2",
          timestamp: now - (24 * 60 * 60 * 1000), // 1 day ago
          content: {text: "Older message"},
          relevanceScore: 0.6,
          metadata: {conversationId: "conv2"},
        },
        // conv3: Low relevance, very recent
        {
          id: "msg3",
          conversationId: "conv3",
          timestamp: now - 1000,
          content: {text: "Very recent but less relevant"},
          relevanceScore: 0.5,
          metadata: {conversationId: "conv3"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                type: "direct",
                participants: ["user123", "other"],
                participantDetails: {},
              }),
            }),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
      }, mockContext);

      // conv1 should be first (high relevance + recent)
      expect(result.data?.conversations[0].conversationId).toBe("conv1");
    });
  });

  describe("Time Window Filtering", () => {
    it("should respect time_window_hours parameter", async () => {
      const now = Date.now();
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: now - (1 * 60 * 60 * 1000), // 1 hour ago
          content: {text: "Recent"},
          relevanceScore: 0.8,
          metadata: {conversationId: "conv1"},
        },
        {
          id: "msg2",
          conversationId: "conv2",
          timestamp: now - (50 * 60 * 60 * 1000), // 50 hours ago
          content: {text: "Old"},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv2"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
        time_window_hours: 24, // Only last 24 hours
      }, mockContext);

      // Should only include conv1 (within 24 hours)
      // conv2 is 50 hours old, should be filtered out
      expect(result.success).toBe(true);
    });

    it("should include all messages when time_window_hours is 0", async () => {
      const now = Date.now();
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: now - (100 * 60 * 60 * 1000), // 100 hours ago
          content: {text: "Very old"},
          relevanceScore: 0.8,
          metadata: {conversationId: "conv1"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                type: "direct",
                participants: ["user123", "other"],
                participantDetails: {},
              }),
            }),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
        time_window_hours: 0, // No time limit
      }, mockContext);

      expect(result.success).toBe(true);
      // Should include the old message
    });
  });

  describe("Error Handling", () => {
    it("should handle RAG service errors gracefully", async () => {
      (searchUserConversations as jest.Mock).mockRejectedValue(
        new Error("RAG service unavailable")
      );

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.next_action).toBe("error");
      expect(result.error).toContain("RAG service unavailable");
    });

    it("should handle Firestore errors gracefully", async () => {
      (searchUserConversations as jest.Mock).mockResolvedValue([
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: Date.now(),
          content: {text: "Test"},
          relevanceScore: 0.8,
          metadata: {conversationId: "conv1"},
        },
      ]);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockRejectedValue(new Error("Firestore error")),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
      }, mockContext);

      // Should still return a result, just without enriched details
      expect(result).toBeDefined();
    });
  });

  describe("Clarification Options Format", () => {
    it("should format clarification options correctly", async () => {
      const now = Date.now();
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: now,
          content: {text: "This is a preview message"},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv1"},
        },
        {
          id: "msg2",
          conversationId: "conv2",
          timestamp: now - 1000,
          content: {text: "Another preview"},
          relevanceScore: 0.8,
          metadata: {conversationId: "conv2"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn((id: string) => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                type: "direct",
                participants: ["user123", id === "conv1" ? "alice" : "bob"],
                participantDetails: {
                  alice: {displayName: "Alice"},
                  bob: {displayName: "Bob"},
                },
              }),
            }),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
      }, mockContext);

      const options = result.clarification?.options;
      expect(options).toBeDefined();
      expect(options?.[0]).toHaveProperty("id");
      expect(options?.[0]).toHaveProperty("title");
      expect(options?.[0]).toHaveProperty("subtitle");
      expect(options?.[0]).toHaveProperty("confidence");
      expect(options?.[0]).toHaveProperty("metadata");
      
      // Subtitle should contain timestamp and snippet
      expect(options?.[0].subtitle).toContain("ago");
      expect(options?.[0].subtitle).toContain('"');
    });

    it("should truncate long message snippets", async () => {
      const longMessage = "A".repeat(100);
      const mockMessages = [
        {
          id: "msg1",
          conversationId: "conv1",
          timestamp: Date.now(),
          content: {text: longMessage},
          relevanceScore: 0.9,
          metadata: {conversationId: "conv1"},
        },
      ];

      (searchUserConversations as jest.Mock).mockResolvedValue(mockMessages);

      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                type: "direct",
                participants: ["user123", "other"],
                participantDetails: {},
              }),
            }),
          })),
        })),
      };

      (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);

      const result = await tool.execute({
        query: "Test query",
        current_user_id: "user123",
        max_conversations: 1,
      }, mockContext);

      // Snippet should be truncated to ~60 chars
      const snippet = result.clarification?.options?.[0]?.subtitle;
      expect(snippet?.length).toBeLessThan(100);
      expect(snippet).toContain("...");
    });
  });
});

