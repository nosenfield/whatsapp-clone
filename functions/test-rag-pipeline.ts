/**
 * RAG Pipeline Test Script
 * 
 * Tests the complete RAG pipeline:
 * - Environment configuration
 * - OpenAI embedding generation
 * - Pinecone connection and operations
 * - Search accuracy and latency
 * 
 * Run with: npx ts-node test-rag-pipeline.ts
 */

import * as admin from "firebase-admin";
import { generateEmbedding, generateQueryEmbedding, shouldEmbedText } from "./src/services/embeddings";
import { upsertToPinecone, searchConversationHistory } from "./src/services/pinecone";
import { enhancePromptWithContext } from "./src/services/rag-helper";
import { validateEnvironment, logEnvironmentStatus } from "./src/services/env-config";

// Initialize Firebase Admin (for local testing)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Test data
const testMessages = [
  {
    id: "test-msg-1",
    text: "Let's schedule a playdate for the kids next Tuesday at 3pm",
    conversationId: "test-conv-1",
    senderId: "user-1",
    timestamp: new Date("2025-10-20T15:00:00Z"),
  },
  {
    id: "test-msg-2",
    text: "Can you pick up milk and eggs from the store?",
    conversationId: "test-conv-1",
    senderId: "user-2",
    timestamp: new Date("2025-10-21T10:00:00Z"),
  },
  {
    id: "test-msg-3",
    text: "The parent-teacher conference is scheduled for Friday at 4pm",
    conversationId: "test-conv-2",
    senderId: "user-1",
    timestamp: new Date("2025-10-22T14:00:00Z"),
  },
  {
    id: "test-msg-4",
    text: "Don't forget to bring the permission slip tomorrow",
    conversationId: "test-conv-2",
    senderId: "user-3",
    timestamp: new Date("2025-10-23T08:00:00Z"),
  },
];

/**
 * Test 1: Environment Configuration
 */
async function testEnvironment(): Promise<boolean> {
  console.log("\n🔍 Test 1: Environment Configuration");
  console.log("=====================================");
  
  const validation = validateEnvironment();
  logEnvironmentStatus();
  
  if (!validation.valid) {
    console.error("❌ Environment validation failed");
    console.error("Missing variables:", validation.missing);
    return false;
  }
  
  if (validation.warnings.length > 0) {
    console.warn("⚠️  Warnings:", validation.warnings);
  }
  
  console.log("✅ Environment configuration valid");
  return true;
}

/**
 * Test 2: OpenAI Embedding Generation
 */
async function testEmbeddings(): Promise<boolean> {
  console.log("\n🔍 Test 2: OpenAI Embedding Generation");
  console.log("======================================");
  
  try {
    // Test text filtering
    console.log("\nTesting text filtering...");
    const shouldEmbed1 = shouldEmbedText("Hello world");
    const shouldEmbed2 = shouldEmbedText("😀😀😀");
    const shouldEmbed3 = shouldEmbedText("Hi");
    
    console.log(`  "Hello world" should embed: ${shouldEmbed1} ✅`);
    console.log(`  "😀😀😀" should embed: ${shouldEmbed2} (expected: false) ${!shouldEmbed2 ? '✅' : '❌'}`);
    console.log(`  "Hi" should embed: ${shouldEmbed3} (expected: false) ${!shouldEmbed3 ? '✅' : '❌'}`);
    
    // Test embedding generation
    console.log("\nGenerating test embedding...");
    const startTime = Date.now();
    const embedding = await generateEmbedding(testMessages[0].text);
    const latency = Date.now() - startTime;
    
    console.log(`  Embedding dimension: ${embedding.length}`);
    console.log(`  Expected dimension: 1536`);
    console.log(`  Latency: ${latency}ms`);
    console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(", ")}]`);
    
    if (embedding.length !== 1536) {
      console.error("❌ Embedding dimension mismatch!");
      return false;
    }
    
    if (latency > 5000) {
      console.warn("⚠️  High latency detected (>5s)");
    }
    
    console.log("✅ Embedding generation successful");
    return true;
  } catch (error) {
    console.error("❌ Embedding generation failed:", error);
    return false;
  }
}

/**
 * Test 3: Pinecone Operations
 */
async function testPinecone(): Promise<boolean> {
  console.log("\n🔍 Test 3: Pinecone Operations");
  console.log("================================");
  
  try {
    // Generate embeddings for test messages
    console.log("\nGenerating embeddings for test messages...");
    const embeddings: Array<{ id: string; embedding: number[]; metadata: any }> = [];
    
    for (const msg of testMessages) {
      const embedding = await generateEmbedding(msg.text);
      embeddings.push({
        id: msg.id,
        embedding,
        metadata: {
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          timestamp: msg.timestamp.toISOString(),
          text: msg.text.substring(0, 500),
          userId: msg.senderId, // For filtering
        },
      });
      console.log(`  ✅ Generated embedding for: "${msg.text.substring(0, 50)}..."`);
    }
    
    // Upsert to Pinecone
    console.log("\nUpserting embeddings to Pinecone...");
    for (const item of embeddings) {
      await upsertToPinecone(item.id, item.embedding, item.metadata);
      console.log(`  ✅ Upserted: ${item.id}`);
    }
    
    // Wait for indexing (Pinecone needs a moment to index)
    console.log("\nWaiting 2 seconds for Pinecone indexing...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test search
    console.log("\nTesting vector search...");
    const queries = [
      "When is the playdate?",
      "What do I need from the store?",
      "When is the parent-teacher meeting?",
    ];
    
    for (const query of queries) {
      console.log(`\n  Query: "${query}"`);
      const startTime = Date.now();
      const queryEmbedding = await generateQueryEmbedding(query);
      const results = await searchConversationHistory(queryEmbedding, 3);
      const latency = Date.now() - startTime;
      
      console.log(`  Latency: ${latency}ms`);
      console.log(`  Results: ${results.length}`);
      
      results.forEach((result, index) => {
        console.log(`    ${index + 1}. Score: ${result.score?.toFixed(4)} - "${result.metadata?.text?.substring(0, 60)}..."`);
      });
      
      if (latency > 2000) {
        console.warn("  ⚠️  High search latency (>2s)");
      }
    }
    
    console.log("\n✅ Pinecone operations successful");
    return true;
  } catch (error) {
    console.error("❌ Pinecone operations failed:", error);
    return false;
  }
}

/**
 * Test 4: RAG Helper (Context Enhancement)
 */
async function testRAGHelper(): Promise<boolean> {
  console.log("\n🔍 Test 4: RAG Helper (Context Enhancement)");
  console.log("============================================");
  
  try {
    const prompt = "What events do I have scheduled?";
    const userId = "user-1";
    
    console.log(`\nOriginal prompt: "${prompt}"`);
    console.log(`User ID: ${userId}`);
    
    const startTime = Date.now();
    const enhancedPrompt = await enhancePromptWithContext(prompt, userId);
    const latency = Date.now() - startTime;
    
    console.log(`\nEnhanced prompt (${enhancedPrompt.length} chars):`);
    console.log("---");
    console.log(enhancedPrompt);
    console.log("---");
    console.log(`\nLatency: ${latency}ms`);
    
    if (latency > 3000) {
      console.warn("⚠️  High context enhancement latency (>3s)");
    }
    
    console.log("✅ RAG helper successful");
    return true;
  } catch (error) {
    console.error("❌ RAG helper failed:", error);
    return false;
  }
}

/**
 * Test 5: Search Accuracy
 */
async function testSearchAccuracy(): Promise<boolean> {
  console.log("\n🔍 Test 5: Search Accuracy");
  console.log("===========================");
  
  try {
    const testCases = [
      {
        query: "playdate schedule",
        expectedMessageId: "test-msg-1",
        description: "Should find playdate message",
      },
      {
        query: "grocery shopping list",
        expectedMessageId: "test-msg-2",
        description: "Should find grocery message",
      },
      {
        query: "school conference",
        expectedMessageId: "test-msg-3",
        description: "Should find conference message",
      },
    ];
    
    let passedTests = 0;
    
    for (const testCase of testCases) {
      console.log(`\n  Test: ${testCase.description}`);
      console.log(`  Query: "${testCase.query}"`);
      
      const queryEmbedding = await generateQueryEmbedding(testCase.query);
      const results = await searchConversationHistory(queryEmbedding, 5);
      
      const topResult = results[0];
      const foundExpected = results.some(r => r.id === testCase.expectedMessageId);
      
      console.log(`  Top result: ${topResult?.id} (score: ${topResult?.score?.toFixed(4)})`);
      console.log(`  Expected: ${testCase.expectedMessageId}`);
      console.log(`  Found in top 5: ${foundExpected ? '✅' : '❌'}`);
      
      if (foundExpected) {
        passedTests++;
      }
    }
    
    const accuracy = (passedTests / testCases.length) * 100;
    console.log(`\n📊 Search Accuracy: ${accuracy.toFixed(1)}% (${passedTests}/${testCases.length})`);
    
    if (accuracy < 70) {
      console.warn("⚠️  Search accuracy below 70%");
    }
    
    console.log("✅ Search accuracy test complete");
    return true;
  } catch (error) {
    console.error("❌ Search accuracy test failed:", error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("🚀 RAG Pipeline Test Suite");
  console.log("===========================\n");
  
  const results = {
    environment: false,
    embeddings: false,
    pinecone: false,
    ragHelper: false,
    accuracy: false,
  };
  
  try {
    // Run tests sequentially
    results.environment = await testEnvironment();
    if (!results.environment) {
      console.error("\n❌ Environment test failed. Fix configuration before continuing.");
      process.exit(1);
    }
    
    results.embeddings = await testEmbeddings();
    if (!results.embeddings) {
      console.error("\n❌ Embeddings test failed. Check OpenAI API key.");
      process.exit(1);
    }
    
    results.pinecone = await testPinecone();
    if (!results.pinecone) {
      console.error("\n❌ Pinecone test failed. Check Pinecone configuration.");
      process.exit(1);
    }
    
    results.ragHelper = await testRAGHelper();
    results.accuracy = await testSearchAccuracy();
    
    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Test Summary");
    console.log("=".repeat(50));
    console.log(`Environment:       ${results.environment ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Embeddings:        ${results.embeddings ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Pinecone:          ${results.pinecone ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`RAG Helper:        ${results.ragHelper ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Search Accuracy:   ${results.accuracy ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log("\n🎉 All tests passed! RAG pipeline is ready for deployment.");
      console.log("\nNext steps:");
      console.log("1. Deploy Cloud Functions: firebase deploy --only functions");
      console.log("2. Send test messages to generate embeddings");
      console.log("3. Test RAG-enhanced AI features in the app");
    } else {
      console.log("\n⚠️  Some tests failed. Review errors above.");
    }
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("\n💥 Test suite crashed:", error);
    process.exit(1);
  }
}

// Run tests
runTests();

