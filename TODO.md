# To-do

Findings from a codebase review (October 2026). Items marked **(decision)** need
a call from you before they can be done.

## Security / data problems

- [ ] **Billing cut-off setup (you):** follow `billing-cutoff/README.md`.
- [ ] **Portrait setup (you):** upgrade to Blaze, enable Storage, deploy
      rules, and apply `cors.json` (see README → Portraits).

- [ ] **CI rules deploy setup (you):** create the service account and add the
      `FIREBASE_SERVICE_ACCOUNT` secret (see README → Deploying rules from
      CI).

- [ ] **Remaining dependency advisories** (12, all moderate/high) are inside
      `firebase-tools`, which only runs on developer machines and CI. They
      clear when firebase-tools updates its dependencies.
- [ ] **Major upgrades not yet done:** Vite 8, TypeScript 7,
      `@vitejs/plugin-react` 6. Each needs its own check for breaking changes.

## PDF export gaps

The export now fills correctly (see Done). The app has no data yet for these
parts of the sheet:

- [ ] Character appearance (the template has no text field for it; it could go
      in "Backstory" on page 2, or into Age/Height/Eyes/etc. if the app adds
      those fields)

## Refactoring

- [ ] **SCSS duplication.** `CreateCharacter.scss` (800 lines) and
      `CreateCampaign.scss` (400 lines) restyle the same form elements. Pull
      shared form styles and colour variables into one partial (best done as
      part of the style overhaul). Shared page styles already moved to
      `App.scss` (PR 7).

## Testing

Unit/component tests (`npm test`), Firestore emulator tests of the rules and
services (`npm run test:integration`) and Playwright end-to-end tests
(`npm run test:e2e`) all run in CI on every pull request and before deploys.
New features should come with tests at the appropriate level.

## Missing features

- [ ] **Password reset (revisit later).** Removed for now because the group
      signs up with mock emails, so reset emails can't arrive. To bring it
      back: a "Forgot password" form calling Firebase's
      `sendPasswordResetEmail`, showing "if that email is registered, we've
      sent a link" so it doesn't reveal which emails have accounts. Needs
      real email addresses on accounts; changing the email from the Account
      page would also help.

## Style overhaul

- [ ] **Visual refresh (decision: direction, deferred).** The current look is a gold-on-
      dark-red theme layered on top of the Vite template's default styles
      (`index.css` still sets the template's blue link colours, button styles
      and a light-mode override). Suggested approach: define colour, spacing
      and type tokens as CSS variables in one place, delete the template
      styles, then restyle page by page. Mobile layouts need a pass too.

## Feature ideas

In priority order (agreed October 2026).

1. **Play mode + dice roller**
   - [ ] Track remaining Hit Dice (short rests currently let you spend any
         number).
2. **DM party view + initiative**: done (PR 11).
   - [ ] Let players roll their own initiative into the tracker (the DM
         currently rolls for everyone, or types in what players call out).
3. **SRD lookups + inventory**
   - Spells (PR 8), equipment/inventory (PR 10) and monsters (PR 11) done.
   - [ ] Work out AC from equipped armour and shield.
4. **Session log**: done (PR 12).

Smaller ideas, unprioritised:

## Done in this pass

### Billing cut-off (PR 18)

- Cloud Run function that disables billing when the budget is exceeded,
  with step-by-step Cloud Shell setup.

### Loop check in CI (PR 17)

- E2E test that opens every page and fails if it keeps calling Firebase
  once loaded (verified to catch a deliberately broken effect).

### Usage guard (PR 16)

- Circuit breaker: if the app makes more than 300 Firebase calls in a
  minute (a loop bug), further calls are blocked and a banner asks the user
  to reload, so a bug can't run up a bill.

### Rules deployed by CI (PR 15)

- Pushes to `main` deploy Firestore rules and indexes (and Storage rules
  when `STORAGE_ENABLED` is set) after the tests and before the site.

### Portraits (PR 14)

- Upload a portrait per character (shrunk to ≤ 512px JPEG in the browser),
  stored in Firebase Storage; shown on the character page, list, play mode
  and party view, and embedded in the PDF's character image box.
- Storage rules: only the owner can change a portrait (checked against
  Firestore), images under 2 MB only; any signed-in user can view.

### Character backups (PR 13)

- Download a character as JSON from its page; import it from the
  characters list (to restore it or move it to another account). Imported
  files are validated and clamped so they can't create a broken character.

### Session log (PR 12)

- Dated sessions on each campaign page: a recap everyone in the campaign
  can read, plus DM-only notes stored separately so players can't read
  them. The DM adds, edits and deletes entries.

### Party view and initiative (PR 11)

- Party page per campaign: every character's HP, AC, passive Perception,
  conditions, death saves and spell slots, updating live.
- Initiative tracker run by the DM and watched live by players: roll the
  party in, add SRD monsters (numbered, with stat blocks) or custom
  combatants, track monster HP, turns and rounds. Players see monsters as
  Healthy / Bloodied / Down rather than exact HP.

### Inventory and attacks (PR 10)

- Coins, an inventory list (SRD equipment picker or custom items, with
  quantities) and free-text "other equipment".
- Attacks with computed to-hit and damage; adding an SRD weapon creates one
  using the right ability (ranged → DEX, finesse → better of STR/DEX).
  One-tap attack and damage rolls in quick rolls and play mode.
- Proficiencies & languages field.
- PDF: weapons table (extra attacks go in the box below), coins, languages
  and equipment.
- Fixed form grids overflowing their sections at medium widths (Combat
  Statistics at ~800px), now covered by an E2E check.

### Play mode (PR 9)

- Phone-friendly play screen per character: damage (temp HP first),
  healing, temp HP, death saves (with a roll button), spell slot tracking,
  conditions, inspiration, short rest (spend a Hit Die) and long rest.
  Changes save immediately and update live.
- Death saves and inspiration export to the PDF.

### Spells (PR 8)

- Spell picker from the SRD (319 spells), filtered to the character's class
  and castable levels, with full spell details; custom spells for other
  books or homebrew.
- Spellcasting summary: ability, save DC, attack bonus, slots, and
  cantrips/known/prepared counts with gentle over-limit warnings.
- Proficiency bonus follows level and initiative follows DEX, unless
  overridden.
- PDF export fills the spell page (page 3): stats, slots, spells by level
  and prepared boxes.

### Dice roller (PR 7)

- Dice engine for expressions like `2d6+3` or `1d20+1d4-1`, with
  advantage/disadvantage on d20s and natural 1/20 call-outs.
- Dice page (linked from the header and home page) with quick d4–d100
  buttons and a roll history shared across the session.
- One-tap ability, save, skill and initiative rolls on character pages.
- Shared page styles moved to `App.scss`: lazily-loaded pages (like Dice and 404) were unstyled unless another page's CSS had already loaded.

### Page tests (PR 6)

- Component tests for every page (services mocked), covering loading,
  empty, error, owner/DM and read-only states.
- Pages that can't load (not found / no access) now show only the error
  and a way back, instead of an empty form underneath.
- Error messages on the character and campaign pages were never styled (the
  CSS was nested under the form they sit outside); fixed.
- Remove-player buttons have descriptive accessible names.

### End-to-end tests (PR 5)

- Playwright tests against the Auth + Firestore emulators: sign-up/in/out,
  login errors, refresh, 404, character create/edit/delete, PDF download,
  a DM and player sharing a campaign (including permissions), and no
  horizontal scrolling on desktop or mobile.
- CI runs every test suite on pull requests; deploys only after they pass.

### Campaign management (PR 4)

- DMs can delete a campaign (with a type-the-name confirmation shared with
  character deletion).
- Shared `CampaignFormFields` component for the create and edit pages.
- Rules validate names (≤ 100 characters) and levels (1–20).
- A DM who removes a player can no longer read that player's character
  (characters can now be in at most 5 campaigns, enforced in the UI too).

### App shell (PR 3)

- Pages get the signed-in user from a `useCurrentUser()` hook (React
  context) instead of `auth.currentUser!`; a loading message shows while
  Firebase restores the session.
- One layout route renders the header for every page; added a 404 page.
- Pages and `pdf-lib` load on demand: first download 1,070 kB → 843 kB
  (374 → 259 kB gzipped). The rest is mostly Firebase.
- Login errors appear inline in plain English instead of `alert()` popups;
  email fields use `type="email"` with autocomplete hints.
- Clearer error when the PDF template can't be downloaded.

### Tooling (PR 2)

- Upgraded firebase to 13, Vitest to 5 and everything else within its major
  version; patched `@grpc/grpc-js` via an npm override. Production
  dependencies have no known vulnerabilities.
- CI uses Node 22 LTS (`.nvmrc`, `engines`).
- ESLint (flat config, React hooks rules) and a Prettier config; both run in
  CI. Typed error handling replaces `catch (err: any)`.
- One README replaces the five overlapping deployment docs.

### Second pass

- Firestore security rules deployed and old-format data wiped.
- Firestore security rules (members-only reads, owner-only writes, DM-only
  notes), deployed with the Firebase CLI and tested against the emulator,
  including the attacks the old setup allowed.
- New membership model: `campaigns/{id}/members/{uid}` replaces the
  `players[]` array, so users no longer write to each other's documents.
  Linking and unlinking are atomic batches. One character per player per
  campaign.
- DM notes moved to `campaigns/{id}/private/dm`, hidden from players.
- All Firestore access goes through `src/services/{characters,campaigns}.ts`.
- Refreshing a page now keeps you on it; signing out resets to Home so the
  next sign-in starts there.
- Removed the placeholder forgot-password flow (see Missing features).
- Renaming a character now updates its name in campaigns; the characters list
  is sorted A→Z.
- Fixed narrow-screen layout being cut off on the right, and the horizontal
  scrollbar on desktop (`min-width: 100vw` / `min-width: 320px`).

### First pass

- Fixed PDF export: it guessed field names, and most guesses didn't exist in
  the template (XP, proficiency bonus, HP, personality traits, saving throws,
  every proficiency checkbox, passive perception…). It now uses the template's
  real field names, and a test checks every mapped name exists in the PDF.
- Fixed a character on 0 HP coming back with 8 HP when reopened (`|| 8` →
  defaults applied with `??`).
- Fixed forgot-password: the "is an email entered?" check was inverted.
- A campaign that has since been deleted can now be unlinked from a
  character (this used to fail with "Campaign not found").
- Removed dead code: Vite template files (`main.ts`, `counter.ts`,
  `style.css`, `typescript.svg`, `vite.svg`), the `users` doc with
  `favouriteBeers` written on sign-up (copied from another project, never
  read), and the unused Firebase Storage image clean-up.
- Extracted `CharacterFormFields`, `CampaignLinker` and `NumberInput`;
  the character create/edit pages went from ~2,800 lines to ~750, plus
  ~470 lines of shared components.
  `NumberInput` replaces 14 copy-pasted number inputs and also fixes the
  "can't clear the field" problem on campaign party level.
- D&D reference data and rules maths live in `src/utils/dnd.ts`.
- Inline styles and `onMouseEnter` hover hacks moved to SCSS.
- Login labels are linked to their inputs; fixed the "Dregons" page title;
  the auth listener in `AppContainer` now unsubscribes.
