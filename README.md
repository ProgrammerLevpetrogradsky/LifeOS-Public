# LifeOS

LifeOS is a small, local-first space for moving from intention to focused action. A good system should adapt to a person's life without falling apart.

Try the [LifeOS demo](https://lifeos-demo-kappa.vercel.app/). LifeOS keeps the daily list short, leaves focus sessions open-ended, and helps you notice what supported your work. There is no account or cloud sync.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually `http://localhost:5173`). For a production build, run `npm run build`, then `npm run preview`. Run `npm test` for the data model checks.

## MVP features

- **Tasks:** Organize tasks in Today and Someday. Today holds up to five active tasks. Start a focus session directly from a task.
- **Focus Mode:** An open-ended session with an optional elapsed-time display. An active session survives a page reload.
- **Flow check-in:** Finish a session by rating interest, desire to continue, and progress from 1–5; optionally select factors that helped.
- **Reflect:** Answer three questions about what helped you focus, and revisit past reflections and sessions.
- **Journal:** Write, edit, and search timestamped notes, organize them in folders, and attach photos.
- **Settings:** Choose Light, Dark, or System theme, export all data as JSON, and restore a validated JSON backup after confirming replacement.

## Data and privacy

LifeOS stores data in the current browser. To move your data to another device, use **Settings → Backups → Export backup**, then **Restore backup** on the other device. Backup files include the contents of your journal and any previously imported notes.

An active focus session and an unfinished check-in are stored too, so a reload does not discard the current loop. No analytics or accounts are included.

## Project structure

`src/App.tsx` contains the four views and focus/check-in flow. `src/data.ts` defines the saved data and persistence helpers. `src/styles.css` contains the responsive visual design. The stack is React, TypeScript, Vite, and browser storage.

## Roadmap

- Improve accessibility and keyboard flow from real user feedback.
- Consider optional installability and offline caching.
- Explore deeper Flow insights only if the simple check-in proves useful.
- Consider device sync and focus blocking as separate, later decisions.
