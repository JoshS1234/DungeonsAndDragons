# To-do

Findings from a codebase review (October 2026). Items marked **(decision)** need
a call from you before they can be done.

## Security / data problems

- [ ] **Deploy rules automatically (decision).** Rules changes currently need
      `npm run deploy:rules` by hand after merging. CI could deploy them, but
      it needs a Firebase service-account key stored as a GitHub secret.

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
- [ ] Weapons/attacks table, currency (CP/SP/EP/GP/PP), inspiration,
      proficiencies & languages, death saves
- [ ] Page 3 spell sheet. Spells currently go into "Attacks & Spellcasting" on
      page 1, because the app stores spells as one free-text box.

## Refactoring

- [ ] **SCSS duplication.** `CreateCharacter.scss` (800 lines) and
      `CreateCampaign.scss` (400 lines) restyle the same form elements. Pull
      shared form styles and colour variables into one partial.

## Testing

Unit/component tests (`npm test`) and Firestore emulator tests of the rules
and services (`npm run test:integration`, needs Java) both run in CI before
deploys. Still missing:

- [ ] **E2E tests with Playwright (decision).** Should run against the emulator
      rather than the real project. Suggested flows: sign up → create character
      → export PDF; DM creates campaign → player links character → DM views it.
- [ ] Component tests for `ViewEditCharacter`, the campaign pages and the
      characters list (mock `src/services/*`, as `CreateCharacter.test.tsx`
      does).

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
   - [ ] Compact, phone-friendly character sheet for sessions: quick buttons
         for damage, healing, temporary HP, death saves and spell slots,
         instead of editing the whole form mid-session.
   - [ ] Dice roller: any expression (`2d6+3`), advantage/disadvantage, and
         one-tap rolls for skills, saves and attacks from the sheet.
2. **DM party view + initiative**
   - [ ] Each campaign shows its characters' HP, AC, passive perception and
         conditions on one screen, updated live with `onSnapshot`.
   - [ ] Initiative tracker, pre-filled with the party's initiative bonuses,
         with monsters added by hand.
3. **SRD lookups + inventory**
   - [ ] Spell, equipment and monster details from the free 5e SRD API
         (dnd5eapi.co), e.g. picking spells from a list instead of free text,
         which would also let the PDF fill page 3.
   - [ ] Inventory and currency (CP/SP/EP/GP/PP), weapons/attacks, languages
         (also fills the remaining PDF fields).
4. **Session log**
   - [ ] Dated session notes per campaign: a shared recap plus DM-only notes.

Smaller ideas, unprioritised:

- [ ] Work out proficiency bonus from level, and initiative from DEX, instead
      of typing them in (perhaps with a manual override).
- [ ] Character portraits (Firebase Storage).
- [ ] Export/import a character as JSON, as a backup or to move it between
      accounts.

## Done in this pass

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
