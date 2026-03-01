# LESSONS.md — Build Lessons

- **OpenAI model**: Use `gpt-4o-mini`, not `gpt-4`. Legacy model hits 429 quota errors even with credits.
- **Worktree deploys**: Always `firebase deploy` from the worktree dir, not the main repo root. Otherwise old code gets deployed.
- **Worktree functions deps**: Run `npm install` in `functions/` before first deploy from a worktree — `node_modules` aren't shared.
- **CLAUDE.md updates**: Always update status + document fixes in CLAUDE.md as part of the commit, not as an afterthought.
