# LifeOS

LifeOS is a small, local-first space for moving from intention to focused action. A good system should adapt to a person's life without falling apart.

Try the [LifeOS demo](https://lifeos-demo-kappa.vercel.app/). LifeOS keeps the daily list short, leaves focus sessions open-ended, and helps you notice what supported your work. Email accounts are optional. Workspace data stays in the browser.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). For a production build, run `npm run build`, then `npm run preview`. Run `npm test` for the data model checks.

### Email accounts

Connect a dedicated Neon project with Managed Better Auth to your Vercel project. In Neon, enable email/password sign-up and sign-in, add the deployed LifeOS origin to trusted domains, and configure email delivery for password reset. See the [Neon Auth production checklist](https://neon.com/docs/auth/production-checklist).

Set `VITE_NEON_AUTH_URL` to the branch's public Auth Base URL (the Vercel integration can inject it). Set `VITE_LIFEOS_ACCOUNTS_ENABLED=true` after configuring and checking sign-up, sign-in, and password reset, then rebuild. Keep database credentials out of variables prefixed with `VITE_`.

**Settings → Account** offers registration, sign-in, password reset, and sign-out. Each account gets a separate workspace in the current browser. Guest data remains available after signing out. To copy it to an account workspace or another browser, export and restore a backup. Accounts authenticate across devices, while workspace data is stored locally.

## MVP features

- **Home and Tasks:** Keep up to five active tasks in Today and later ideas in Someday. Task history shows focus sessions and linked Journal notes, with actions to start focus or link a note.
- **Ask LifeOS:** A local guide in the navigation bar answers common app questions with steps and follow-up suggestions. It does not read workspace data or send questions to a service.
- **Focus Mode:** An open-ended session with an optional elapsed-time display. An active session survives a page reload.
- **Flow check-in:** Finish a session by rating interest, desire to continue, and progress from 1–5; optionally select factors that helped.
- **Reflect:** Review focus check-ins and patterns from past sessions.
- **Journal:** Write, edit, and search timestamped notes, organize them in folders, and attach photos.
- **Settings:** Choose Light, Dark, or System theme, customize navigation, export data as JSON, and restore a validated JSON backup after confirming replacement.

## Data and privacy

LifeOS stores data in the current browser. To move your data to another device, use **Settings → Backups → Export backup**, then **Restore backup** on the other device. Backup files include the contents of your journal and any previously imported notes.

An active focus session and an unfinished check-in are stored too, so a reload does not discard the current loop. LifeOS does not collect analytics.

## Project structure

`src/App.tsx` contains navigation and the focus/check-in flow. `src/data.ts` defines saved data and persistence helpers. `src/home/` contains the local Ask LifeOS guide. The stack is React, TypeScript, Vite, and browser storage.

## Roadmap

- Improve accessibility and keyboard flow from real user feedback.
- Consider optional installability and offline caching.
- Explore deeper Flow insights only if the simple check-in proves useful.
- Consider device sync and focus blocking as separate, later decisions.
