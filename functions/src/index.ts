/**
 * Firebase Cloud Functions
 *
 * Main entry point for all Cloud Functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1", // Match your Firebase region
});

// Export all Cloud Functions from their respective modules
export {sendMessageNotification} from "./notifications";
export {generateMessageEmbedding} from "./embeddings";
export {processAICommand} from "./ai-commands";

// Export Parent-Caregiver AI features
export {extractCalendarEvents} from "./features/calendar-extraction";

// Export Enhanced AI Command Processor
export {processEnhancedAICommand} from "./enhanced-ai-processor";