# Migration Plan: .cursorrules → .cursor/rules/

**Created:** October 20, 2025  
**Purpose:** Plan for migrating from legacy `.cursorrules` to modern `.cursor/rules/*.mdc` structure

---

## Overview

This migration plan outlines how to transition from the single `.cursorrules` file to Cursor's modern rules system using `.mdc` files in the `.cursor/rules/` directory.

---

## Why Migrate?

### Benefits of Modern System
1. **Better Organization**: Rules can be split into logical files
2. **Scope Control**: Use globs to apply rules to specific files
3. **Rule Composition**: Reference other rules with `@file` syntax
4. **Version Control**: Rules travel with the codebase
5. **Future-Proof**: Cursor is deprecating `.cursorrules` eventually
6. **Memory Bank Integration**: Aligns with memory bank philosophy

### Current Limitation
- `.cursorrules` is a single, large file (can become unwieldy)
- No way to scope rules to specific file patterns
- No composition or modularity

---

## Migration Strategy

### Phase 1: Create Directory Structure ✅
Create `.cursor/rules/` with organized subdirectories

### Phase 2: Extract Core Rules
Convert `.cursorrules` content into modular `.mdc` files

### Phase 3: Update Reference System
Modify `.cursorrules` to reference new rules

### Phase 4: Test & Validate
Ensure rules work as expected

### Phase 5: Document
Update documentation to reflect new structure

---

## Proposed File Structure

```
.cursor/rules/
├── README.md                      # Overview of rules system
├── base.mdc                       # Core development principles
├── workflow.mdc                   # Workflow & process rules
├── code-standards.mdc             # TypeScript, code quality
├── documentation.mdc              # Context summary rules
├── firebase.mdc                   # Firebase-specific patterns
├── react-native.mdc               # React Native patterns
└── testing.mdc                    # Testing guidelines
```

---

## Content Mapping

### From `.cursorrules` to `.mdc` Files

| Current Section | Target File | Description |
|----------------|-------------|-------------|
| 🎯 MOST IMPORTANT RULE | `base.mdc` | Top-level instruction to read memory bank |
| Core Principles | `base.mdc` | Fundamental development principles |
| Project Context Documents | `base.mdc` | References to documentation |
| Development Workflow | `workflow.mdc` | Ask before acting, check-ins, commits |
| Code Quality Standards | `code-standards.mdc` | TypeScript, file org, style, performance |
| Testing & QA | `testing.mdc` | Testing requirements |
| Error Handling | `workflow.mdc` | Error handling patterns |
| Scope Management | `workflow.mdc` | Focus and scope control |
| Communication Guidelines | `workflow.mdc` | Status indicators, style |
| Special Situations | `workflow.mdc` | Stuck, refactoring, performance |
| Session Management | `workflow.mdc` | Session start/end procedures |
| Priority Hierarchy | `base.mdc` | Decision framework |

---

## Detailed Migration Plan

### Step 1: Create Base Rules (`base.mdc`)

**Purpose**: Core principles that apply everywhere

**Content**:
- Project overview and context
- Memory bank reading instructions
- Core development principles
- Priority hierarchy
- Links to key documentation

**Globs**: `**/*` (applies to all files)

---

### Step 2: Create Workflow Rules (`workflow.mdc`)

**Purpose**: Development process and collaboration

**Content**:
- Ask before acting guidelines
- Task completion check-ins
- Git commit approval process
- Error handling protocols
- Session management
- Communication guidelines
- Special situations (stuck, refactoring, etc.)

**Globs**: `**/*` (applies to all files)

---

### Step 3: Create Code Standards (`code-standards.mdc`)

**Purpose**: Code quality and TypeScript standards

**Content**:
- TypeScript strict mode requirements
- File organization patterns
- Code style guidelines
- Performance considerations
- Naming conventions

**Globs**: 
- `mobile/src/**/*.ts`
- `mobile/src/**/*.tsx`
- `mobile/app/**/*.tsx`
- `functions/src/**/*.ts`

---

### Step 4: Create Documentation Rules (`documentation.mdc`)

**Purpose**: Context documentation requirements

**Content**:
- Context summary templates
- When to create summaries
- Session summary guidelines
- Memory bank update triggers

**Globs**: 
- `context-summaries/**/*.md`
- `memory-bank/**/*.md`

---

### Step 5: Create Firebase Rules (`firebase.mdc`)

**Purpose**: Firebase-specific patterns and best practices

**Content**:
- Service layer patterns
- Security rules guidelines
- Firestore query optimization
- RTDB best practices
- Cloud Functions patterns

**Globs**:
- `mobile/src/services/firebase-*.ts`
- `functions/src/**/*.ts`
- `*.rules`
- `firestore.rules`
- `database.rules.json`

---

### Step 6: Create React Native Rules (`react-native.mdc`)

**Purpose**: React Native and mobile-specific patterns

**Content**:
- Component patterns
- State management guidelines
- Performance optimization
- Expo Router patterns
- Mobile-specific considerations

**Globs**:
- `mobile/app/**/*.tsx`
- `mobile/src/components/**/*.tsx`
- `mobile/src/hooks/**/*.ts`

---

### Step 7: Create Testing Rules (`testing.mdc`)

**Purpose**: Testing standards and requirements

**Content**:
- Testing requirements before task completion
- Manual testing procedures
- Integration testing guidelines
- Test account usage

**Globs**:
- `**/*.test.ts`
- `**/*.test.tsx`
- `**/*.spec.ts`

---

## Implementation Steps

### Phase 1: Setup (This Session)
```bash
# Create directory structure
mkdir -p .cursor/rules

# Create README
touch .cursor/rules/README.md
```

### Phase 2: Create Files (This Session)
- Create all 7 `.mdc` files with appropriate content
- Extract and reorganize content from `.cursorrules`
- Add glob patterns to each file

### Phase 3: Update `.cursorrules` (This Session)
- Keep `.cursorrules` as main entry point
- Add references to new `.mdc` files
- Simplify to orchestrator role

### Phase 4: Test (Next Session)
- Verify rules are being applied
- Test with example tasks
- Adjust globs and content as needed

### Phase 5: Document (Next Session)
- Update `memory-bank/techContext.md`
- Document rule organization
- Add examples of when rules apply

---

## .cursorrules Role After Migration

The `.cursorrules` file will become a **lightweight orchestrator** that:

1. **References the memory bank** (most important instruction)
2. **Points to `.cursor/rules/` for details**
3. **Provides quick reference table**
4. **Maintains backward compatibility**

### Proposed New `.cursorrules` Structure:

```markdown
# AI Development Rules for Cursor IDE

## 🎯 CRITICAL - Read This First

**Before doing ANYTHING else:**

1. Read `memory-bank/activeContext.md` (current work focus)
2. Read `memory-bank/progress.md` (what's done/what's next)
3. Reference `_docs/README.md` if confused about project structure

## Rule Organization

This project uses Cursor's modern rules system. Detailed rules are in:

- `.cursor/rules/base.mdc` - Core principles & project context
- `.cursor/rules/workflow.mdc` - Development workflow & process
- `.cursor/rules/code-standards.mdc` - TypeScript & code quality
- `.cursor/rules/firebase.mdc` - Firebase patterns
- `.cursor/rules/react-native.mdc` - Mobile development patterns
- `.cursor/rules/testing.mdc` - Testing requirements
- `.cursor/rules/documentation.mdc` - Context documentation

## Quick Reference

[Condensed version of key rules...]
```

---

## Glob Pattern Reference

### Commonly Used Patterns

```
**/*                           # All files
**/*.ts                        # All TypeScript files
**/*.tsx                       # All TypeScript React files
mobile/src/services/**/*.ts    # All service files
mobile/app/**/*.tsx            # All app routes
functions/src/**/*.ts          # All cloud functions
*.rules                        # All Firebase rules files
context-summaries/**/*.md      # All context summaries
memory-bank/**/*.md            # All memory bank files
```

### Pattern Priority
When multiple rules apply to a file:
1. Most specific glob wins
2. Rules are merged (not overridden)
3. Later rules can add to earlier ones

---

## File References with @file

Example of using `@file` to compose rules:

```
# In react-native.mdc
@base.mdc
Description: React Native component patterns
Globs: mobile/src/components/**/*.tsx

[React Native specific rules...]
```

This includes all rules from `base.mdc` plus the React Native specific rules.

---

## Testing the Migration

### Verification Checklist
- [ ] All `.mdc` files created
- [ ] Glob patterns correctly target intended files
- [ ] Rules don't conflict or contradict
- [ ] Memory bank references work
- [ ] AI follows rules when editing files
- [ ] No important content lost from original `.cursorrules`

### Test Scenarios
1. Edit a component file - should apply base + workflow + code-standards + react-native
2. Edit a service file - should apply base + workflow + code-standards + firebase
3. Create context summary - should apply documentation rules
4. Commit changes - should ask for approval (workflow rule)

---

## Rollback Plan

If migration causes issues:

1. **Immediate**: Revert to original `.cursorrules`
2. **Keep** `.cursor/rules/` but don't reference from `.cursorrules`
3. **Iterate**: Fix issues in `.mdc` files
4. **Retry**: Re-enable once issues resolved

The original `.cursorrules` content will be preserved, so rollback is safe.

---

## Success Criteria

Migration is successful when:
- ✅ All rules from `.cursorrules` preserved in `.mdc` files
- ✅ Rules properly scoped with globs
- ✅ AI follows rules when working on files
- ✅ No loss of functionality
- ✅ Better organization and maintainability
- ✅ Memory bank integration working

---

## Timeline

- **Today**: Create structure, extract content, test
- **Next Session**: Validate rules work, adjust as needed
- **Week 2**: Full adoption, deprecate legacy `.cursorrules` (keep as reference)

---

## Notes & Considerations

### Content Distribution Guidelines
- **base.mdc**: Principles that never change
- **workflow.mdc**: Process rules that apply to all tasks
- **code-standards.mdc**: Technical standards
- **Specialized files**: Domain-specific patterns

### Avoiding Duplication
- Don't repeat content across files
- Use `@file` to include shared rules
- Keep each file focused on its domain

### Maintenance
- Update rules as project evolves
- Document pattern changes in context summaries
- Review rules quarterly for relevance

---

This migration plan provides a clear path to modern rule organization while maintaining all existing functionality.
