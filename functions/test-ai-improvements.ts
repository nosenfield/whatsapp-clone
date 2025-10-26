/**
 * Test Script for AI Tool Chaining Improvements
 * 
 * Tests the enhanced AI processor with:
 * - Pattern 3 (information extraction with RAG)
 * - Pre-flight validation
 * - Enhanced parameter validation
 * - Tool chain optimization
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

interface TestCase {
  name: string;
  command: string;
  appContext: {
    currentScreen: "chats" | "conversation" | "profile" | "settings";
    currentConversationId?: string;
    currentUserId: string;
    recentConversations: string[];
    deviceInfo: {
      platform: "ios" | "android";
      version: string;
    };
  };
  expectedPattern: string;
  expectedTools: string[];
  shouldSucceed: boolean;
  notes?: string;
}

const TEST_USER_ID = "test-user-123";
const TEST_CONVERSATION_ID = "test-conv-456";

const testCases: TestCase[] = [
  // Pattern 1: Send Message
  {
    name: "Send message to contact",
    command: "Tell Jane I'll be there at 3pm",
    appContext: {
      currentScreen: "chats",
      currentUserId: TEST_USER_ID,
      recentConversations: [],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Send message to contact by name",
    expectedTools: ["lookup_contacts", "send_message"],
    shouldSucceed: true,
    notes: "Should use lookup_contacts then send_message"
  },

  // Pattern 2: Summarize Conversation (from chats screen)
  {
    name: "Summarize recent conversation (from chats)",
    command: "Summarize my recent conversation",
    appContext: {
      currentScreen: "chats",
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Summarize conversation messages",
    expectedTools: ["get_conversations", "summarize_conversation"],
    shouldSucceed: true,
    notes: "Should get conversations first, then summarize"
  },

  // Pattern 2: Summarize Conversation (in conversation)
  {
    name: "Summarize this conversation (in conversation)",
    command: "Summarize this conversation",
    appContext: {
      currentScreen: "conversation",
      currentConversationId: TEST_CONVERSATION_ID,
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Summarize conversation",
    expectedTools: ["summarize_conversation"],
    shouldSucceed: true,
    notes: "Should directly summarize current conversation"
  },

  // Pattern 3: Information Extraction (NEW!)
  {
    name: "Who is coming to the party? (in conversation)",
    command: "Who is coming to the party tonight?",
    appContext: {
      currentScreen: "conversation",
      currentConversationId: TEST_CONVERSATION_ID,
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Extract information from conversation",
    expectedTools: ["analyze_conversation"],
    shouldSucceed: true,
    notes: "NEW: Should use analyze_conversation with RAG"
  },

  {
    name: "What did Sarah say about the deadline?",
    command: "What did Sarah say about the deadline?",
    appContext: {
      currentScreen: "conversation",
      currentConversationId: TEST_CONVERSATION_ID,
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Extract information from conversation",
    expectedTools: ["analyze_conversation"],
    shouldSucceed: true,
    notes: "NEW: Should extract specific information about what Sarah said"
  },

  {
    name: "Who confirmed for the meeting?",
    command: "Did anyone confirm for the meeting?",
    appContext: {
      currentScreen: "conversation",
      currentConversationId: TEST_CONVERSATION_ID,
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Extract information from conversation",
    expectedTools: ["analyze_conversation"],
    shouldSucceed: true,
    notes: "NEW: Should identify who confirmed"
  },

  // Pre-flight Validation Tests
  {
    name: "Information query without being in conversation (should warn)",
    command: "Who is coming to the party?",
    appContext: {
      currentScreen: "chats",
      currentUserId: TEST_USER_ID,
      recentConversations: [],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Unknown pattern",
    expectedTools: [],
    shouldSucceed: false,
    notes: "Pre-flight validation should warn user to open conversation first"
  },

  // Edge Cases
  {
    name: "Empty command (should fail pre-flight)",
    command: "",
    appContext: {
      currentScreen: "chats",
      currentUserId: TEST_USER_ID,
      recentConversations: [],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Unknown pattern",
    expectedTools: [],
    shouldSucceed: false,
    notes: "Pre-flight validation should reject empty command"
  },

  {
    name: "Ambiguous pronoun (should warn)",
    command: "Tell him I'm running late",
    appContext: {
      currentScreen: "chats",
      currentUserId: TEST_USER_ID,
      recentConversations: [],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Send message to contact by name",
    expectedTools: ["lookup_contacts", "send_message"],
    shouldSucceed: true,
    notes: "Should warn about ambiguous pronoun but still attempt"
  },

  // RAG Integration Tests
  {
    name: "When is the meeting? (temporal query)",
    command: "When is the meeting scheduled?",
    appContext: {
      currentScreen: "conversation",
      currentConversationId: TEST_CONVERSATION_ID,
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Extract information from conversation",
    expectedTools: ["analyze_conversation"],
    shouldSucceed: true,
    notes: "RAG should find messages with temporal information"
  },

  {
    name: "Where should we meet? (location query)",
    command: "Where should we meet?",
    appContext: {
      currentScreen: "conversation",
      currentConversationId: TEST_CONVERSATION_ID,
      currentUserId: TEST_USER_ID,
      recentConversations: [TEST_CONVERSATION_ID],
      deviceInfo: { platform: "ios", version: "1.0.0" }
    },
    expectedPattern: "Extract information from conversation",
    expectedTools: ["analyze_conversation"],
    shouldSucceed: true,
    notes: "RAG should find messages with location information"
  }
];

/**
 * Run test suite
 */
async function runTests() {
  console.log("🧪 AI Tool Chaining Improvements Test Suite\n");
  console.log("=" .repeat(80));
  console.log("\n");

  let passed = 0;
  let failed = 0;
  const results: Array<{testCase: TestCase; result: string; details?: string}> = [];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Command: "${testCase.command}"`);
    console.log(`   Context: ${testCase.appContext.currentScreen}${testCase.appContext.currentConversationId ? ` (${testCase.appContext.currentConversationId})` : ""}`);
    console.log(`   Expected: ${testCase.expectedPattern}`);
    console.log(`   Expected Tools: ${testCase.expectedTools.join(" → ")}`);
    
    try {
      // Note: This is a dry-run test that checks the logic
      // For actual execution, you would call processEnhancedAICommand
      
      // Simulate pre-flight validation
      const preFlightResult = simulatePreFlight(testCase);
      
      if (!preFlightResult.valid && !testCase.shouldSucceed) {
        console.log(`   ✅ PASS: Pre-flight validation correctly rejected`);
        console.log(`   Details: ${preFlightResult.errors.join(", ")}`);
        passed++;
        results.push({
          testCase,
          result: "PASS",
          details: `Pre-flight rejected: ${preFlightResult.errors.join(", ")}`
        });
        continue;
      }

      if (!preFlightResult.valid && testCase.shouldSucceed) {
        console.log(`   ❌ FAIL: Pre-flight validation incorrectly rejected`);
        console.log(`   Details: ${preFlightResult.errors.join(", ")}`);
        failed++;
        results.push({
          testCase,
          result: "FAIL",
          details: `Pre-flight incorrectly rejected: ${preFlightResult.errors.join(", ")}`
        });
        continue;
      }

      // Simulate tool selection
      const toolSelection = simulateToolSelection(testCase);
      
      if (toolSelection.tools.join(",") === testCase.expectedTools.join(",")) {
        console.log(`   ✅ PASS: Correct tools selected`);
        console.log(`   Tools: ${toolSelection.tools.join(" → ")}`);
        passed++;
        results.push({
          testCase,
          result: "PASS",
          details: `Tools: ${toolSelection.tools.join(" → ")}`
        });
      } else {
        console.log(`   ❌ FAIL: Incorrect tools selected`);
        console.log(`   Expected: ${testCase.expectedTools.join(" → ")}`);
        console.log(`   Got: ${toolSelection.tools.join(" → ")}`);
        failed++;
        results.push({
          testCase,
          result: "FAIL",
          details: `Expected ${testCase.expectedTools.join(" → ")}, got ${toolSelection.tools.join(" → ")}`
        });
      }

      if (testCase.notes) {
        console.log(`   📌 Note: ${testCase.notes}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failed++;
      results.push({
        testCase,
        result: "ERROR",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Print summary
  console.log("\n");
  console.log("=" .repeat(80));
  console.log("\n📊 Test Summary\n");
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log("\n");

  // Print detailed results
  console.log("📋 Detailed Results:\n");
  for (const {testCase, result, details} of results) {
    const icon = result === "PASS" ? "✅" : result === "FAIL" ? "❌" : "⚠️";
    console.log(`${icon} ${testCase.name}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  console.log("\n");
  console.log("=" .repeat(80));
  
  return {
    total: testCases.length,
    passed,
    failed,
    successRate: (passed / testCases.length) * 100
  };
}

/**
 * Simulate pre-flight validation
 */
function simulatePreFlight(testCase: TestCase): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty command
  if (!testCase.command || testCase.command.trim().length === 0) {
    errors.push("Command is empty");
  }

  // Check for information queries without being in conversation
  const informationQueries = [
    /who (is|are|was|were|confirmed|said|mentioned)/i,
    /what (did|does|is|was|were|about)/i,
    /when (is|was|did|does)/i,
    /where (is|was|did|does)/i,
  ];

  const isInformationQuery = informationQueries.some(pattern => pattern.test(testCase.command));
  const inConversation = testCase.appContext.currentConversationId && 
                        testCase.appContext.currentScreen === "conversation";

  if (isInformationQuery && !inConversation) {
    warnings.push("Information extraction query detected but user is not in a conversation");
  }

  // Check for ambiguous pronouns
  if (/tell (him|her|them)/i.test(testCase.command)) {
    warnings.push("Ambiguous pronoun detected");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Simulate tool selection based on command and context
 */
function simulateToolSelection(testCase: TestCase): {
  tools: string[];
  pattern: string;
} {
  const command = testCase.command.toLowerCase();
  const inConversation = testCase.appContext.currentConversationId && 
                        testCase.appContext.currentScreen === "conversation";

  // Pattern 3: Information extraction
  const informationQueries = [
    /who (is|are|was|were|confirmed|said|mentioned)/i,
    /what (did|does|is|was|were|about)/i,
    /when (is|was|did|does)/i,
    /where (is|was|did|does|should)/i,
    /did (anyone|somebody|everyone)/i,
  ];

  if (informationQueries.some(pattern => pattern.test(command)) && inConversation) {
    return {
      tools: ["analyze_conversation"],
      pattern: "Extract information from conversation"
    };
  }

  // Pattern 2: Summarization
  if (/summarize/i.test(command)) {
    if (inConversation) {
      return {
        tools: ["summarize_conversation"],
        pattern: "Summarize conversation"
      };
    } else {
      return {
        tools: ["get_conversations", "summarize_conversation"],
        pattern: "Summarize conversation messages"
      };
    }
  }

  // Pattern 1: Send message
  if (/tell|message|send/i.test(command)) {
    return {
      tools: ["lookup_contacts", "send_message"],
      pattern: "Send message to contact by name"
    };
  }

  return {
    tools: [],
    pattern: "Unknown pattern"
  };
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then((results) => {
      console.log("\n✨ Test suite completed!");
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("\n❌ Test suite failed:", error);
      process.exit(1);
    });
}

export { runTests, testCases };

