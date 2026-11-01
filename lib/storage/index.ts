import * as local from "./local";
import * as cloud from "./cloud";
import { supabase } from "../supabase";

// The one storage API the app imports. Each call picks where the data lives:
// the signed-in user's Supabase account, or this browser's IndexedDB for guests.
type Backend = typeof local;

async function backend(): Promise<Backend> {
  if (!supabase) return local;
  const { data } = await supabase.auth.getSession();
  return data.session ? cloud : local;
}

type Args<K extends keyof Backend> = Parameters<Backend[K]>;

export const listBoards = async () => (await backend()).listBoards();
export const getBoard = async (...a: Args<"getBoard">) => (await backend()).getBoard(...a);
export const createBoard = async (...a: Args<"createBoard">) => (await backend()).createBoard(...a);
export const updateBoard = async (...a: Args<"updateBoard">) => (await backend()).updateBoard(...a);
export const deleteBoard = async (...a: Args<"deleteBoard">) => (await backend()).deleteBoard(...a);

export const listDocs = async (...a: Args<"listDocs">) => (await backend()).listDocs(...a);
export const addDocs = async (...a: Args<"addDocs">) => (await backend()).addDocs(...a);
export const getDocBlob = async (...a: Args<"getDocBlob">) => (await backend()).getDocBlob(...a);
export const updateDoc = async (...a: Args<"updateDoc">) => (await backend()).updateDoc(...a);
export const removeDoc = async (...a: Args<"removeDoc">) => (await backend()).removeDoc(...a);

export const listHighlights = async (...a: Args<"listHighlights">) => (await backend()).listHighlights(...a);
export const saveHighlight = async (...a: Args<"saveHighlight">) => (await backend()).saveHighlight(...a);
export const deleteHighlights = async (...a: Args<"deleteHighlights">) => (await backend()).deleteHighlights(...a);

export const loadScene = async (...a: Args<"loadScene">) => (await backend()).loadScene(...a);
export const saveScene = async (...a: Args<"saveScene">) => (await backend()).saveScene(...a);

export const saveFocusSession = async (...a: Args<"saveFocusSession">) => (await backend()).saveFocusSession(...a);
export const listFocusSessions = async () => (await backend()).listFocusSessions();
export const getActiveFocusSession = async (...a: Args<"getActiveFocusSession">) => (await backend()).getActiveFocusSession(...a);
export const closeOtherActiveSessions = async (...a: Args<"closeOtherActiveSessions">) => (await backend()).closeOtherActiveSessions(...a);
