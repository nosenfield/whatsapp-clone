/**
 * Firebase Cloud Functions
 *
 * Main entry point for all Cloud Functions
 */

import {setGlobalOptions} from "firebase-functions/v2/options";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({
  region: "us-central1",
  memory: "512MiB",
  timeoutSeconds: 120,
  secrets: [
    "OPENAI_API_KEY",
    "LANGSMITH_API_KEY", 
    "PINECONE_API_KEY"
  ],
});

// Export all Cloud Functions from their respective modules
export {sendMessageNotification} from "./notifications";
export {generateMessageEmbedding} from "./embeddings";

// Export Parent-Caregiver AI features
export {extractCalendarEvents} from "./features/calendar-extraction";

// Export Enhanced AI Command Processor
export {processEnhancedAICommand} from "./enhanced-ai-processor";