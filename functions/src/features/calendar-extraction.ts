/**
 * Smart Calendar Extraction Cloud Function
 *
 * Automatically detects dates, times, and events in messages
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {getOpenAIApiKey} from "../services/env-config";

// OpenAI client will be initialized at runtime when needed

/**
 * Extract calendar events from new messages
 *
 * Triggers on: /conversations/{conversationId}/messages/{messageId}
 * When: A new message document is created
 */
export const extractCalendarEvents = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
    secrets: ["OPENAI_API_KEY"]
  },
  async (event) => {
    try {
      const messageId = event.params.messageId;
      const conversationId = event.params.conversationId;

      // Get the message data
      const messageData = event.data?.data();
      if (!messageData) {
        logger.warn("No message data found for calendar extraction", {messageId});
        return;
      }

      // Only process text messages
      if (messageData.content?.type !== "text" || !messageData.content?.text) {
        logger.info("Skipping non-text message for calendar extraction", {messageId});
        return;
      }

      const messageText = messageData.content.text;

      // Pre-filter with temporal keywords
      const hasTemporalKeywords = containsTemporalKeywords(messageText);
      logger.info("Temporal keyword check", {
        messageId,
        messageText: messageText.substring(0, 100),
        hasTemporalKeywords,
      });

      if (!hasTemporalKeywords) {
        logger.info("No temporal keywords found in message", {messageId});
        return;
      }

      logger.info("Extracting calendar events from message", {
        conversationId,
        messageId,
        senderId: messageData.senderId,
        textLength: messageText.length,
      });

      // Extract events using AI
      const extractedEvents = await extractEventsWithAI(messageText, {
        conversationId,
        messageId,
        senderId: messageData.senderId,
        timestamp: messageData.timestamp,
      });

      if (extractedEvents.length === 0) {
        logger.info("No events extracted from message", {messageId});
        return;
      }

      // Save extracted events to Firestore
      for (const event of extractedEvents) {
        await saveExtractedEvent(event);
      }

      logger.info("Successfully extracted calendar events", {
        messageId,
        eventCount: extractedEvents.length,
      });

      return {
        success: true,
        messageId,
        eventCount: extractedEvents.length,
      };
    } catch (error) {
      logger.error("Error extracting calendar events", {error});
      // Don't throw - extraction failure shouldn't break message creation
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Check if message contains temporal keywords
 * @param {string} text Text to check
 * @return {boolean} Whether text should be embedded
 */
function containsTemporalKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Check for explicit temporal keywords
  const temporalKeywords = [
    // Days
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "mon", "tue", "wed", "thu", "fri", "sat", "sun",

    // Time references
    "tomorrow", "today", "yesterday", "next week", "this week", "last week",
    "next month", "this month", "last month", "next year", "this year",

    // Time expressions
    "am", "pm", "morning", "afternoon", "evening", "night",
    "o'clock", "oclock", "sharp", "around", "about",

    // Event keywords
    "meeting", "appointment", "call", "lunch", "dinner", "party", "event",
    "conference", "workshop", "seminar", "presentation", "interview",
    "doctor", "dentist", "haircut", "massage", "spa", "gym", "workout",
    "school", "pickup", "dropoff", "practice", "game", "match", "tournament",
    "birthday", "anniversary", "wedding", "funeral", "celebration",

    // Scheduling words
    "schedule", "book", "reserve", "plan", "arrange", "set up", "organize",
    "remind", "remember", "don't forget", "deadline", "due date",

    // Location indicators
    "restaurant", "cafe", "office", "home", "house", "apartment",
    "hospital", "clinic", "school", "gym", "park", "mall", "store",
  ];

  // Check for temporal keywords
  if (temporalKeywords.some((keyword) => lowerText.includes(keyword))) {
    return true;
  }

  // Check for time patterns (e.g., "at 2", "at 3pm", "at 2:30")
  const timePatterns = [
    /\bat\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?\b/i, // "at 2", "at 3pm", "at 2:30"
    /\b\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?\b/i, // "2pm", "3:30", "2"
    /\b(?:in|on|by)\s+\d+/i, // "in 2 hours", "on 3rd", "by 5"
  ];

  if (timePatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  // Check for activity words combined with "at" or time references
  const activityWords = [
    "get", "go", "meet", "see", "visit", "pickup", "drop", "eat", "drink",
    "pizza", "coffee", "food", "movie", "shopping", "walk", "run", "exercise",
  ];

  const hasActivity = activityWords.some((word) => lowerText.includes(word));
  const hasTimeReference = /\bat\s+\d+/i.test(text) || /\b\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?\b/i.test(text);

  if (hasActivity && hasTimeReference) {
    return true;
  }

  return false;
}

/**
 * Extract events using OpenAI
 * @param {string} messageText Message text to analyze
 * @param {Object} context Context information
 * @return {Promise<Array>} Extracted events
 */
async function extractEventsWithAI(
  messageText: string,
  context: {
    conversationId: string;
    messageId: string;
    senderId: string;
    timestamp: any;
  }
): Promise<any[]> {
  // Initialize OpenAI client at runtime when secrets are available
  let openai: OpenAI | null = null;
  try {
    const openaiApiKey = getOpenAIApiKey();
    openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  } catch (error) {
    logger.warn("OpenAI API key not available for calendar extraction");
    return [];
  }

  logger.info("Starting AI extraction", {
    messageId: context.messageId,
    hasOpenAI: !!openai,
    hasFirebaseConfig: !!openai,
    hasEnvVar: !!openai,
    apiKeySource: openai ? "secret" : "none",
  });

  if (!openai) {
    logger.warn("OpenAI not initialized - skipping calendar extraction", {
      hasAPIKey: false,
    });
    return [];
  }

  try {
    const systemPrompt = `You are an AI assistant that extracts calendar events from text messages. 
Extract all events, dates, times, locations, and participants mentioned in the message.

Rules:
1. Only extract events that have a specific date/time
2. If no specific date is mentioned, don't extract the event
3. Extract both proposed and confirmed events
4. Include all participants mentioned
5. Extract location if mentioned
6. Return as JSON array

Example input: "Let's meet for lunch tomorrow at 12pm at the Italian restaurant downtown"
Example output: [{"title": "Lunch at Italian restaurant", "date": "2024-01-15", "time": "12:00 PM", "location": "Italian restaurant downtown", "participants": [], "status": "proposed"}]

Current date: ${new Date().toISOString().split("T")[0]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: messageText},
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.warn("No content returned from OpenAI for calendar extraction");
      return [];
    }

    // Parse JSON response
    let events: any[] = [];
    try {
      events = JSON.parse(content);
      if (!Array.isArray(events)) {
        events = [events];
      }
    } catch (parseError) {
      logger.error("Error parsing OpenAI response for calendar extraction", {
        error: parseError,
        content,
      });
      return [];
    }

    // Process and validate events
    const processedEvents = events.map((event, index) => ({
      id: `${context.messageId}_event_${index}`,
      conversationId: context.conversationId,
      messageId: context.messageId,
      title: event.title || "Untitled Event",
      date: parseDate(event.date),
      time: event.time || undefined,
      location: event.location || undefined,
      participants: event.participants || [],
      status: event.status || "proposed",
      extractedAt: new Date(),
      extractedBy: "ai-calendar-extraction",
    })).filter((event) => event.date); // Only include events with valid dates

    logger.info("AI extracted events", {
      originalCount: events.length,
      processedCount: processedEvents.length,
    });

    return processedEvents;
  } catch (error) {
    logger.error("Error extracting events with AI", {error});
    return [];
  }
}

/**
 * Parse date string to Date object
 * @param {string} dateString Date string to parse
 * @return {Date|null} Parsed date or null
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  try {
    // Handle relative dates
    const lowerDate = dateString.toLowerCase();
    const today = new Date();

    if (lowerDate.includes("tomorrow")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }

    if (lowerDate.includes("today")) {
      return today;
    }

    if (lowerDate.includes("yesterday")) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return yesterday;
    }

    // Handle "next [day]" patterns
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (const day of days) {
      if (lowerDate.includes(`next ${day}`)) {
        const targetDay = days.indexOf(day);
        const nextDate = new Date(today);
        const currentDay = today.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        nextDate.setDate(today.getDate() + daysUntilTarget);
        return nextDate;
      }
    }

    // Try parsing as ISO date or other formats
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch (error) {
    logger.error("Error parsing date", {error, dateString});
    return null;
  }
}

/**
 * Save extracted event to Firestore
 * @param {Object} event Event to save
 * @return {Promise<void>}
 */
async function saveExtractedEvent(event: any): Promise<void> {
  try {
    await admin.firestore()
      .collection("extractedEvents")
      .doc(event.id)
      .set({
        ...event,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    logger.info("Saved extracted event", {eventId: event.id});
  } catch (error) {
    logger.error("Error saving extracted event", {error, eventId: event.id});
    throw error;
  }
}
