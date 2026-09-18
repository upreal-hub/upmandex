<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:upmandex-anniversary-rules -->
# UPMANDEX anniversary environment

- `main` remains the public stable branch. Develop anniversary work exclusively on `anniversary`, which already exists on `origin`.
- Before making any future modification, verify that `anniversary` is the active Git branch.
- Neon has an isolated anniversary branch. Local `.env.local` is Git-ignored and uses the anniversary environment; never add connection strings, secrets, tokens, or passwords to this file or to Git.
- Production uses Neon production; Preview/anniversary uses Neon anniversary.
- Never modify Production data when testing anniversary functionality.
- Never merge `anniversary` into `main`, deploy anniversary work to Production, or change Production without the user's explicit request.
- The anniversary Vercel Preview is operational and protected by Standard Protection / Vercel Authentication.
- Twitch authentication is not configured for Preview yet; treat it as future work.
- No anniversary feature work has started yet.
<!-- END:upmandex-anniversary-rules -->
