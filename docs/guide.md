# Margin guide

The full walkthrough, every known limitation and the deployment steps. For the overview and setup, see the [README](../README.md).

## Walkthrough

1. On the dashboard, click **Create board**, name it and upload one or more PDFs (a board can hold all the lectures and readings for a topic). Files that are not PDFs (by type/extension and the `%PDF-` header) are rejected. Switch between a board's PDFs with the tabs above the PDF; **+ Add PDF** adds more, double-click a tab to rename it.
2. Drag the divider between the PDF and the notes. Use the **PDF** / **Split** / **Notes** switch at the top to show one pane or both. Zoom the PDF with the **-** / **+** controls and the **Fit width** / **Fit page** toggle.
3. Select text in the PDF, pick a color and handwriting font, and click **Export to board**. Click a handwritten note to move, resize or delete it; double-click it to edit the text. Click a highlight on the PDF and choose **Remove highlight** or **Remove note**; they are separate.
4. Click **Clip diagram**, drag a dotted box around a figure, then **Import to notes**.
5. Select any note (text or diagram) and click the **Go to source** chip that appears above it (below it if there is no room) after a moment (it does not show while you drag, write or edit, and fades after a few seconds). The PDF switches to the right tab, scrolls to the excerpt or figure and flashes it.
6. Draw and write with the Excalidraw tools. **Ctrl+Z** undoes, **Ctrl+Y** redoes. Switch the paper between **Lined**, **Dotted**, **Grid** and **Blank**, with 10 page colors.
7. Reload: the notes, highlights, layout and reading position come back. **Download PDF** saves your notes.
8. Click **Focus** to start a full-screen Pomodoro session: pick a timer, an optional goal and an optional page target. The header becomes a slim countdown bar; hold **Hold to end** for 3 seconds to quit early. Leaving full screen or switching tabs doesn't stop the timer, it is counted and you can return with **Back to focus**. Pick a **focus sound** (rain, coffee shop, ocean, brown/pink/white noise, lo-fi or theta/alpha/beta binaural beats; off by default) in the setup dialog or from the speaker button in the bar; it plays during focus rounds and fades out for breaks and when the session ends. A summary appears at the end, and the dashboard shows today, 7-day totals and your streak.
9. On the dashboard, search boards (press `/`), sort them, and rename or delete a board from its card.
10. **On a phone** (a narrow portrait screen) the workspace stacks the PDF above the notes in **Split**; drag the bar between them to give either one more room (this position is remembered on that device and doesn't change your desktop layout). The header shows the board name, the **PDF** / **Split** / **Notes** switch and a **⋯** menu with **Focus session**, **Download PDF** and **Page style**. Press and hold text in the PDF to select it; a small pill appears just under the selection with the highlight color (tap the swatch to pick another) and **Export to board**. The notes start in the **Pan** tool so one finger scrolls the page; pick **Pen** to write, or **Select**, tap a note and press **Edit note** to change its text. The tools row scrolls sideways, and the bar under the notes has Undo, Redo, **Fit**, previous/next page and **+** to add a page. While you type a note, the notes take the whole screen until the keyboard closes. Landscape phones keep the side-by-side layout with the same compact controls.

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
- No collaboration or sharing. Diagrams clipped before the source-link feature have no source to jump to.
- **Phone layout:** it was built and checked in an emulated touch browser, not on real phones, so the on-screen keyboard and the browser's text-selection handles may behave differently. Pinching over the PDF zooms the whole page (use the **-** / **+** controls instead), and the PDF zoom isn't saved from a phone, so each visit fits the PDF to the width.

## Deploy

Push to GitHub and import the repo in Vercel; the Next.js defaults work. With no environment variables the deployed app is guest-only. To enable accounts, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project and add the deployed domain to Supabase's redirect URLs (these values are public by design; protection comes from row-level security).

### Railway (low idle cost)

The app is a plain Node server (`npm run build`, then `npm run start`; Railway sets `PORT`), so Railway's auto-detected build works.

1. New service from the GitHub repo. Set the variables before the first build, because `NEXT_PUBLIC_*` values are inlined at build time: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_TELEMETRY_DISABLED=1` (Next's telemetry is outbound traffic and stops the service from sleeping).
2. Service Settings, Deploy: enable **Serverless**, then redeploy (it only applies to new containers). Optionally set Replica Limits (for example 0.5 vCPU, 1 GB) to cap spend.
3. Networking: generate a domain, then add it as Supabase's Site URL and a `https://<domain>/**` redirect URL.
4. Workspace Usage: set a custom email alert and, if wanted, a hard limit (minimum $10; it takes every workload in the workspace offline).

A sleeping service wakes on the next request; the first one is slower and may return a 502, a refresh fixes it.
