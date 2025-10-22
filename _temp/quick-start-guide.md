# Quick Start Guide: Using the Memory Bank + Rules System

**For:** AI Assistants and Developers  
**Created:** October 20, 2025

---

## For AI Assistants

### Every Session Start - Do This FIRST:

```
1. Read memory-bank/activeContext.md
   → Tells you: What we're working on NOW, current decisions, next steps
   
2. Read memory-bank/progress.md
   → Tells you: What's done, what's next, current phase status
   
3. If confused: Read _docs/README.md
   → Tells you: Project overview and structure
```

**That's it!** These 3 files are your source of truth.

---

## Quick Decision Tree

```
Starting work?
  → Read memory bank files (above)

Unclear what to do?
  → ASK (don't guess)

Finished a task?
  → CHECK IN (don't proceed)

Ready to commit?
  → ASK FOR APPROVAL (don't commit)

Made important decisions?
  → DOCUMENT in context summary

Discovered new patterns?
  → Note for .cursor/rules/ update
```

---

## File Quick Reference

### Memory Bank (Read These Often)
- `activeContext.md` - **Current work** (read every session)
- `progress.md` - **What's done/next** (read every session)
- `projectbrief.md` - **Core constraints** (reference when needed)
- `systemPatterns.md` - **How to implement** (reference when coding)
- `techContext.md` - **Tech details** (reference when setting up)
- `productContext.md` - **Why we're building** (reference for context)

### Documentation (Deep Dives)
- `_docs/README.md` - Project overview
- `_docs/architecture.md` - System architecture
- `_docs/task-list.md` - Detailed tasks

### Rules (Apply Automatically)
- `.cursorrules` - Main entry point, quick reference
- `.cursor/rules/*.mdc` - Domain-specific rules (auto-apply by file type)

---

## Common Workflows

### Starting a New Task

```
1. Check memory-bank/activeContext.md for current focus
2. Find task details in _docs/task-list.md
3. Ask if anything is unclear
4. Implement following established patterns
5. Test thoroughly
6. Check in when complete
```

### Making Technical Decisions

```
1. Check memory-bank/systemPatterns.md for existing patterns
2. Check _docs/architecture.md for architectural context
3. If new pattern, ask user for approval
4. Document decision in context summary
5. Note for potential .cursor/rules/ update
```

### Completing a Task

```
1. Test everything works
2. Check TypeScript errors and warnings
3. Create context summary in context-summaries/
4. Check in with user using ✅ format
5. WAIT for approval
6. ASK about committing (never auto-commit)
7. Update memory-bank/activeContext.md if needed
```

---

## Status Indicator Cheat Sheet

Copy-paste these into your responses:

```
⚠️ CLARIFICATION NEEDED - When uncertain
✅ TASK COMPLETED - After finishing task
📝 READY TO COMMIT - Asking for commit approval
🚨 ERROR ENCOUNTERED - When errors occur
💡 IMPROVEMENT OPPORTUNITY - Suggesting enhancements
🤔 NEED HELP - When stuck after 2-3 attempts
⚡ PERFORMANCE CONCERN - Performance issues
🔄 REFACTORING OPPORTUNITY - Code improvements
🔒 SECURITY CONCERN - Security issues
```

---

## What to Read When

### Always Read (Every Session Start)
- `memory-bank/activeContext.md`
- `memory-bank/progress.md`

### Read When Confused About...
- **Project structure**: `_docs/README.md`
- **Why decisions were made**: `_docs/architecture.md`
- **What task to do**: `_docs/task-list.md`
- **How to implement**: `memory-bank/systemPatterns.md`
- **Tech setup**: `memory-bank/techContext.md`
- **Project goals**: `memory-bank/projectbrief.md`
- **User needs**: `memory-bank/productContext.md`

### Rules (Auto-Apply)
You don't need to manually read `.cursor/rules/*.mdc` files - they automatically apply based on which files you're editing!

---

## Key Principles (Never Forget)

1. **ASK when uncertain** - Better to ask than assume
2. **CHECK IN after tasks** - Never proceed without approval
3. **NEVER auto-commit** - Always ask for permission
4. **DOCUMENT everything** - Context summaries are mandatory
5. **Follow TypeScript strict** - No `any` types without reason
6. **Test before completing** - Actually verify it works

---

## For Human Developers

### Starting a Session

Tell the AI assistant:
```
"Let's start working on [task name from task-list.md]"
```

The AI will automatically read the memory bank and get oriented.

### During Development

- AI will ask clarifying questions (good!)
- AI will check in after tasks (good!)
- AI will ask for commit approval (good!)

Just respond with guidance as needed.

### After Tasks

- Review the completion check-in
- Approve next task or make adjustments
- Approve commits when ready
- Context summaries are auto-created

### Updating Memory Bank

Say **"update memory bank"** when:
- Completing a phase
- Making major architectural changes
- Discovering new patterns
- Context needs refresh

AI will review and update all relevant files.

---

## Troubleshooting

### AI Not Reading Memory Bank?
Say: "Please read memory-bank/activeContext.md and progress.md before continuing"

### AI Auto-Committing?
Say: "Stop. Remember: NEVER commit without asking first. This is in .cursorrules."

### AI Skipping Check-Ins?
Say: "Please check in after completing tasks using the ✅ TASK COMPLETED format"

### Confused About Current State?
Say: "Read memory-bank/activeContext.md and tell me what we're currently working on"

### Need to Reset Context?
Say: "Start fresh - read the memory bank files and tell me what phase we're in"

---

## Quick Wins

### ✅ Memory Bank Keeps Context
No more "where were we?" - activeContext.md always knows

### ✅ Rules Auto-Apply
No need to remember all rules - they apply automatically by file type

### ✅ Workflow Enforced
AI must ask, check-in, and get approval - prevents mistakes

### ✅ Everything Documented
Context summaries ensure nothing is lost between sessions

---

## Remember

**The system works best when:**
- Memory bank files stay current (update after major changes)
- AI reads them at session start (enforced by .cursorrules)
- Human provides clear guidance when AI asks
- Both sides follow the workflow

**Success = AI + Human + Memory Bank + Rules working together!**

---

For more details, see:
- `_temp/implementation-summary.md` - What was built
- `_temp/cursor-rules-migration-plan.md` - Migration details
- `.cursor/rules/README.md` - Rules system documentation
