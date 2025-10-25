/**
 * Simple Test for AI Tool Consistency
 */

async function testSimpleCommand() {
  console.log("🧪 Testing simple AI command...");
  
  try {
    const response = await fetch('https://us-central1-whatsapp-clone-dev-82913.cloudfunctions.net/processEnhancedAICommand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          command: "Tell John hello",
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

    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response:`, errorText);
      return;
    }

    const result = await response.json();
    console.log(`✅ Success: ${result.success}`);
    console.log(`🎯 Action: ${result.action}`);
    console.log(`💬 Response: ${result.response}`);
    console.log(`📊 Full result:`, JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

testSimpleCommand();
