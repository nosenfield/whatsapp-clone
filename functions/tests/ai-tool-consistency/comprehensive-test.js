/**
 * Comprehensive Test Suite for AI Tool Consistency
 */

async function testScenario(command, expectedBehavior) {
  console.log(`\n🧪 Testing: "${command}"`);
  console.log(`🎯 Expected: ${expectedBehavior}`);
  
  try {
    const response = await fetch('https://us-central1-whatsapp-clone-dev-82913.cloudfunctions.net/processEnhancedAICommand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          command: command,
          appContext: {
            currentUserId: "test-user-123",
            currentScreen: "chats",
            currentConversationId: null,
            recentConversations: [],
            deviceInfo: {
              platform: "ios",
              version: "1.0.0"
            }
          },
          currentUserId: "test-user-123",
          enableToolChaining: true,
          maxChainLength: 5
        }
      })
    });

    const result = await response.json();
    const toolResult = result.result;
    
    console.log(`✅ Success: ${toolResult.success}`);
    console.log(`🎯 Action: ${toolResult.action}`);
    console.log(`🔧 Tools used: ${toolResult.toolChain?.toolsUsed.join(' → ') || 'None'}`);
    console.log(`❓ Clarification needed: ${toolResult.requires_clarification ? 'Yes' : 'No'}`);
    
    if (toolResult.requires_clarification) {
      console.log(`📋 Clarification question: ${toolResult.clarification_data?.question}`);
      console.log(`📊 Options count: ${toolResult.clarification_data?.options?.length || 0}`);
    }
    
    return {
      success: toolResult.success,
      action: toolResult.action,
      toolsUsed: toolResult.toolChain?.toolsUsed || [],
      requiresClarification: toolResult.requires_clarification,
      clarificationData: toolResult.clarification_data
    };
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTests() {
  console.log("🚀 Running Comprehensive AI Tool Consistency Tests");
  console.log("=" .repeat(70));
  
  const testCases = [
    {
      command: "Tell John I'm running late",
      expected: "Should stop at lookup_contacts and request clarification",
      shouldClarify: true
    },
    {
      command: "Tell George hello", 
      expected: "Should stop at lookup_contacts and request clarification (multiple Georges)",
      shouldClarify: true
    },
    {
      command: "Tell Zorgblort hello",
      expected: "Should return error - no contacts found",
      shouldClarify: false
    },
    {
      command: "Show me my conversations",
      expected: "Should execute get_conversations successfully",
      shouldClarify: false
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testScenario(testCase.command, testCase.expected);
    results.push({
      ...testCase,
      actualResult: result
    });
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Analysis
  console.log("\n" + "=".repeat(70));
  console.log("📊 COMPREHENSIVE TEST RESULTS");
  console.log("=".repeat(70));
  
  const clarificationTests = results.filter(r => r.shouldClarify);
  const clarificationSuccess = clarificationTests.filter(r => r.actualResult.requiresClarification).length;
  
  const nonClarificationTests = results.filter(r => !r.shouldClarify);
  const nonClarificationSuccess = nonClarificationTests.filter(r => !r.actualResult.requiresClarification).length;
  
  console.log(`✅ Clarification scenarios: ${clarificationSuccess}/${clarificationTests.length} correct`);
  console.log(`✅ Non-clarification scenarios: ${nonClarificationSuccess}/${nonClarificationTests.length} correct`);
  console.log(`📈 Overall success rate: ${Math.round(((clarificationSuccess + nonClarificationSuccess) / results.length) * 100)}%`);
  
  // Success criteria from analysis
  console.log("\n🎯 SUCCESS CRITERIA VALIDATION:");
  console.log(`- Clarification flow success rate: Target >95% (Current: ${Math.round((clarificationSuccess / clarificationTests.length) * 100)}%)`);
  console.log(`- Wrong tool calls after clarification: Target <1% (Current: ${results.filter(r => r.shouldClarify && r.actualResult.toolsUsed.length > 1).length})`);
  
  return results;
}

runComprehensiveTests().catch(console.error);
