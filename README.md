# PDF Note taker

Read a PDF on one side and build handwritten-style, editable notes on the other. Highlight text in the PDF and it appears in your notes in a handwriting font and the color you picked. Clip diagrams from the PDF into the notes, draw or write your own, and download the notes as a PDF.

Works in two modes. As a **guest** (the default, no setup) everything is saved in your browser (IndexedDB). With an optional [Supabase](https://supabase.com) project configured, you can **sign in** and boards, PDFs, notes and focus history are saved to your account instead, so they survive clearing the browser and follow you across devices. There is no API key for any AI service.

## Run it

Requires Node.js 20.9+ (Next.js's minimum; `package.json` has no `engines` field).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. A sample PDF is at `public/sample.pdf` (also served at `/sample.pdf`) if you want something to try.

### Accounts and cloud storage (optional)

Without the steps below the app runs guest-only and the **Sign in** screen explains that accounts aren't set up. `/login` has **Continue without an account**.

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) once in the SQL Editor (tables, row-level security, the private `pdfs` and `scene-files` buckets, and `remove_doc`).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a publishable or legacy anon key; never the `service_role` key). Restart `npm run dev`.
3. In Supabase, Authentication, URL Configuration, add `http://localhost:3000/**` (and your deployed domain) as redirect URLs. Email sign-up works out of the box; Google sign-in needs a Google OAuth client configured under Providers. With "Confirm email" on, new accounts must open the link in the email first.

Boards made as a guest stay in the browser. After you sign in, the dashboard offers to upload them to your account; each board's local copy is deleted only after it has uploaded.

## Try it (the demo flow)

1. On the dashboard, click **Create board**, name it and upload one or more PDFs (a board can hold all the lectures and readings for a topic). Files that are not PDFs (by type/extension and the `%PDF-` header) are rejected. Switch between a board's PDFs with the tabs above the PDF; **+ Add PDF** adds more, double-click a tab to rename it.
2. Drag the divider between the PDF and the notes. Use the **PDF** / **Split** / **Notes** switch at the top to show one pane or both. Zoom the PDF with the **-** / **+** controls and the **Fit width** / **Fit page** toggle.
3. Select text in the PDF, pick a color and handwriting font, and click **Export to board**. Click a handwritten note to move, resize or delete it; double-click it to edit the text. Click a highlight on the PDF and choose **Remove highlight** or **Remove note**; they are separate.
4. Click **Clip diagram**, drag a dotted box around a figure, then **Import to notes**.
5. Select any note (text or diagram) and click the **Go to source** chip that appears above it (below it if there is no room) after a moment (it does not show while you drag, write or edit, and fades after a few seconds). The PDF switches to the right tab, scrolls to the excerpt or figure and flashes it.
6. Draw and write with the Excalidraw tools. **Ctrl+Z** undoes, **Ctrl+Y** redoes. Switch the paper between **Lined**, **Dotted**, **Grid** and **Blank**, with 10 page colors.
7. Reload: the notes, highlights, layout and reading position come back. **Download PDF** saves your notes.
8. Click **Focus** to start a full-screen Pomodoro session: pick a timer, an optional goal and an optional page target. The header becomes a slim countdown bar; hold **Hold to end** for 3 seconds to quit early. Leaving full screen or switching tabs doesn't stop the timer, it is counted and you can return with **Back to focus**. Pick a **focus sound** (rain, coffee shop, ocean, brown/pink/white noise, lo-fi or theta/alpha/beta binaural beats; off by default) in the setup dialog or from the speaker button in the bar; it plays during focus rounds and fades out for breaks and when the session ends. A summary appears at the end, and the dashboard shows today, 7-day totals and your streak.
9. On the dashboard, search boards (press `/`), sort them, and rename or delete a board from its card.

Guest boards live in the browser you created them in, so a deployed copy starts empty for each visitor. Signed-in boards belong to the account.

## Limitations

- **Guests have no backup or sync.** Guest data (including the uploaded PDFs) is in the browser's IndexedDB. Clearing site data, private browsing or storage eviction deletes it; the app asks the browser to keep it, which is not a guarantee. Sign in and upload your boards to keep them. Only the notes can be downloaded, as a PDF.
- **No offline mode for accounts.** A signed-in user who loses connection sees "Not saved" and changes made then are not kept. Two tabs or devices editing the same notes: the one with older data is refused with an error and must reload (last edit is not merged).
- **No file size or page limit** is enforced by the app; very large PDFs are loaded into memory and may be slow, hit browser storage quota, or exceed your Supabase plan's upload limit.
- Note images that you delete from a notebook stay in cloud storage until the board is deleted.
- **Scanned PDFs** (no text layer) cannot be highlighted; diagram clipping still works.
- **Exported PDFs are images** of the notes (not selectable or searchable text).
- Focus sounds are generated in the browser (no downloads). Binaural beats only work with headphones, and after a reload sound restarts once you click **Back to focus**. Their effect on focus varies between people.
- Focus mode can't block OS notifications or stop Esc/Alt+Tab (turn on Do Not Disturb yourself); it records leaving instead. Pages "visited" are pages scrolled into view, not proof of reading.
- No mobile layout for the workspace and no collaboration or sharing (the landing, login and dashboard pages are responsive). Diagrams clipped before the source-link feature have no source to jump to.

## Project structure

```
app/          routes: / (landing), /login, /reset-password, /dashboard, /board/[id] (workspace)
components/   pdf/ (viewer), notes/ (Excalidraw canvas), focus/ (focus mode), dashboard/, landing/, login/, ui/, workspace/
lib/          storage/ (local IndexedDB + Supabase backends), auth.ts, supabase.ts, export-pdf.ts, note-image.ts, paper.ts, placement.ts, ...
supabase/     schema.sql (run once in your Supabase project)
public/       sample.pdf
```

See [docs/architecture.md](docs/architecture.md) for components, data flow and the storage schema. Scripts: `npm run dev | build | start | lint` (there are no automated tests).

## Deploy

Push to GitHub and import the repo in Vercel; the Next.js defaults work. With no environment variables the deployed app is guest-only. To enable accounts, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project and add the deployed domain to Supabase's redirect URLs (these values are public by design; protection comes from row-level security).

## Built with

Next.js, TypeScript, Tailwind CSS, [pdf.js](https://mozilla.github.io/pdf.js/), [Excalidraw](https://docs.excalidraw.com/), [idb](https://github.com/jakearchibald/idb), [Supabase](https://supabase.com) (optional accounts and storage), [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) and [jsPDF](https://github.com/parallax/jsPDF).
