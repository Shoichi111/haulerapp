# CLAUDE.md — Dufferin Safety Briefing App

This file contains Claude's workflow rules for this project.
- **Full technical reference** (schema, security rules, architecture): `APP_DEFINITION.md`
- **28-step build guide** (what to build, current progress): `HOW_WE_BUILD_IT.md`

---

## Plan Mode (mandatory)

Before implementing ANY code change — no matter how small — Claude MUST:
1. Call `EnterPlanMode`
2. Explore the codebase and write the plan to the plan file
3. Call `ExitPlanMode` to present the plan for user approval
4. Wait for explicit user approval before writing a single line of code

This applies to every step, every hotfix, every tweak. No exceptions.
Skipping plan mode is a workflow violation.

---

## Post-Step Audit (mandatory)

After every step's code is written and before the git commit, run an independent AI audit agent.
The agent reviews all files created or modified, checks for bugs, security issues, and deviations from the plan.
No step is committed to Git until the audit returns APPROVED.

---

## Plan File

Keep the plan file lean — current step only. One step at a time.
After a step is committed, overwrite the plan with the next step's plan.
Do NOT accumulate historical plans in the plan file.

---

## Current Status

Step 0.1 ✅ Step 0.2 ✅ Step 0.3 ✅ Step 0.4 ✅ Step 0.5 ✅ Step 0.6 ✅
Step 1.1 ✅ Step 1.2 ✅ (+ Hindi ✅) Step 1.3 ✅ Step 1.4 ✅
Step 1.5 🔄
