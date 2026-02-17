# FileCloud Project

## Current State
This is a Next.js 14 file cloud storage app. The code has broken imports and missing features.

## What needs to happen:
1. Fix ALL build errors - make `npm run build` pass
2. The app needs these features working:
   - User registration + login (email/password, bcrypt, HTTP-only session cookies)
   - File upload (drag & drop, up to 500MB), download, delete
   - Folder create/navigate with breadcrumbs
   - File preview: images (lightbox), video/audio (HTML5 player), PDF (iframe), code (syntax highlight), markdown (rendered)
   - Share files: generate public links with optional expiry/password
   - Share with platform users, "Shared with me" section
   - Knowledge Graph page: interactive force-directed graph with mock data, nodes=files/tags, neon glow effects
   - Grid/List view toggle, storage usage indicator
   - Dark glassmorphism UI (backdrop-blur, glass cards, subtle borders, cyan/purple accents)
   - Mobile responsive sidebar
3. Config: `next.config.mjs` with `output: 'standalone'`
4. All DB tables in SQLite via better-sqlite3

## Tech
- Next.js 14.2, React 18, Tailwind CSS, better-sqlite3, uuid, mime-types
- For knowledge graph use a simple canvas/SVG implementation (no extra npm deps to avoid build issues)
- Keep it simple, avoid complex npm dependencies

## DB env vars
- DB_PATH=/data/files.db
- UPLOAD_DIR=/data/uploads

## IMPORTANT
- Do NOT use next.config.ts (not supported in this Next.js version)
- Make sure `npm run build` succeeds before finishing
- Run `npm run build` at the end to verify
