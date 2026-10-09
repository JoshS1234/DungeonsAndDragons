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
billing-cutoff/          Function that switches billing off over budget
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

### Deploying rules from CI

On pushes to `main`, CI deploys `firestore.rules` and the indexes (and
`storage.rules` once Storage is enabled) before deploying the site. If the
rules deploy fails, the site deploy is skipped. One-off setup:

1. **Create a service account.** In the
   [Google Cloud console](https://console.cloud.google.com/iam-admin/serviceaccounts)
   for the Firebase project: **Create service account**, name it e.g.
   `github-rules-deploy`, and grant these roles:
   - Firebase Rules Admin
   - Cloud Datastore Index Admin
   - Firebase Viewer
   - Service Usage Consumer
2. **Create a key.** Open the service account → **Keys → Add key → Create
   new key → JSON**. A `.json` file downloads.
3. **Add it to GitHub.** Repository **Settings → Secrets and variables →
   Actions → New repository secret**, named `FIREBASE_SERVICE_ACCOUNT`, with
   the whole contents of the file. Then delete the downloaded file.
4. **Once Storage is enabled** (see Portraits below): on the same page,
   **Variables → New repository variable** `STORAGE_ENABLED` = `true`.

To deploy by hand instead: `npx firebase login`, then `npm run deploy:rules`.

The key can deploy security rules and indexes but can't read or change your
data. If it leaks, delete it under the service account's **Keys** tab and
create a new one.

### Spending protection

- **Usage guard (in the app):** more than 300 Firebase calls a minute (a
  loop bug) pauses the page and asks the user to reload.
- **Loop check (CI):** an E2E test fails if any page keeps calling Firebase
  once loaded.
- **Closed sign-ups:** once everyone has an account, untick **Enable create
  (sign-up)** in the Firebase console under **Authentication → Settings →
  User actions**. New people then see "New sign-ups are closed"; switch it
  back on to let someone join.
- **Billing cut-off (Google Cloud):** a function that disables billing when
  the monthly budget is exceeded. One-off setup in
  [`billing-cutoff/README.md`](billing-cutoff/README.md).

### Portraits (Firebase Storage)

Portraits need Firebase Storage, which requires the Blaze (pay-as-you-go)
plan. One-off setup:

1. Firebase console → upgrade to Blaze, then **Storage → Get started**.
2. Deploy `storage.rules` once by hand with `npm run deploy:rules`, and
   accept the prompt to let Storage rules read Firestore (they use it to
   check ownership). Then set the `STORAGE_ENABLED` variable so CI deploys
   them from then on.
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
