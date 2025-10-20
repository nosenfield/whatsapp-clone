# Project Glossary

> **Purpose**: This glossary standardizes terminology used in development discussions, particularly for UX/UI concepts. The AI assistant maintains this document automatically based on conversations and should reference it to align with the user's preferred terminology.

## Instructions for AI Assistant

When working with this project:
1. **Reference this glossary** when discussing UX/UI concepts to use consistent terminology
2. **Update this glossary** when the user introduces new terms or corrects terminology
3. **Ask for clarification** when encountering ambiguous UI/UX terms that aren't defined here
4. **Maintain alphabetical order** within each section
5. **Include context** about when and how terms are used

---

## UX/UI Terminology

### Layout & Structure

**Chat Container**
- The main scrollable area displaying message history
- Includes all messages, dates, and system notifications
- Usage: "The chat container should have smooth scroll performance"

**Message Bubble**
- Individual message component with background, text, and metadata
- Variants: sent (outgoing), received (incoming)
- Usage: "Adjust the message bubble padding for better text readability"

**Tab Bar**
- Bottom navigation component with icons and labels
- Contains: Chats, Calls, etc.
- Usage: "The tab bar should remain fixed at the bottom"

### Components & Elements

**Avatar**
- Circular profile image or placeholder
- Sizes: small (32px), medium (48px), large (80px)
- Usage: "Show the contact's avatar in the chat header"

**Badge**
- Small notification indicator showing count
- Typically appears on tabs or icons
- Usage: "Display an unread badge on the Chats tab"

**Header Bar**
- Top navigation area containing title, back button, and actions
- Usage: "The header bar should show the contact name and status"

**Input Field** / **Text Input**
- Text entry component for messages
- Includes: placeholder, clear button, multiline support
- Usage: "The input field should expand as the user types"

**List Item**
- Reusable row component in scrollable lists
- Contains: avatar, title, subtitle, timestamp, accessories
- Usage: "Each chat list item shows the last message preview"

### Interactions & States

**Active State**
- Visual indication that an element is currently selected/pressed
- Usage: "Apply active state styling when the user taps a chat"

**Disabled State**
- Non-interactive state for unavailable actions
- Usage: "Show the send button in disabled state when input is empty"

**Loading State**
- Temporary visual indicator during async operations
- Variants: spinner, skeleton, shimmer
- Usage: "Display a loading state while fetching messages"

**Pressed State** / **Press State**
- Momentary visual feedback during touch interaction
- Usage: "Add a subtle pressed state to improve tap feedback"

### Navigation & Flow

**Back Navigation**
- Action to return to previous screen
- Trigger: back button, swipe gesture
- Usage: "Implement back navigation from chat to chat list"

**Modal**
- Overlay screen presented above current context
- Dismissal: tap outside, swipe down, close button
- Usage: "Present the contact info as a modal"

**Screen** / **View**
- Full-page interface in the navigation stack
- Examples: ChatListScreen, ChatScreen, SettingsScreen
- Usage: "Navigate to the chat screen when a conversation is tapped"

**Stack Navigator**
- Navigation pattern where screens stack on top of each other
- Usage: "Use a stack navigator for the chat flow"

### Visual Design

**Accent Color**
- Primary brand color used for highlights and CTAs
- Usage: "Use the accent color for the send button"

**Contrast**
- Visual distinction between elements
- Usage: "Ensure sufficient contrast between text and background"

**Spacing** / **Padding** / **Margin**
- Whitespace around and between elements
- Usage: "Add consistent spacing between message bubbles"

**Typography**
- Text styling including font, size, weight, color
- Hierarchy: title, body, caption, label
- Usage: "Use body typography for message content"

### Patterns & Behaviors

**Pull to Refresh**
- Gesture-based action to reload content
- Usage: "Add pull to refresh on the chat list"

**Scroll to Bottom**
- Action to jump to the most recent content
- Usage: "Provide scroll to bottom when new messages arrive"

**Swipe Actions**
- Horizontal swipe reveals contextual actions
- Usage: "Implement swipe actions for delete and archive"

---

## Project-Specific Terms

### Features

**Chat List**
- Main screen showing all conversations
- Sorted by most recent activity
- Usage: "The chat list should show pinned chats at the top"

**Message Thread** / **Conversation**
- Sequence of messages between users
- Usage: "Load the entire message thread when opening a chat"

### Data & State

**Unread Count**
- Number of messages not yet viewed
- Displayed as badge or indicator
- Usage: "Update the unread count when new messages arrive"

**Message Status**
- Delivery/read state of sent messages
- States: sending, sent, delivered, read
- Usage: "Show message status with checkmarks"

---

## Maintenance Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-20 | Initial glossary created | Standardize UX/UI terminology |

---

## Notes for AI Assistant

- When the user uses a term not in this glossary, add it with their definition
- If the user corrects terminology, update the existing entry and note the change
- Group related terms together for easy reference
- Include examples of usage to clarify context
- Keep definitions concise but specific to this project
