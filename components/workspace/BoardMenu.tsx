"use client";

import { useRef, useState } from "react";
import { useDismiss } from "@/components/ui/useDismiss";
import PageStylePicker from "@/components/ui/PageStylePicker";
import type { Paper } from "@/lib/types";

/** The phone header's "⋯" menu: the actions the full header shows as separate buttons. */
export default function BoardMenu({
  paper,
  color,
  onStyleChange,
  onFocus,
  onDownload,
  downloadDisabled,
  downloading,
}: {
  paper: Paper;
  color: string;
  onStyleChange: (paper: Paper, color: string) => void;
  onFocus: () => void;
  onDownload: () => void;
  downloadDisabled: boolean;
  downloading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Board menu"
        className="btn btn-icon !h-10 !w-10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Board menu"
          className="absolute right-0 top-full z-50 mt-1 max-h-[calc(100dvh-4rem)] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto border border-[var(--color-divider)] bg-white p-3 text-black shadow-[var(--shadow-md)]"
        >
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              role="menuitem"
              className="btn btn-secondary !h-11"
              onClick={() => {
                setOpen(false);
                onFocus();
              }}
            >
              Focus session
            </button>
            <button
              role="menuitem"
              className="btn btn-secondary !h-11"
              disabled={downloadDisabled || downloading}
              onClick={() => {
                setOpen(false);
                onDownload();
              }}
            >
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
          </div>
          <PageStylePicker paper={paper} color={color} onChange={onStyleChange} />
        </div>
      )}
    </div>
  );
}
