# CLAUDE.md — Dufferin Safety Briefing App

This file contains Claude's workflow rules for this project.

---

## Token Optimization (CRITICAL)

### Files to read at session start (MANDATORY):
- `LESSONS.md` — past fixes and gotchas. READ FIRST to avoid repeating mistakes.
- `APP_DEFINITION.md` — technical reference (schema, design decisions, stack)
- `HOW_WE_BUILD_IT.md` — build steps + what's done/remaining

### MCP — Firebase only:
- All other MCP servers (Serena, Morph, Playwright, Claude in Chrome, Claude Preview) must NOT be used.
- Do NOT spawn subagents (Explore, Plan, Audit). Do all work inline.

---

## Lessons File

Always update `LESSONS.md` with important lessons or solutions that solved problems during the build. Read it before starting work to avoid repeating past mistakes.

---

## Step Completion Order (CRITICAL)

1. Build code → run `npm run build` to validate
2. Deploy if needed (e.g., `firebase deploy --only functions`)
3. **User tests** — tell the user what to test and WAIT for confirmation
4. Only after user confirms success → commit to git

**NEVER commit before the user has tested and confirmed.** No exceptions.

---

## Plan File

Keep the plan file lean — current step only.
After a step is committed, overwrite with the next step's plan.

---

## Current Status

Step 0.1 ✅ Step 0.2 ✅ Step 0.3 ✅ Step 0.4 ✅ Step 0.5 ✅ Step 0.6 ✅
Step 1.1 ✅ Step 1.2 ✅ (+ Hindi ✅) Step 1.3 ✅ Step 1.4 ✅ Step 1.5 ✅ Step 1.6 ✅
Section 1 COMPLETE — Step 2.1 ✅ Step 2.2 ✅ Step 2.3 ✅ Step 2.4 ✅ — Section 2 COMPLETE
Step 3.1 ✅ Step 3.2 ✅ Step 3.3 ✅ Step 3.4 ✅ — Section 3 COMPLETE
Step 4.1 ✅ Step 4.2 ✅ — Section 4 COMPLETE
Section 5 🔄 (next: 5.1)
