/**
 * AI Tools Registry
 *
 * Registers all available AI tools and provides a centralized way to access them.
 */

import {AIToolRegistry} from "./ai-tool-interface";
import {ResolveConversationTool} from "./resolve-conversation-tool";
import {GetConversationsTool} from "./get-conversations-tool";
import {GetMessagesTool} from "./get-messages-tool";
import {LookupContactsTool} from "./lookup-contacts-tool";
import {SendMessageTool} from "./send-message-tool";
import {GetConversationInfoTool} from "./get-conversation-info-tool";
import {SummarizeConversationTool} from "./summarize-conversation-tool";
import {AnalyzeConversationTool} from "./analyze-conversation-tool";

// Create and configure the tool registry
export function initializeToolRegistry(): AIToolRegistry {
  const registry = new AIToolRegistry();

  // Register all tools
  registry.register(new ResolveConversationTool());
  registry.register(new GetConversationsTool());
  registry.register(new GetMessagesTool());
  registry.register(new LookupContactsTool());
  registry.register(new SendMessageTool());
  registry.register(new GetConversationInfoTool());
  registry.register(new SummarizeConversationTool());
  registry.register(new AnalyzeConversationTool());

  return registry;
}

// Export singleton registry instance
export const toolRegistry = initializeToolRegistry();
