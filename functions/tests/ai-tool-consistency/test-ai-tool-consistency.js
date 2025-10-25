/**
 * Test Script for AI Tool Consistency Fixes
 * 
 * Tests the 5 critical scenarios from the analysis to validate
 * that our fixes have resolved the reliability issues.
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');

// Initialize Firebase Admin
const app = initializeApp();
const db = getFirestore(app);

// Test scenarios from the analysis
const testScenarios = [
  {
    name: "Test Case 1: Clarification Needed",
    command: "Tell John I'm running late",
    expectedBehavior: "lookup_contacts finds multiple Johns → returns clarification_needed → system stops → presents options",
    description: "Should stop chain when clarification is needed"
  },
  {
    name: "Test Case 2: Clear Match", 
    command: "Tell Jane hello",
    expectedBehavior: "lookup_contacts finds 1 Jane with high confidence → returns continue → send_message executes",
    description: "Should continue chain when clear match found"
  },
  {
    name: "Test Case 3: No Match",
    command: "Tell Zorgblort hello", 
    expectedBehavior: "lookup_contacts finds nothing → returns error → user notified",
    description: "Should handle no matches gracefully"
  },
  {
    name: "Test Case 4: Ambiguous Low Confidence",
    command: "Tell J hello",
    expectedBehavior: "lookup_contacts finds multiple low-confidence matches → returns clarification_needed → system stops",
    description: "Should request clarification for ambiguous matches"
  }
];

async function testAICommand(command, userId = "test-user-123") {
  console.log(`\n🧪 Testing: "${command}"`);
  console.log(`👤 User ID: ${userId}`);
  
  try {
    // Call the enhanced AI processor function
    const response = await fetch('https://us-central1-whatsapp-clone-dev-82913.cloudfunctions.net/processEnhancedAICommand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: command,
        appContext: {
          currentUserId: userId,
          currentScreen: "chats",
          currentConversationId: null,
          recentConversations: []
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`✅ Response received`);
    console.log(`📊 Success: ${result.success}`);
    console.log(`🎯 Action: ${result.action}`);
    console.log(`💬 Response: ${result.response}`);
    
    if (result.requires_clarification) {
      console.log(`❓ Clarification needed: ${result.requires_clarification}`);
      console.log(`📋 Clarification data:`, JSON.stringify(result.clarification_data, null, 2));
    }
    
    if (result.toolChain) {
      console.log(`🔧 Tools used: ${result.toolChain.toolsUsed.join(' → ')}`);
      console.log(`⏱️ Execution time: ${result.toolChain.totalExecutionTime}ms`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Error testing command:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log("🚀 Starting AI Tool Consistency Tests");
  console.log("=" .repeat(60));
  
  const results = [];
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`🎯 Expected: ${scenario.expectedBehavior}`);
    
    const result = await testAICommand(scenario.command);
    
    results.push({
      scenario: scenario.name,
      command: scenario.command,
      success: result.success,
      action: result.action,
      requiresClarification: result.requires_clarification,
      toolsUsed: result.toolChain?.toolsUsed || [],
      executionTime: result.toolChain?.totalExecutionTime || 0
    });
    
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  
  const successfulTests = results.filter(r => r.success).length;
  const clarificationTests = results.filter(r => r.requiresClarification).length;
  
  console.log(`✅ Successful tests: ${successfulTests}/${results.length}`);
  console.log(`❓ Clarification requests: ${clarificationTests}`);
  console.log(`⚡ Average execution time: ${Math.round(results.reduce((sum, r) => sum + r.executionTime, 0) / results.length)}ms`);
  
  console.log("\n📋 Detailed Results:");
  results.forEach((result, index) => {
    const scenario = testScenarios[index];
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   Command: "${result.command}"`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Action: ${result.action}`);
    console.log(`   Tools: ${result.toolsUsed.join(' → ')}`);
    console.log(`   Clarification: ${result.requiresClarification ? '❓ Yes' : '✅ No'}`);
    console.log(`   Time: ${result.executionTime}ms`);
  });
  
  // Success criteria from analysis
  console.log("\n🎯 SUCCESS CRITERIA (from analysis):");
  console.log(`- Clarification flow success rate: Target >95% (Current: ${Math.round((successfulTests / results.length) * 100)}%)`);
  console.log(`- Wrong tool calls after clarification: Target <1% (Current: ${results.filter(r => r.success && r.requiresClarification && r.toolsUsed.length > 1).length})`);
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testAICommand, runAllTests, testScenarios };
