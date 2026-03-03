# LESSONS.md — Build Lessons

- **OpenAI model**: Use `gpt-4o-mini`, not `gpt-4`. Legacy model hits 429 quota errors even with credits.
- **Worktree deploys**: Always `firebase deploy` from the worktree dir, not the main repo root. Otherwise old code gets deployed.
- **Worktree functions deps**: Run `npm install` in `functions/` before first deploy from a worktree — `node_modules` aren't shared.
- **CLAUDE.md updates**: Always update status + document fixes in CLAUDE.md as part of the commit, not as an afterthought.
- **Dev server from wrong directory**: Always verify `npx vite` runs from the main repo (`/Users/mghias/Desktop/haulerapp/`), NOT from a worktree. Old worktree servers silently serve stale code — hard refresh won't fix it because the files on disk are old. Check with `ps -p $(lsof -i :5173 -sTCP:LISTEN -t) -o command=`.
- **React hooks violation (white screen fix)**: In admin pages (`AdminDashboard.jsx`, `CreateBriefingPage.jsx`), the auth redirect (`if (!user) return <Navigate>`) must come AFTER all hooks (`useState`, `useEffect`). Putting a conditional return before hooks violates React's rules of hooks and causes a white screen. Always: hooks first → conditional returns after.
- **Stale deployed site (auth/invalid-api-key)**: If user sees `auth/invalid-api-key` error, they're on the Firebase Hosting URL (stale deploy), not localhost. Always test on `localhost:5173`.
- **Cloud Function deploy timing**: After `firebase deploy`, old function instances may still serve old code for a few minutes. Always create a NEW test after deploy to hit the updated code. Verify by checking logs for the expected new log message.
