import type { PdfDoc } from "../types";

/** A fresh document record for an uploaded PDF (shared by the local and cloud backends). */
export function newDoc(boardId: string, file: File, addedAt: number): PdfDoc {
  return {
    id: crypto.randomUUID(),
    boardId,
    name: file.name.replace(/\.pdf$/i, "") || "Untitled",
    pageCount: 0,
    lastPage: 1,
    zoom: null,
    addedAt,
  };
}
