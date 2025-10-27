/**
 * Integration Test for Multi-Conversation Analysis
 * 
 * Tests the analyze_conversations_multi tool with realistic scenarios
 * 
 * Usage: npx ts-node test-multi-conversation-analysis.ts
 */

import * as admin from "firebase-admin";
import {AnalyzeConversationsMultiTool} from "./src/tools/analyze-conversations-multi-tool";
import {ToolContext} from "./src/tools/ai-tool-interface";

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const TEST_USER_ID = process.env.TEST_USER_ID || "test-user-123";

async function testMultiConversationAnalysis() {
  console.log("🧪 Testing Multi-Conversation Analysis Tool\n");
  console.log("=" .repeat(60));

  const tool = new AnalyzeConversationsMultiTool();
  const context: ToolContext = {
    currentUserId: TEST_USER_ID,
    appContext: {
      currentScreen: "chats",
      currentConversationId: undefined,
      recentConversations: [],
    },
    requestId: "test-integration-" + Date.now(),
  };

  // Test Case 1: Query with no results
  console.log("\n📋 Test Case 1: Query with no results");
  console.log("-".repeat(60));
  try {
    const result1 = await tool.execute({
      query: "Who won the Super Bowl in 1999?",
      current_user_id: TEST_USER_ID,
    }, context);

    console.log("✅ Result:", {
      success: result1.success,
      next_action: result1.next_action,
      conversationsFound: result1.metadata?.conversationsFound || 0,
    });
    console.log("📝 AI Instruction:", result1.instruction_for_ai?.substring(0, 100));
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test Case 2: Query that should find conversations
  console.log("\n📋 Test Case 2: Query about meetings");
  console.log("-".repeat(60));
  try {
    const result2 = await tool.execute({
      query: "What time is the meeting?",
      current_user_id: TEST_USER_ID,
      max_conversations: 5,
      time_window_hours: 48,
    }, context);

    console.log("✅ Result:", {
      success: result2.success,
      next_action: result2.next_action,
      conversationsFound: result2.data?.conversations?.length || 0,
    });

    if (result2.next_action === "clarification_needed") {
      console.log("\n🔍 Clarification Required:");
      console.log("Question:", result2.clarification?.question);
      console.log("\nOptions:");
      result2.clarification?.options.forEach((opt: any, idx: number) => {
        console.log(`  ${idx + 1}. ${opt.title}`);
        console.log(`     ${opt.subtitle}`);
        console.log(`     Confidence: ${(opt.confidence * 100).toFixed(0)}%`);
      });
    } else if (result2.next_action === "complete") {
      console.log("\n📊 Direct Answer:");
      console.log(result2.data?.answer || "No answer provided");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test Case 3: Query with short time window
  console.log("\n📋 Test Case 3: Recent conversations only (24h)");
  console.log("-".repeat(60));
  try {
    const result3 = await tool.execute({
      query: "Who confirmed for tonight?",
      current_user_id: TEST_USER_ID,
      max_conversations: 3,
      time_window_hours: 24,
    }, context);

    console.log("✅ Result:", {
      success: result3.success,
      next_action: result3.next_action,
      conversationsFound: result3.data?.conversations?.length || 0,
      timeWindow: "24 hours",
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test Case 4: Query with no time limit
  console.log("\n📋 Test Case 4: All conversations (no time limit)");
  console.log("-".repeat(60));
  try {
    const result4 = await tool.execute({
      query: "project deadline",
      current_user_id: TEST_USER_ID,
      max_conversations: 5,
      time_window_hours: 0, // No time limit
    }, context);

    console.log("✅ Result:", {
      success: result4.success,
      next_action: result4.next_action,
      conversationsFound: result4.data?.conversations?.length || 0,
      timeWindow: "unlimited",
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test Case 5: Tool metadata validation
  console.log("\n📋 Test Case 5: Tool Metadata");
  console.log("-".repeat(60));
  console.log("Tool Name:", tool.name);
  console.log("Description:", tool.description.substring(0, 80) + "...");
  console.log("\nParameters:");
  tool.parameters.forEach(param => {
    console.log(`  - ${param.name} (${param.type})${param.required ? " *required*" : ""}`);
    console.log(`    ${param.description}`);
    if (param.default !== undefined) {
      console.log(`    Default: ${param.default}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("\n💡 Tips:");
  console.log("  - Set TEST_USER_ID env var to test with real user data");
  console.log("  - Ensure RAG pipeline is deployed and configured");
  console.log("  - Check Firestore for actual conversation data");
}

// Run tests
testMultiConversationAnalysis()
  .then(() => {
    console.log("\n✅ Test suite finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  });

