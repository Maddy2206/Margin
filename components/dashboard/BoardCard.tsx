"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Board } from "@/lib/types";
import { paperColorOf, paperCss } from "@/lib/paper";

function timeAgo(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function BoardCard({
  board,
  onRename,
  onDelete,
}: {
  board: Board;
  onRename: (id: string, name: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEdit() {
    setDraft(board.name);
    setError(null);
    setEditing(true);
  }

  async function commit() {
    const name = draft.trim();
    if (!name) {
      setError("Name can't be empty.");
      return;
    }
    if (name !== board.name) await onRename(board.id, name);
    setEditing(false);
  }

  async function confirmDelete() {
    setBusy(true);
    await onDelete(board.id);
  }

  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  const menuItem =
    "block w-full px-2.5 py-2 text-left text-[13.5px] hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]";
  const docs = board.docCount ?? 1;
  const color = paperColorOf(board.paper, board.paperColor);
  const lined = board.paper === "lined";
  const ease = "transform .5s cubic-bezier(.2,.75,.15,1)";
  const under = (bg: string, transform: string): React.CSSProperties => ({
    position: "absolute", inset: "16px 14px 0 14px", background: bg, boxShadow: "var(--shadow-sm)", transform, transition: ease,
  });

  return (
    <div className="relative flex flex-col gap-3.5">
      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            value={draft}
            autoFocus
            aria-label="Board name"
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="input"
          />
          {error && <p className="m-0 text-sm text-[var(--pen-red)]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={commit} className="btn btn-primary">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <Link
            href={`/board/${board.id}`}
            aria-label={`Open ${board.name}`}
            className="relative block h-[220px] !text-inherit no-underline"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
          >
            {docs >= 3 && <span style={under("#efece5", hover ? "rotate(-5deg) translate(-12px, 2px)" : "rotate(-2.4deg) translate(-5px, 3px)")} />}
            {docs >= 2 && <span style={under("#f5f2ec", hover ? "rotate(3.5deg) translate(10px, -2px)" : "rotate(1.6deg) translate(4px, 2px)")} />}
            <span
              className="absolute flex flex-col overflow-hidden"
              style={{
                inset: "16px 14px 0 14px",
                ...paperCss(board.paper, color, 28),
                boxShadow: hover ? "var(--shadow-lg)" : "var(--shadow-md)",
                transform: hover ? "translateY(-6px) rotate(-0.6deg)" : "none",
                transition: `${ease}, box-shadow .5s`,
                padding: `22px 18px 0 ${lined ? 50 : 20}px`,
              }}
            >
              {lined && <span className="absolute inset-y-0 left-9 w-[1.5px] bg-[var(--margin-red)]" />}
              <span className="line-clamp-2 font-[family-name:var(--font-caveat)] text-[25px] font-medium leading-7 text-[#2d2b2b]">
                {board.name}
              </span>
            </span>
            <span
              className="absolute left-7 top-[-1px] rounded-t-[var(--radius-md)] border border-b-0 border-[var(--color-divider)] px-2.5 pb-1 pt-[3px] text-[10.5px] tracking-[0.04em] tabular-nums text-[var(--color-neutral-800)]"
              style={{ background: color, transform: hover ? "translateY(-6px) rotate(-0.6deg)" : "none", transition: ease }}
            >
              {docs} {docs === 1 ? "PDF" : "PDFs"}
            </span>
          </Link>
          <div className="flex items-start gap-2">
            <Link href={`/board/${board.id}`} className="flex min-w-0 flex-1 flex-col gap-[3px] !text-inherit no-underline">
              <span className="truncate font-[family-name:var(--font-heading)] text-[21px] font-semibold leading-[1.15]">{board.name}</span>
              <span className="text-[12.5px] text-[color-mix(in_srgb,var(--color-text)_66%,transparent)]">
                {board.paper[0].toUpperCase() + board.paper.slice(1)} notebook · opened {timeAgo(board.lastOpenedAt)}
              </span>
            </Link>
            <span className="relative flex-none" onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-icon"
                style={{ width: 30, height: 30 }}
                aria-label="Board actions"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu((m) => !m);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
              {menu && (
                <div
                  role="menu"
                  className="absolute right-0 top-9 z-20 flex w-44 flex-col rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-bg)] p-1 shadow-[var(--shadow-md)]"
                >
                  <Link role="menuitem" href={`/board/${board.id}`} className={`${menuItem} !text-[var(--color-text)] no-underline`}>
                    Open
                  </Link>
                  <button
                    role="menuitem"
                    className={menuItem}
                    onClick={() => {
                      setMenu(false);
                      startEdit();
                    }}
                  >
                    Rename
                  </button>
                  <button
                    role="menuitem"
                    className={`${menuItem} border-t border-[var(--color-divider)] !text-[var(--color-accent-700)] hover:!bg-[var(--color-accent-100)]`}
                    onClick={() => {
                      setMenu(false);
                      setConfirming(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </span>
          </div>
        </>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete board"
          className="dialog-backdrop z-50"
          onKeyDown={(e) => e.key === "Escape" && !busy && setConfirming(false)}
        >
          <div className="dialog" style={{ background: "var(--color-bg)" }}>
            <div className="dialog-title" style={{ fontSize: 24 }}>Delete this board?</div>
            <div className="dialog-body">
              &ldquo;{board.name}&rdquo; with all its PDFs, notes and highlights will be deleted. This can&apos;t be undone.
            </div>
            <div className="dialog-actions">
              <button autoFocus disabled={busy} onClick={() => setConfirming(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button disabled={busy} onClick={confirmDelete} className="btn btn-primary">
                {busy ? "Deleting..." : "Delete board"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
