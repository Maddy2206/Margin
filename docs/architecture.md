# Architecture

Client-only Next.js (App Router) app: no API routes or server code of its own. Data lives either in the browser (guest, IndexedDB) or, for signed-in users, in a Supabase project that the browser talks to directly (auth, Postgres, Storage), with row-level security as the access control. Versions are in [package.json](../package.json). This Next.js version differs from older ones: see `node_modules/next/dist/docs/`.

## Layout

| Path | Role |
| --- | --- |
| `app/page.tsx` | Landing page: `components/landing/Landing.tsx` (timeline, scroll and demo logic, a class component ported from the design file) renders `LandingView.tsx` (markup) |
| `app/login/page.tsx` | Sign-in / create-account screen (`components/login/Login.tsx`) using `lib/auth.ts`: shows real errors, "check your inbox" when email confirmation is on, plays a page-turn transition then routes to `/dashboard`; Google leaves the page and returns to `/dashboard`; "Continue without an account" links to `/dashboard` |
| `app/reset-password/page.tsx` | New-password form (`components/login/ResetPassword.tsx`) reached from the reset email |
| `app/dashboard/page.tsx` | Board library (`components/dashboard/`) in the notebook theme; sidebar shows the account (Sign out) or a Sign in link; offers to upload guest boards once signed in |
| `app/board/[id]/page.tsx` | Workspace: owns state and wires the PDF and notes sides together |
| `components/pdf/` | `PdfViewer` (pdf.js rendering, highlights), `PdfTabs`, `SelectionPopout`, `DiagramSelect` |
| `components/notes/` | `NotesCanvas` (Excalidraw wrapper, autosave), toolbar, inline editor, paper background, helpers |
| `components/workspace/SplitLayout.tsx` | Resizable PDF/notes split |
| `components/focus/` | Focus mode: `useFocusSession` (state, saving, fullscreen, absence detection, chime), `useAmbientSound` (focus sound choice + playback tied to the session), `SoundPicker`, `SoundMenu`, `FocusSetupDialog`, `FocusBar`, `FocusOverlay`, `HoldToExit`, `useNow` |
| `lib/storage/` | The storage API (see Storage below): `index.ts` (what the app imports), `local.ts` (IndexedDB), `cloud.ts` (Supabase), `migrate.ts` (guest-to-account upload) |
| `lib/` | `supabase.ts` (client, `null` without env vars), `types.ts`, `export-pdf.ts`, `note-image.ts`, `diagram-region.ts`, `paper.ts`, `pages.ts`, `placement.ts`, `handwriting-fonts.ts`, `pdf-validate.ts`, `visible-page.ts`, `note-source.ts`, `focus.ts` (pure session/timer/stats logic), `ambient.ts` (Web Audio focus-sound engine and saved choice), `auth.ts` (Supabase email/password and Google sign-in, password reset, `useUser()`), `inline-style.ts` (`css`/`hov`/`foc` helpers that turn the design files' inline style strings into React props), `today.ts` |

## Notebook theme

The landing, login and dashboard pages share a ruled-paper "notebook" look. Paper tokens (`--paper`, `--rule`, `--margin-red`, `--pen-blue`, ...) are on `:root` in `app/globals.css`; the gold palette, Cormorant Garamond/Lora type and button/input overrides apply only inside a `.nb` wrapper, so the workspace keeps its own red modernist styling. `.nb-page` adds the ruled background. Fonts (Cormorant Garamond, Lora, Caveat, Kalam, Patrick Hand) are loaded in `app/layout.tsx` via `next/font`. The landing and login pages come from design files (`Margin Landing v2`, `Margin Login`); their margin lines draw in on load and are skipped under `prefers-reduced-motion`.

## Data flow

1. Uploaded PDFs are checked by `lib/pdf-validate.ts` and stored (a Blob in IndexedDB, or a file in the `pdfs` bucket).
2. `PdfViewer` renders pages with pdf.js (legacy build, worker resolved via `new URL(...)`).
3. Selecting text opens `SelectionPopout` (marker colour, font). On export, `lib/note-image.ts` draws the text on a canvas in the handwriting font; the PNG is inserted into the Excalidraw scene at a position from `lib/placement.ts`, and a `Highlight` record links to it by `noteId`.
4. Diagram clip: `DiagramSelect` + `lib/diagram-region.ts` rasterize a page region into an image element. The image's `customData.source` (`NoteSource`: docId, page, rect in 0-1 page units) records where it came from.
5. Go to source: selecting a note makes `NotesCanvas` call `lib/note-source.ts` (`resolveNoteSource`: diagram -> `customData.source`; text note -> `customData.source` if stamped, else the union box of its `Highlight` by `noteId`; removing a highlight stamps the source onto the note first). The button calls `jumpToSource` in the board page, which switches the PDF tab, shows the pane and passes `jump` to `PdfViewer`; that scrolls to the rect and flashes it.
6. `NotesCanvas` (loaded with `dynamic()`) autosaves the whole scene through `saveScene` on an 800 ms debounce, and saves immediately if the board is left inside that delay.
7. Download: `lib/export-pdf.ts` (loaded on demand) draws the paper and scene per notebook page and writes a JPEG-per-page A4 PDF with jsPDF.

## Storage (`lib/storage/`)

The app imports one API from `lib/storage/index.ts` (19 functions: boards, docs, highlights, scenes, focus sessions). Each call asks `backend()`: with a Supabase session it uses `cloud.ts`, otherwise `local.ts`. A signed-in user therefore sees only their account's boards; guest boards stay in the browser until uploaded. `backend` is resolved per call, so there is no startup race.

### Guest: IndexedDB (`local.ts`, via `idb`)

IndexedDB `pdf-note-taker`, version 3. Stores: `boards`, `highlights` (indexed by board), `scenes` (keyed by `boardId`), `documents` (index `by-board`), `pdfBlobs` (keyed by `docId`), `focusSessions` (keyed by `id`, not deleted with a board). The v1 to v2 upgrade moved the old single-PDF store into `documents` and `pdfBlobs`; v3 added `focusSessions`, and the connection closes on `blocking` so a second tab can't stall an upgrade. localStorage holds only the last-used ink, font, marker, focus timer choice and focus sound/volume (`pdfnote.*` keys, the sound is `pdfnote.focusSound`). `createBoard` asks the browser for persistent storage (`navigator.storage.persist()`).

### Account: Supabase (`cloud.ts`, schema in `supabase/schema.sql`)

- **Tables** (all rows carry `user_id` and one RLS policy, `user_id = auth.uid()`, for `authenticated` only): `boards`, `documents` (FK to board, cascade), `highlights` (FKs to board and document, cascade; the `Highlight` object is in `data`), `scenes` (one per board; `elements`, `app_state`, `files` = image metadata only, `version`), `focus_sessions` (the `FocusSession` is in `data`; deliberately **no FK** to boards so history and streaks survive deleting a board). Ids are the client's UUIDs and times are epoch ms, so local rows copy over unchanged.
- **Storage buckets** (private; first path segment must be the user's id): `pdfs/{user}/{docId}` and `scene-files/{user}/{boardId}/{fileId}`. Note images are uploaded once and loaded back into `dataURL`s on `loadScene`, so autosaves send only new images.
- **`remove_doc(uuid)`** (SQL function, `security invoker`): removes a PDF and its highlights and fixes the board's `doc_count` and `active_doc_id` in one transaction; returns false for a board's last PDF. The client then deletes the file.
- **Behaviour:** rapid `updateBoard`/`updateDoc` calls merge while a request is in flight (first goes out at once). `saveScene` runs one at a time per board and uses the `version` column: a save from a stale tab or device is refused with a message rather than merged. `deleteBoard` deletes the row first (children cascade), then the files. `createBoard`/`addDocs` upload files first and clean up if the insert fails.
- **Guest upload** (`migrate.ts`, `cloud.importBoard`): per board, uploads files and upserts rows (so it can be repeated), then deletes the local copy; focus history goes last. Highlights whose PDF no longer exists are skipped.
- **Auth** (`lib/auth.ts`): Supabase email/password and Google; the display name is stored in `user_metadata`, which is never used for authorization. The browser client uses the public publishable/anon key only.

## Focus mode

`app/board/[id]/page.tsx` owns `useFocusSession(boardId)`. A session is one `FocusSession` record saved on every change; phases store `phaseEndsAt` timestamps, so reloads, sleep and throttled tabs stay accurate and an active session is resumed on load (shown behind "Back to focus", since full screen needs a click). `FocusBar` and `FocusOverlay` tick locally (`useNow`) so the board doesn't re-render each second. Absence = hidden tab, window blur or lost full screen, still true after 400 ms. The page reports PDF page changes, exported highlights and clipped diagrams into the session; `lib/focus.ts#focusStats` feeds the dashboard strip.

### Focus sounds

`lib/ambient.ts` is a singleton Web Audio engine: looped, click-free noise buffers (white, pink, brown) and oscillators (binaural beats, one tone per ear). Rain, ocean and coffee shop are filtered noise with slow LFO swells plus random drops or clinks; lo-fi is a small look-ahead scheduler playing a four-chord loop, soft drums and vinyl crackle. One sound plays at a time and changes crossfade. `useAmbientSound(session, over, needsReturn)` plays it only during an active focus round and fades it out otherwise; mute is per session. The choice is not stored on `FocusSession`. Browsers need a user gesture for audio, so `ambient.unlock()` is called from the Start and Back to focus clicks.

## Build notes

- Environment variables read: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional; both empty means guest-only, template in `.env.example`; they are inlined into the browser bundle by design), and `NEXT_DIST_DIR` (build output folder, default `.next`, see `next.config.ts`).
- Tailwind is wired through a Turbopack CSS rule in `next.config.ts` (no PostCSS config); a non-Turbopack build is untested.
- `package.json` requires Node >=20.9.0 (`engines`, a Next 16 requirement). On Railway set `NEXT_TELEMETRY_DISABLED=1` so Serverless sleeping works (see the README Deploy section).
- No tests, CI or deployment config files exist in the repo (Railway uses its auto-detected build).
