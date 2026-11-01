"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBoard } from "@/lib/storage";
import { validatePdf } from "@/lib/pdf-validate";
import type { Paper } from "@/lib/types";
import PdfDropzone from "@/components/ui/PdfDropzone";
import PageStylePicker from "@/components/ui/PageStylePicker";

export default function CreateBoardDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState<Paper>("lined");
  const [paperColor, setPaperColor] = useState("#fffdf8");

  async function addFiles(list: File[]) {
    setError(null);
    const good: File[] = [];
    const problems: string[] = [];
    for (const f of list) {
      const problem = await validatePdf(f);
      if (problem) problems.push(`${f.name}: ${problem}`);
      else good.push(f);
    }
    if (problems.length) setError(problems.join(" "));
    if (!good.length) return;
    setFiles((cur) => [...cur, ...good]);
    if (!name.trim()) setName(good[0].name.replace(/\.pdf$/i, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || !name.trim()) return;
    setBusy(true);
    try {
      const board = await createBoard(name.trim(), files, paper, paperColor);
      router.push(`/board/${board.id}`);
    } catch {
      setError("Couldn't save the board. Browser storage may be full or blocked.");
      setBusy(false);
    }
  }

  return (
    <div
      className="dialog-backdrop z-50 overflow-auto"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-divider)] bg-[var(--color-bg)] p-8 shadow-[var(--shadow-lg)]"
      >
        <h2 className="m-0 font-[family-name:var(--font-heading)] text-[34px] font-normal leading-none">New board</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600">Board name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Organic Chemistry, ch. 3"
            className="input"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-zinc-600">PDF files</span>
          <PdfDropzone
            files={files}
            onAdd={addFiles}
            onRemove={(i) => setFiles((cur) => cur.filter((_, j) => j !== i))}
          />
        </div>
        <PageStylePicker
          paper={paper}
          color={paperColor}
          onChange={(p, c) => {
            setPaper(p);
            setPaperColor(c);
          }}
        />
        {error && (
          <p role="alert" className="border-l-2 border-[var(--color-accent)] bg-[var(--color-accent-100)] px-3 py-2 text-[13px] text-[var(--color-accent-800)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={files.length === 0 || !name.trim() || busy}
            className="btn btn-primary"
          >
            {busy ? "Creating..." : "Create board"}
          </button>
        </div>
      </form>
    </div>
  );
}
