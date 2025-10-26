/**
 * Test conversation summarization
 */

async function testSummarizeConversation() {
  console.log('🔍 Testing conversation summarization...');
  
  try {
    const response = await fetch('https://us-central1-whatsapp-clone-dev-82913.cloudfunctions.net/processEnhancedAICommand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          command: "Summarize this conversation",
          appContext: {
            currentScreen: "conversation",
            currentConversationId: "S65lnm9NZvYEmXNUyMXj",
            currentUserId: "aIUPPpAlhjPaQQ7oZ8kglN4Y95L2",
            recentConversations: [],
            deviceInfo: {
              platform: "ios",
              version: "1.0.0"
            }
          },
          currentUserId: "aIUPPpAlhjPaQQ7oZ8kglN4Y95L2",
          enableToolChaining: true,
          maxChainLength: 5
        }
      }),
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result.result?.success);
      console.log('🎯 Action:', result.result?.action);
      console.log('💬 Response:', result.result?.response);
      console.log('🔗 Tool chain:', result.result?.toolChain?.toolsUsed);
      console.log('📊 Full result:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testSummarizeConversation();
