import * as local from "./local";
import * as cloud from "./cloud";

// Moves the boards a guest made in this browser into the signed-in account.
// One board at a time: its local copy is deleted only after that board fully uploaded, so a failure or a
// closed tab never loses anything, and running it again continues where it stopped.

export interface UploadResult {
  uploaded: number;
  failed: { name: string; error: string }[];
}

/** How many boards are waiting in this browser. 0 when browser storage is unavailable. */
export async function countLocalBoards(): Promise<number> {
  try {
    return (await local.listBoards()).length;
  } catch {
    return 0;
  }
}

export async function uploadLocalBoards(
  onProgress: (done: number, total: number, name: string) => void,
): Promise<UploadResult> {
  const boards = await local.listBoards();
  const result: UploadResult = { uploaded: 0, failed: [] };

  for (const [i, board] of boards.entries()) {
    onProgress(i, boards.length, board.name);
    try {
      const docs = await local.listDocs(board.id);
      const blobs = new Map<string, Blob>();
      for (const d of docs) {
        const blob = await local.getDocBlob(d.id);
        if (blob) blobs.set(d.id, blob);
      }
      await cloud.importBoard({
        board,
        docs,
        blobs,
        highlights: await local.listHighlights(board.id),
        scene: await local.loadScene(board.id),
      });
      await local.deleteBoard(board.id);
      result.uploaded++;
    } catch (e) {
      result.failed.push({ name: board.name, error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  // Focus history last: it belongs to the person, not to one board.
  try {
    const sessions = await local.listFocusSessions();
    for (const s of sessions) await cloud.saveFocusSession(s);
    await local.deleteFocusSessions(sessions.map((s) => s.id));
  } catch {
    // Kept in the browser; the next upload tries again.
  }

  onProgress(boards.length, boards.length, "");
  return result;
}
