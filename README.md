# Dungeons and Dragons

A web app for running D&D 5e campaigns with friends: create characters,
export them to a filled-in PDF character sheet, and link them to campaigns
run by a Dungeon Master.

Built with React, TypeScript and Vite, using Firebase (Auth + Firestore) and
hosted on GitHub Pages.

## Getting started

Requires Node 22.12+ (see `.nvmrc`) and, for the emulator and end-to-end
tests, Java 21+. The first E2E run needs `npx playwright install chromium`.

```bash
cp .env.example .env   # then fill in the Firebase web config
npm install
npm run dev
```

The values for `.env` are in the Firebase console under Project settings →
General → Your apps. They are not secret (they ship in the website), but they
are kept out of the repo so other forks can point at their own project.

## Scripts

| Command                    | What it does                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| `npm run dev`              | Start the dev server                                                 |
| `npm run build`            | Type-check and build to `dist/`                                      |
| `npm test`                 | Unit and component tests (Vitest)                                    |
| `npm run test:integration` | Security rules + service tests against the Firestore emulator        |
| `npm run test:e2e`         | End-to-end tests (Playwright) against the Auth + Firestore emulators |
| `npm run lint`             | ESLint                                                               |
| `npm run format`           | Format everything with Prettier (`format:check` to just check)       |
| `npm run deploy:rules`     | Deploy `firestore.rules` and indexes (needs `npx firebase login`)    |

## Project layout

```
src/
  pages/        One folder per route
  components/   Shared UI (header, character form, inputs…)
  services/     All Firestore access (characters, campaigns)
  utils/        D&D rules maths, PDF export, helpers
scripts/                One-off data scripts (SRD snapshot, PDF field mapping)
src/data/srd/           SRD spells and class tables (CC-BY-4.0)
firestore.rules         Security rules (who can read/write what)
firestore.indexes.json  Firestore indexes
```

### SRD data

Spells, equipment, monsters and class spellcasting tables come from the D&D 5e System Reference
Document 5.1 (CC-BY-4.0), snapshotted from dnd5eapi.co by
`node scripts/fetch-srd.mjs`. The PDF's spell-page field mapping is generated
by `node scripts/pdf-spell-fields.mjs`.

### Data model

- `characters/{id}` – owned by `userId`; its portrait is stored at
  `portraits/{id}` in Storage.
- `campaigns/{id}` – owned by the DM (`userId`).
- `campaigns/{id}/members/{uid}` – one per member, `role: "dm" | "player"`.
- `campaigns/{id}/public/summary` – campaign name, readable by anyone with the
  ID (used when joining).
- `campaigns/{id}/private/dm` – DM-only notes.
- `campaigns/{id}/encounter/current` – the initiative order (DM writes,
  members read).
- `campaigns/{id}/sessions/{id}` and `sessionNotes/{id}` – session recaps
  (members read) and DM-only notes.

The comments in `firestore.rules` describe exactly who can do what.

## Deployment

Every pull request runs lint, unit, rules and end-to-end tests
(`.github/workflows/deploy.yml`). Pushing to `main` runs the same tests, then
builds the site and deploys it to GitHub Pages. A failing test stops the
deploy.

One-off setup (already done for this repo):

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions:** add each `VITE_FIREBASE_*`
   value from `.env` as a repository secret.
3. **Firebase console → Authentication → Settings → Authorized domains:** add
   `<username>.github.io`.

The app uses `HashRouter` (URLs look like `/#/characters`) because GitHub
Pages can't rewrite routes to `index.html`.

Firestore and Storage rules are deployed separately, with
`npm run deploy:rules`.

### Portraits (Firebase Storage)

Portraits need Firebase Storage, which requires the Blaze (pay-as-you-go)
plan. One-off setup:

1. Firebase console → upgrade to Blaze, then **Storage → Get started**.
2. `npm run deploy:rules` (includes `storage.rules`; accept the prompt to let
   Storage rules read Firestore, which they use to check ownership).
3. Allow the site to download portraits for PDF export (displaying them
   works without this):
   `gcloud storage buckets update gs://<bucket> --cors-file=cors.json`
   (the bucket is `VITE_FIREBASE_STORAGE_BUCKET` in `.env`).

### Troubleshooting

- **Workflow didn't run:** check the Actions tab; it only runs on pushes to
  `main` (or manually via "Run workflow").
- **Build fails:** usually a missing secret or a failing test; the job log
  says which.
- **Signing in fails on the live site:** the GitHub Pages domain is missing
  from Firebase's authorized domains.
- **"Missing or insufficient permissions":** the deployed rules don't match
  the code; run `npm run deploy:rules`.
