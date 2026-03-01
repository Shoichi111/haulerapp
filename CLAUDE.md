# CLAUDE.md — Dufferin Safety Briefing App

This file contains Claude's workflow rules for this project.

---

## Token Optimization (CRITICAL)

### Reference files (trimmed for token efficiency — always read at session start):
- `APP_DEFINITION.md` — technical reference (schema, design decisions, stack)
- `HOW_WE_BUILD_IT.md` — build steps + what's done/remaining

### MCP — Firebase only:
- All other MCP servers (Serena, Morph, Playwright, Claude in Chrome, Claude Preview) must NOT be used.
- Do NOT spawn subagents (Explore, Plan, Audit). Do all work inline.

---

## Post-Step Audit (inline only)

Quick inline self-review of changed files before committing. No subagent.
Build check (`npm run build`) is the primary validation.

---

## Plan File

Keep the plan file lean — current step only.
After a step is committed, overwrite with the next step's plan.

---

## Current Status

Step 0.1 ✅ Step 0.2 ✅ Step 0.3 ✅ Step 0.4 ✅ Step 0.5 ✅ Step 0.6 ✅
Step 1.1 ✅ Step 1.2 ✅ (+ Hindi ✅) Step 1.3 ✅ Step 1.4 ✅ Step 1.5 ✅ Step 1.6 ✅
Section 1 COMPLETE — Step 2.1 ✅ Step 2.2 ✅ Step 2.3 ✅ Step 2.4 ✅ — Section 2 COMPLETE
Step 3.1 ✅ Step 3.2 ✅ Step 3.3 ✅ — Section 3 🔄 (next: 3.4)
