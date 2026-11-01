"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authEnabled, displayName, signOut, useUser } from "@/lib/auth";
import { countLocalBoards, uploadLocalBoards } from "@/lib/storage/migrate";
import { formatToday } from "@/lib/today";
import { deleteBoard, listBoards, listFocusSessions, updateBoard } from "@/lib/storage";
import type { Board, FocusSession } from "@/lib/types";
import FocusStats from "@/components/dashboard/FocusStats";
import BoardCard from "@/components/dashboard/BoardCard";
import CreateBoardDialog from "@/components/dashboard/CreateBoardDialog";

type Sort = "recent" | "name" | "created";
const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "name", label: "Name" },
  { id: "created", label: "Created" },
];

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [uploading, setUploading] = useState<{ done: number; total: number; name: string } | null>(null);
  const [uploadFailed, setUploadFailed] = useState<{ name: string; error: string }[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [statsNow, setStatsNow] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [today, setToday] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    const stamp = formatToday;
    listBoards()
      .then((l) => {
        setBoards(l);
        setToday(stamp());
      })
      .catch(() => {
        setStorageError(true);
        setBoards([]);
        setToday(stamp());
      });
    listFocusSessions()
      .then((l) => {
        setSessions(l);
        setStatsNow(Date.now());
      })
      .catch(() => {});
  }, []);

  // Boards made as a guest are still in this browser: offer to move them into the account.
  useEffect(() => {
    if (user) countLocalBoards().then(setLocalCount);
  }, [user]);

  function refresh() {
    listBoards().then(setBoards).catch(() => {});
    listFocusSessions()
      .then((l) => {
        setSessions(l);
        setStatsNow(Date.now());
      })
      .catch(() => {});
  }

  async function uploadBoards() {
    setUploadFailed([]);
    setUploading({ done: 0, total: localCount, name: "" });
    try {
      const r = await uploadLocalBoards((done, total, name) => setUploading({ done, total, name }));
      setUploadFailed(r.failed);
    } catch {
      setUploadFailed([{ name: "your boards", error: "Couldn't read the boards stored in this browser." }]);
    }
    setUploading(null);
    setLocalCount(await countLocalBoards());
    refresh();
  }

  // "/" focuses the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA/.test(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (boards ?? []).filter((b) => b.name.toLowerCase().includes(q));
    return list.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "created"
          ? b.createdAt - a.createdAt
          : b.lastOpenedAt - a.lastOpenedAt,
    );
  }, [boards, query, sort]);

  async function rename(id: string, name: string) {
    try {
      await updateBoard(id, { name });
      setBoards((bs) => bs && bs.map((b) => (b.id === id ? { ...b, name } : b)));
      setActionError(false);
    } catch {
      setActionError(true);
    }
  }

  async function remove(id: string) {
    try {
      await deleteBoard(id);
      setBoards((bs) => bs && bs.filter((b) => b.id !== id));
      setActionError(false);
    } catch {
      setActionError(true);
    }
  }

  const hasBoards = (boards?.length ?? 0) > 0;
  const label = "text-[0.6875rem] uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--color-text)_62%,transparent)]";

  return (
    <div className="nb nb-page flex flex-wrap">
      <aside
        className="relative z-[5] flex w-full flex-none flex-col gap-[30px] border-b border-r-0 border-[var(--color-divider)] bg-[var(--paper)] px-[22px] py-6 md:sticky md:top-0 md:h-screen md:w-[248px] md:border-b-0 md:border-r-[6px] md:border-double md:border-r-[var(--margin-red)]"
      >
        <Link href="/" className="font-[family-name:var(--font-heading)] text-[1.625rem] font-semibold tracking-[-0.01em] !text-[var(--color-text)] no-underline">
          Margin
        </Link>
        <button onClick={() => setCreating(true)} className="btn btn-primary !h-10 !justify-start gap-2 !text-[0.9375rem]">
          <PlusIcon />
          New board
        </button>
        <nav aria-label="Library" className="flex flex-col gap-1">
          <span className={`${label} px-2.5 pb-1.5`}>Library</span>
          <span className="flex items-center justify-between rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-2.5 py-2 text-sm">
            <span>All boards</span>
            <span className="text-xs tabular-nums text-[var(--color-accent-700)]">{boards?.length ?? 0}</span>
          </span>
        </nav>
        <FocusStats sessions={sessions} now={statsNow} />
        <div
          aria-hidden="true"
          className="mt-auto flex -rotate-3 items-center gap-2.5 px-2.5 font-[family-name:var(--font-caveat)] text-[1.1875rem] leading-[1.05] text-[var(--pen-red)]"
        >
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none" stroke="#e0a526" className="flex-none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3 L21 13 L32 13 L23 20 L27 31 L17 24 L7 31 L11 20 L2 13 L13 13 Z" />
          </svg>
          <span>
            finals in 3 weeks.
            <br />
            don&rsquo;t panic.
          </span>
        </div>
        <div className="flex flex-col gap-2 px-2.5 text-[0.7812rem] leading-normal text-[color-mix(in_srgb,var(--color-text)_66%,transparent)]">
          {user ? (
            <>
              <span>
                Signed in as <strong>{displayName(user)}</strong>. Boards are saved to your account.
              </span>
              <button
                onClick={() => signOut().then(() => router.push("/login"))}
                className="w-fit border-0 bg-transparent p-0 text-left text-[inherit] text-[var(--color-accent-700)] underline underline-offset-[3px]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <span>Boards are saved in this browser.</span>
              {user === null && authEnabled() && (
                <Link href="/login" className="no-underline">
                  Sign in to keep them across devices
                </Link>
              )}
            </>
          )}
          <Link href="/" className="no-underline">
            About Margin
          </Link>
        </div>
      </aside>

      <main className="relative min-w-0 flex-[1_1_560px] px-[clamp(20px,4vw,64px)] pb-24 pt-[clamp(28px,4vw,56px)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[clamp(8px,1.6vw,24px)] w-0.5 bg-[var(--margin-red)]" />
        <header className="flex flex-wrap items-end gap-x-7 gap-y-5 pb-7">
          <div className="mr-auto flex flex-col gap-1.5">
            <span className="min-h-[1.2em] font-[family-name:var(--font-caveat)] text-[1.375rem] text-[var(--pen-blue)]">{today}</span>
            <h1 className="relative m-0 font-[family-name:var(--font-heading)] text-[clamp(40px,4.6vw,64px)] font-normal leading-none tracking-[-0.015em]">
              Your desk
              <span
                aria-hidden="true"
                className="absolute left-[calc(100%+18px)] top-1.5 hidden -rotate-5 whitespace-nowrap font-[family-name:var(--font-caveat)] text-xl leading-[1.05] tracking-normal text-[var(--pen-red)] sm:block"
              >
                &larr; all my
                <br />
                subjects!!
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-[min(300px,100%)]">
              <svg className="pointer-events-none absolute left-[11px] top-[11px] opacity-60" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={searchRef}
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search boards"
                aria-label="Search boards"
                style={{ paddingLeft: 34, paddingRight: 34, height: 38 }}
              />
              <span className="pointer-events-none absolute right-[9px] top-[9px] rounded-[var(--radius-sm)] border border-[var(--color-divider)] px-1.5 text-[0.6875rem] leading-[18px] text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                /
              </span>
            </div>
            <div className="seg" role="group" aria-label="Sort">
              {SORTS.map((o) => (
                <button key={o.id} className="seg-opt" aria-pressed={sort === o.id} onClick={() => setSort(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="mb-9 h-0.5 bg-[var(--rule-strong)]" />

        {storageError && (
          <p role="alert" className="mb-6 bg-[var(--color-accent-100)] px-3 py-2 text-sm text-[var(--color-accent-800)]">
            Couldn&apos;t open browser storage, so your boards can&apos;t be loaded or saved. Check that
            storage isn&apos;t blocked (for example in a private window) and reload.
          </p>
        )}

        {user && (localCount > 0 || uploading) && (
          <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-[var(--color-accent)] bg-[var(--color-accent-100)] px-3 py-2.5 text-sm text-[var(--color-accent-800)]">
            {uploading ? (
              <span>
                Uploading {Math.min(uploading.done + 1, uploading.total)} of {uploading.total}
                {uploading.name ? `: ${uploading.name}` : ""}. Keep this tab open.
              </span>
            ) : (
              <>
                <span>
                  {localCount === 1 ? "1 board is" : `${localCount} boards are`} still only in this browser.
                  Upload {localCount === 1 ? "it" : "them"} to your account to keep {localCount === 1 ? "it" : "them"} safe and see {localCount === 1 ? "it" : "them"} on every device.
                </span>
                <button onClick={uploadBoards} className="btn btn-primary !h-8 !px-3 !text-[0.8125rem]">
                  Upload {localCount === 1 ? "board" : `${localCount} boards`}
                </button>
              </>
            )}
          </div>
        )}

        {uploadFailed.length > 0 && (
          <div role="alert" className="mb-6 bg-[var(--color-accent-100)] px-3 py-2 text-sm text-[var(--color-accent-800)]">
            Couldn&apos;t upload {uploadFailed.map((f) => `“${f.name}” (${f.error})`).join(", ")}. They are still in this
            browser, so nothing is lost. Try again in a moment.
          </div>
        )}

        {actionError && (
          <p role="alert" className="mb-6 bg-[var(--color-accent-100)] px-3 py-2 text-sm text-[var(--color-accent-800)]">
            That change didn&apos;t save. Check your connection and try again.
          </p>
        )}

        {boards !== null && !hasBoards && <EmptyDesk onCreate={() => setCreating(true)} />}

        {(boards === null || hasBoards) && (
        <section aria-labelledby="boards">
          <div className="mb-[26px] flex items-baseline gap-3">
            <h2 id="boards" className="m-0 font-[family-name:var(--font-body)] text-xs font-normal uppercase tracking-[0.1em]">
              {query ? "Results" : sort === "recent" ? "Recently opened" : sort === "name" ? "A to Z" : "Newest first"}
            </h2>
            <span className="text-xs tabular-nums text-[color-mix(in_srgb,var(--color-text)_62%,transparent)]">
              {shown.length} {shown.length === 1 ? "board" : "boards"}
            </span>
          </div>
          {boards === null ? (
            <p>Loading...</p>
          ) : (
            <div className="grid gap-x-9 gap-y-12" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))" }}>
              {!query && (
                <button onClick={() => setCreating(true)} className="flex flex-col gap-3.5 border-0 bg-transparent p-0 text-left text-inherit">
                  <span className="grid h-[220px] w-full place-items-center rounded-[var(--radius-sm)] border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--color-accent)_70%,transparent)] transition hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]">
                    <span className="flex flex-col items-center gap-1.5 font-[family-name:var(--font-caveat)] text-[1.875rem] text-[var(--color-accent-700)]">
                      <span className="text-[2.75rem] leading-[0.8]">+</span>
                      new board
                    </span>
                  </span>
                  <span className="flex flex-col gap-[3px]">
                    <span className="font-[family-name:var(--font-heading)] text-[1.3125rem] font-semibold leading-[1.15]">Start a board</span>
                    <span className="text-[0.7812rem] text-[color-mix(in_srgb,var(--color-text)_66%,transparent)]">Upload one or more PDFs</span>
                  </span>
                </button>
              )}
              {shown.map((b) => (
                <BoardCard key={b.id} board={b} onRename={rename} onDelete={remove} />
              ))}
            </div>
          )}
          {boards !== null && query && shown.length === 0 && (
            <p className="mt-3 font-[family-name:var(--font-caveat)] text-2xl text-[color-mix(in_srgb,var(--color-text)_60%,transparent)]">
              No boards match &ldquo;{query}&rdquo;.
            </p>
          )}
        </section>
        )}
      </main>

      {creating && <CreateBoardDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

/** Shown when the library is empty: a PDF page turning into a handwritten notebook page. */
function EmptyDesk({ onCreate }: { onCreate: () => void }) {
  const ruled = "repeating-linear-gradient(to bottom,transparent 0 27px,color-mix(in srgb,var(--color-text) 12%,transparent) 27px 28px)";
  const hand = "flex h-7 items-end pb-[3px] font-[family-name:var(--font-caveat)] text-[1.3125rem] leading-none";
  return (
    <section className="flex flex-wrap items-center gap-x-[72px] gap-y-14 pb-12 pt-6">
      <div className="flex max-w-[460px] flex-[1_1_320px] flex-col gap-5">
        <span className="text-xs uppercase tracking-[0.1em] text-[var(--color-accent-700)]">Your first board</span>
        <h2 className="m-0 font-[family-name:var(--font-heading)] text-[clamp(34px,3.6vw,50px)] font-normal leading-[1.04]">
          A board is one subject on one desk.
        </h2>
        <p className="m-0 text-base leading-[1.7] text-[color-mix(in_srgb,var(--color-text)_78%,transparent)]">
          Put the PDFs for a course or topic in a board. Read them on the left, highlight what matters, and it lands in the notebook on the right in your handwriting.
        </p>
        <div className="mt-1.5">
          <button onClick={onCreate} className="btn btn-primary !h-11 !px-5 !text-base">
            Create your first board
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="relative hidden h-[380px] max-w-[620px] flex-[1_1_420px] min-[900px]:block">
        <div className="absolute left-0 top-5 flex h-80 w-[52%] -rotate-2 flex-col gap-2 bg-[var(--color-neutral-100)] px-6 py-[22px] shadow-[var(--shadow-md)]">
          <div className="mb-1.5 border-b border-[var(--color-neutral-300)] pb-1.5 text-[0.5625rem] uppercase tracking-[0.08em] text-[var(--color-neutral-700)]">Your PDF · p. 1</div>
          {[100, 92, 97].map((w) => (
            <div key={w} className="h-[5px] bg-[var(--color-neutral-300)]" style={{ width: `${w}%` }} />
          ))}
          {[100, 68].map((w) => (
            <div key={w} className="-my-[3px] h-[11px] bg-[var(--color-accent-200)] shadow-[inset_0_-1.5px_0_var(--color-accent)]" style={{ width: `${w}%` }} />
          ))}
          {[88, 100, 60].map((w) => (
            <div key={w} className="h-[5px] bg-[var(--color-neutral-300)]" style={{ width: `${w}%` }} />
          ))}
        </div>
        <svg viewBox="0 0 120 60" className="absolute left-[43%] top-24 z-[2] h-[60px] w-[120px] overflow-visible" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 40 C 40 4, 80 4, 112 26" />
          <path d="M100 16 L113 27 L98 33" />
        </svg>
        <div
          className="absolute right-0 top-11 h-80 w-[52%] rotate-[1.5deg] bg-[#fffdf8] pl-[46px] pr-[18px] pt-7 shadow-[var(--shadow-lg)]"
          style={{ backgroundImage: ruled }}
        >
          <div className="absolute inset-y-0 left-[34px] w-[1.5px] bg-[var(--margin-red)]" />
          <div className={`${hand} !text-[1.5625rem] font-medium text-[#2d2b2b]`}>Your notebook</div>
          <div className="h-7" />
          <div className={`${hand} text-[#1e3a8a]`}>the passage you highlighted,</div>
          <div className={`${hand} text-[#1e3a8a]`}>word for word, in your hand</div>
          <div className="h-7" />
          <div className={`${hand} text-[var(--color-accent-700)]`}>+ your own arrows &amp; sketches</div>
        </div>
      </div>
    </section>
  );
}
