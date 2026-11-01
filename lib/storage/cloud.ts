import type { Board, FocusSession, Highlight, PdfDoc, SceneRecord } from "../types";
import { supabase } from "../supabase";
import { newDoc } from "./new-doc";

// Supabase implementation of the storage API (same function names and shapes as ./local).
// Tables and policies are in supabase/schema.sql. PDFs go to the `pdfs` bucket and note images to `scene-files`,
// both under "{user id}/...", so row-level security and the bucket policies keep every account apart.

function sb() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function uid(): Promise<string> {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/* ---------- row shapes ---------- */

interface BoardRow {
  id: string;
  name: string;
  created_at: number;
  last_opened_at: number;
  page_count: number | null;
  last_page: number | null;
  divider_ratio: number | null;
  pane_visibility: Board["paneVisibility"] | null;
  paper: Board["paper"] | null;
  paper_color: string | null;
  note_pages: number | null;
  pdf_zoom: number | null;
  active_doc_id: string | null;
  doc_count: number | null;
}

interface DocRow {
  id: string;
  board_id: string;
  name: string;
  page_count: number;
  last_page: number;
  zoom: number | null;
  added_at: number;
}

const BOARD_COLS: Record<string, string> = {
  name: "name",
  createdAt: "created_at",
  lastOpenedAt: "last_opened_at",
  pageCount: "page_count",
  lastPage: "last_page",
  dividerRatio: "divider_ratio",
  paneVisibility: "pane_visibility",
  paper: "paper",
  paperColor: "paper_color",
  notePages: "note_pages",
  pdfZoom: "pdf_zoom",
  activeDocId: "active_doc_id",
  docCount: "doc_count",
};

const DOC_COLS: Record<string, string> = {
  name: "name",
  pageCount: "page_count",
  lastPage: "last_page",
  zoom: "zoom",
  addedAt: "added_at",
};

/** A patch object to a column patch. An undefined value clears the column. */
function toColumns(patch: object, cols: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (cols[k]) out[cols[k]] = v === undefined ? null : v;
  }
  return out;
}

function toBoard(r: BoardRow): Board {
  return {
    id: r.id,
    name: r.name,
    createdAt: Number(r.created_at),
    lastOpenedAt: Number(r.last_opened_at),
    pageCount: r.page_count ?? 0,
    lastPage: r.last_page ?? 1,
    dividerRatio: r.divider_ratio ?? 0.5,
    paneVisibility: r.pane_visibility ?? { pdf: true, notes: true },
    paper: r.paper ?? "lined",
    paperColor: r.paper_color ?? undefined,
    notePages: r.note_pages ?? undefined,
    pdfZoom: r.pdf_zoom,
    activeDocId: r.active_doc_id ?? undefined,
    docCount: r.doc_count ?? undefined,
  };
}

function toDoc(r: DocRow): PdfDoc {
  return {
    id: r.id,
    boardId: r.board_id,
    name: r.name,
    pageCount: r.page_count,
    lastPage: r.last_page,
    zoom: r.zoom,
    addedAt: Number(r.added_at),
  };
}

function docRow(d: PdfDoc): DocRow {
  return {
    id: d.id,
    board_id: d.boardId,
    name: d.name,
    page_count: d.pageCount,
    last_page: d.lastPage,
    zoom: d.zoom,
    added_at: d.addedAt,
  };
}

/* ---------- helpers ---------- */

/** Runs `fn` over `items`, at most `limit` at a time. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Row updates that fire in bursts (page changes, divider drags). The first write goes out at once; writes that
 * arrive while it is in flight merge into one follow-up. Callers still get the row back, or the error.
 */
interface Slot {
  running: boolean;
  patch: Record<string, unknown> | null;
  waiters: { res: (row: unknown) => void; rej: (e: unknown) => void }[];
}
const slots = new Map<string, Slot>();

function write(table: string, id: string, columns: Record<string, unknown>): Promise<unknown> {
  const key = `${table}:${id}`;
  const slot = slots.get(key) ?? { running: false, patch: null, waiters: [] };
  slots.set(key, slot);
  if (!slot.running) {
    slot.running = true;
    return send(key, table, id, columns);
  }
  slot.patch = { ...(slot.patch ?? {}), ...columns };
  return new Promise((res, rej) => slot.waiters.push({ res, rej }));
}

async function send(key: string, table: string, id: string, columns: Record<string, unknown>): Promise<unknown> {
  const slot = slots.get(key)!;
  try {
    return check(await sb().from(table).update(columns).eq("id", id).select().maybeSingle());
  } finally {
    const { patch, waiters } = slot;
    slot.patch = null;
    slot.waiters = [];
    if (patch) {
      send(key, table, id, patch).then(
        (row) => waiters.forEach((w) => w.res(row)),
        (e) => waiters.forEach((w) => w.rej(e)),
      );
    } else {
      slot.running = false;
    }
  }
}

/* ---------- boards ---------- */

export async function listBoards(): Promise<Board[]> {
  const rows = check(await sb().from("boards").select("*").order("last_opened_at", { ascending: false }));
  return (rows as BoardRow[]).map(toBoard);
}

export async function getBoard(id: string): Promise<Board | undefined> {
  const row = check(await sb().from("boards").select("*").eq("id", id).maybeSingle());
  return row ? toBoard(row as BoardRow) : undefined;
}

async function uploadPdf(user: string, docId: string, blob: Blob): Promise<void> {
  const { error } = await sb()
    .storage.from("pdfs")
    .upload(`${user}/${docId}`, blob, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(error.message);
}

async function removePdfs(user: string, docIds: string[]): Promise<void> {
  if (docIds.length) await sb().storage.from("pdfs").remove(docIds.map((d) => `${user}/${d}`));
}

export async function createBoard(
  name: string,
  files: File[],
  paper: Board["paper"] = "lined",
  paperColor?: string,
): Promise<Board> {
  const user = await uid();
  const now = Date.now();
  const boardId = crypto.randomUUID();
  const docs = files.map((f, i) => newDoc(boardId, f, now + i));
  const board: Board = {
    id: boardId,
    name,
    createdAt: now,
    lastOpenedAt: now,
    pageCount: 0,
    lastPage: 1,
    dividerRatio: 0.5,
    paneVisibility: { pdf: true, notes: true },
    paper,
    paperColor,
    notePages: 1,
    activeDocId: docs[0]?.id,
    docCount: docs.length,
  };
  try {
    await pool(docs.map((d, i) => ({ d, f: files[i] })), 3, ({ d, f }) => uploadPdf(user, d.id, f));
    check(await sb().from("boards").insert({ id: boardId, ...toColumns(board, BOARD_COLS) }));
    if (docs.length) check(await sb().from("documents").insert(docs.map(docRow)));
  } catch (e) {
    // Don't leave a half-made board or orphan files behind.
    await sb().from("boards").delete().eq("id", boardId);
    await removePdfs(user, docs.map((d) => d.id));
    throw e;
  }
  return board;
}

export async function updateBoard(
  id: string,
  patch: Partial<Omit<Board, "id">>,
): Promise<Board | undefined> {
  const row = await write("boards", id, toColumns(patch, BOARD_COLS));
  return row ? toBoard(row as BoardRow) : undefined;
}

export async function deleteBoard(id: string): Promise<void> {
  const user = await uid();
  const docIds = (check(await sb().from("documents").select("id").eq("board_id", id)) as { id: string }[]).map(
    (d) => d.id,
  );
  const sceneFiles = check(await sb().storage.from("scene-files").list(`${user}/${id}`, { limit: 1000 })) ?? [];
  // The row goes first (documents, highlights and the scene cascade). If the file cleanup then fails,
  // only unreachable files are left, never a board with missing PDFs.
  check(await sb().from("boards").delete().eq("id", id));
  await removePdfs(user, docIds);
  if (sceneFiles.length) {
    await sb().storage.from("scene-files").remove(sceneFiles.map((f) => `${user}/${id}/${f.name}`));
  }
  uploaded.delete(id);
  versions.delete(id);
}

/* ---------- documents ---------- */

export async function listDocs(boardId: string): Promise<PdfDoc[]> {
  const rows = check(
    await sb().from("documents").select("*").eq("board_id", boardId).order("added_at", { ascending: true }),
  );
  return (rows as DocRow[]).map(toDoc);
}

export async function addDocs(boardId: string, files: File[]): Promise<PdfDoc[]> {
  const user = await uid();
  const now = Date.now();
  const docs = files.map((f, i) => newDoc(boardId, f, now + i));
  try {
    await pool(docs.map((d, i) => ({ d, f: files[i] })), 3, ({ d, f }) => uploadPdf(user, d.id, f));
    check(await sb().from("documents").insert(docs.map(docRow)));
  } catch (e) {
    await removePdfs(user, docs.map((d) => d.id));
    throw e;
  }
  const { count } = await sb().from("documents").select("id", { count: "exact", head: true }).eq("board_id", boardId);
  if (count !== null) await write("boards", boardId, { doc_count: count });
  return docs;
}

export async function getDocBlob(docId: string): Promise<Blob | undefined> {
  const { data, error } = await sb().storage.from("pdfs").download(`${await uid()}/${docId}`);
  return error ? undefined : data;
}

export async function updateDoc(
  docId: string,
  patch: Partial<Omit<PdfDoc, "id" | "boardId">>,
): Promise<void> {
  await write("documents", docId, toColumns(patch, DOC_COLS));
}

/** Removes a PDF with its highlights. A board always keeps at least one PDF. */
export async function removeDoc(docId: string): Promise<boolean> {
  const removed = check(await sb().rpc("remove_doc", { p_doc_id: docId })) as boolean;
  if (removed) await removePdfs(await uid(), [docId]);
  return removed;
}

/* ---------- highlights ---------- */

export async function listHighlights(boardId: string): Promise<Highlight[]> {
  const rows = check(await sb().from("highlights").select("data").eq("board_id", boardId));
  return (rows as { data: Highlight }[]).map((r) => r.data);
}

export async function saveHighlight(h: Highlight): Promise<void> {
  check(await sb().from("highlights").upsert({ id: h.id, board_id: h.boardId, doc_id: h.docId, data: h }));
}

export async function deleteHighlights(ids: string[]): Promise<void> {
  if (ids.length) check(await sb().from("highlights").delete().in("id", ids));
}

/* ---------- scenes (notes) ---------- */

interface FileMeta {
  mimeType: string;
  created: number;
}

/** Scene file ids already in Storage, per board, so each autosave only uploads new images. */
const uploaded = new Map<string, Set<string>>();
/** The scene row version this tab last saw: a save from a stale tab is refused, not merged. */
const versions = new Map<string, number>();
const saveChains = new Map<string, Promise<void>>();

function uploadedFor(boardId: string): Set<string> {
  let s = uploaded.get(boardId);
  if (!s) uploaded.set(boardId, (s = new Set()));
  return s;
}

export async function loadScene(boardId: string): Promise<SceneRecord | undefined> {
  const row = check(await sb().from("scenes").select("*").eq("board_id", boardId).maybeSingle()) as {
    elements: unknown[];
    app_state: Record<string, unknown>;
    files: Record<string, FileMeta>;
    version: number;
  } | null;
  if (!row) {
    versions.set(boardId, 0);
    return undefined;
  }
  versions.set(boardId, row.version);
  const user = await uid();
  const known = uploadedFor(boardId);
  const files: Record<string, unknown> = {};
  await pool(Object.entries(row.files), 6, async ([fileId, meta]) => {
    const { data } = await sb().storage.from("scene-files").download(`${user}/${boardId}/${fileId}`);
    if (!data) return; // a missing image is skipped; the rest of the notes still load
    known.add(fileId);
    files[fileId] = { id: fileId, mimeType: meta.mimeType, created: meta.created, dataURL: await blobToDataUrl(data) };
  });
  return { boardId, elements: row.elements, files, appState: row.app_state };
}

async function doSaveScene(scene: SceneRecord): Promise<void> {
  const user = await uid();
  const { boardId } = scene;
  const known = uploadedFor(boardId);
  const meta: Record<string, FileMeta> = {};
  const fresh: { id: string; dataURL: string; mimeType: string }[] = [];
  for (const [fileId, f] of Object.entries(scene.files)) {
    const file = f as { dataURL?: string; mimeType?: string; created?: number };
    meta[fileId] = { mimeType: file.mimeType ?? "image/png", created: file.created ?? Date.now() };
    if (!known.has(fileId) && file.dataURL) fresh.push({ id: fileId, dataURL: file.dataURL, mimeType: meta[fileId].mimeType });
  }
  await pool(fresh, 4, async ({ id, dataURL, mimeType }) => {
    const blob = await (await fetch(dataURL)).blob();
    const { error } = await sb()
      .storage.from("scene-files")
      .upload(`${user}/${boardId}/${id}`, blob, { contentType: mimeType, upsert: true });
    if (error) throw new Error(error.message);
    known.add(id);
  });

  const base = { elements: scene.elements, app_state: scene.appState, files: meta, updated_at: new Date().toISOString() };
  const seen = versions.get(boardId) ?? 0;
  if (seen === 0) {
    const { error } = await sb().from("scenes").insert({ board_id: boardId, ...base, version: 1 });
    if (error) throw new Error(error.code === "23505" ? "These notes changed in another tab or device. Reload to continue." : error.message);
    versions.set(boardId, 1);
    return;
  }
  const rows = check(
    await sb().from("scenes").update({ ...base, version: seen + 1 }).eq("board_id", boardId).eq("version", seen).select("version"),
  );
  if (!rows?.length) throw new Error("These notes changed in another tab or device. Reload to continue.");
  versions.set(boardId, seen + 1);
}

export function saveScene(scene: SceneRecord): Promise<void> {
  // One save at a time per board, so the version check never trips over our own earlier save.
  const prev = saveChains.get(scene.boardId) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => doSaveScene(scene));
  saveChains.set(scene.boardId, next);
  return next;
}

/* ---------- guest -> account upload ---------- */

/**
 * Uploads one board that was made as a guest. Every write is an upsert, so an interrupted upload can simply
 * be run again. The caller deletes the local copy only after this resolves.
 */
export async function importBoard(input: {
  board: Board;
  docs: PdfDoc[];
  blobs: Map<string, Blob>;
  highlights: Highlight[];
  scene?: SceneRecord;
}): Promise<void> {
  const user = await uid();
  const { board, docs, blobs, scene } = input;
  await pool(docs, 3, async (d) => {
    const blob = blobs.get(d.id);
    if (!blob) throw new Error(`The file for "${d.name}" is missing`);
    await uploadPdf(user, d.id, blob);
  });
  check(await sb().from("boards").upsert({ id: board.id, ...toColumns(board, BOARD_COLS) }));
  if (docs.length) check(await sb().from("documents").upsert(docs.map(docRow)));
  const docIds = new Set(docs.map((d) => d.id));
  const highlights = input.highlights.filter((h) => docIds.has(h.docId));
  if (highlights.length) {
    check(await sb().from("highlights").upsert(highlights.map((h) => ({ id: h.id, board_id: h.boardId, doc_id: h.docId, data: h }))));
  }
  if (scene) {
    // A half-finished earlier attempt may have left a scene row; start the scene fresh.
    check(await sb().from("scenes").delete().eq("board_id", board.id));
    versions.set(board.id, 0);
    await saveScene(scene);
  }
}

/* ---------- focus sessions ---------- */

export async function saveFocusSession(s: FocusSession): Promise<void> {
  check(await sb().from("focus_sessions").upsert({ id: s.id, board_id: s.boardId, started_at: s.startedAt, data: s }));
}

export async function listFocusSessions(): Promise<FocusSession[]> {
  const rows = check(await sb().from("focus_sessions").select("data").order("started_at", { ascending: false }));
  return (rows as { data: FocusSession }[]).map((r) => r.data);
}

/** The board's unfinished session, if any (the newest one). */
export async function getActiveFocusSession(boardId: string): Promise<FocusSession | undefined> {
  const rows = check(
    await sb()
      .from("focus_sessions")
      .select("data")
      .eq("board_id", boardId)
      .eq("data->>status", "active")
      .order("started_at", { ascending: false })
      .limit(1),
  );
  return (rows as { data: FocusSession }[])[0]?.data;
}

/** Closes stale active sessions of a board (e.g. left over from a crashed tab) except `keepId`. */
export async function closeOtherActiveSessions(boardId: string, keepId: string): Promise<void> {
  const rows = check(
    await sb().from("focus_sessions").select("data").eq("board_id", boardId).eq("data->>status", "active").neq("id", keepId),
  ) as { data: FocusSession }[];
  for (const { data: s } of rows) {
    await saveFocusSession({ ...s, status: "ended-early", endedAt: s.phaseStartedAt });
  }
}
