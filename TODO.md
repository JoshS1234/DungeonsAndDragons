# To-do

Findings from a codebase review (October 2026). Items marked **(decision)** need
a call from you before they can be done.

## Security / data problems

- [ ] **Firestore security rules aren't in the repo (decision).** Every permission
      check ("only the owner can edit", "only campaign members can view") happens
      in the browser, so anyone signed in can bypass it from the console. Some
      current features only work if the rules are wide open:
      - joining a campaign writes to a campaign document owned by someone else
      - a DM removing a player writes to that player's character document

      Add `firestore.rules` + `firebase.json`, decide what each role is allowed
      to write, and test the rules against the Firebase emulator (see Testing).
- [ ] **DM notes can be read by players.** "This will not be shown to players"
      only hides the notes in the UI; they're stored on the campaign document,
      which players load. Move them to e.g. `campaigns/{id}/private/notes`, with
      a rule that only lets the DM read it.
- [ ] **Anyone with a campaign ID can join it (decision).** Should a DM approve
      joins, or is the ID the invite?
- [ ] **Two-document updates aren't atomic.** Linking/unlinking updates the
      character and the campaign with `Promise.all`, so if one write fails the
      two can disagree. Use `writeBatch`.
- [ ] **Run `npm audit fix` / bump dependencies.** 6 known vulnerabilities
      (react-router high; protobufjs/websocket-driver critical, both via
      firebase). Not done in this pass, so the diff stays reviewable.

## Bugs / jank

- [ ] **Refreshing any page sends you to Home.** `App.tsx` redirects to `/`
      every time it mounts, which breaks refreshes and shared links. Recommended:
      delete that effect and redirect only after a successful sign-in.
- [ ] **Renaming a character leaves the old name in campaigns.** Campaigns keep
      a copy of `characterName`/`playerName` in `players[]`, and saving a
      character doesn't update it.
- [ ] **Characters list is sorted Z→A** (`orderBy("characterName", "desc")`).
      Probably meant to be A→Z, like campaigns.
- [ ] **Password reset is disabled (decision).** The forgot-password form only
      shows an alert. Enable `sendPasswordResetEmail` (the code is there,
      commented out), or remove the button.
- [ ] Login errors use `alert()` and show raw Firebase error text. Show them
      inline with friendly messages, like the Account page does.
- [ ] Login email inputs are `type="text"`. Use `type="email"` with
      `autocomplete` attributes.
- [ ] No 404 route: unknown URLs render a blank page.
- [ ] `ViewEditCampaign`: `removingPlayer` isn't reset after a successful
      removal.

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

- [ ] **Firestore service layer.** Firestore calls are spread across the pages,
      and the link/unlink/remove-player logic exists in three places. Move it
      into `src/services/{characters,campaigns}.ts`, with typed `Campaign` /
      `CampaignPlayer` models in place of `any`.
- [ ] **Auth context.** Some pages subscribe to `onAuthStateChanged`, others
      read `auth.currentUser`. `App` only renders when signed in, so a
      `useCurrentUser()` hook (or plain `auth.currentUser!`) would do.
- [ ] **Campaign form.** `CreateCampaign` and `ViewEditCampaign` duplicate their
      form fields, as the character pages did. Extract a `CampaignFormFields`
      component the same way.
- [ ] **Layout route.** Every page renders `<Header />` itself. Use a layout
      route with `<Outlet />`.
- [ ] **SCSS duplication.** `CreateCharacter.scss` (800 lines) and
      `CreateCampaign.scss` (400 lines) restyle the same form elements. Pull
      shared form styles and colour variables into one partial.
- [ ] **Bundle size** (1.07 MB). Lazy-load `pdf-lib` (only needed on export)
      and the route components.
- [ ] Add ESLint (`App.tsx` has an `eslint-disable` comment, but no ESLint is
      configured) and commit a Prettier config. The code is Prettier-formatted
      with `trailingComma: "es5"`.
- [ ] Docs: there's no README, but there are five overlapping deployment docs
      (`QUICK_FIX`, `TROUBLESHOOTING`, `DEPLOYMENT_CHECKLIST`,
      `GITHUB_PAGES_SETUP`, `GITHUB_SECRETS`). Merge them into one README.

## Testing

Vitest + Testing Library are set up (`npm test`, `npm run test:watch`) and run
in CI before deploys. Still missing:

- [ ] **Integration tests against the Firebase emulator (decision).** Needs
      `firebase-tools` as a dev dependency and the security rules above. Best
      value: rules tests + service-layer tests.
- [ ] **E2E tests with Playwright (decision).** Should run against the emulator
      rather than the real project. Suggested flows: sign up → create character
      → export PDF; DM creates campaign → player links character → DM views it.
- [ ] Component tests for `ViewEditCharacter`, the campaign pages and the
      characters list. These get much easier once Firestore calls live in a
      service module that can be mocked.

## Feature ideas

- [ ] Work out proficiency bonus from level, and initiative from DEX, instead
      of typing them in (perhaps with a manual override).

## Done in this pass

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
