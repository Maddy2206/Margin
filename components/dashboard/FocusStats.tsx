import type { FocusSession } from "@/lib/types";
import { focusStats, formatMinutes } from "@/lib/focus";

/** Today / last 7 days / streak rows for the sidebar. Hidden until at least one focus session exists. */
export default function FocusStats({ sessions, now }: { sessions: FocusSession[]; now: number }) {
  if (sessions.length === 0) return null;
  const s = focusStats(sessions, now);
  const items: [string, string][] = [
    ["Today", formatMinutes(s.todayMs)],
    ["Last 7 days", formatMinutes(s.weekMs)],
    ["Streak", `${s.streak} ${s.streak === 1 ? "day" : "days"}`],
  ];
  return (
    <section aria-label="Focus stats" className="flex flex-col gap-3.5">
      <h2 className="m-0 px-2.5 font-[family-name:var(--font-body)] text-[11px] font-normal uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--color-text)_62%,transparent)]">
        Focus
      </h2>
      <div className="flex flex-col px-2.5">
        {items.map(([k, v], i) => (
          <div
            key={k}
            className={`flex items-baseline justify-between py-[9px] text-[13px] ${i < items.length - 1 ? "border-b border-[var(--color-divider)]" : ""}`}
          >
            <span className="text-[color-mix(in_srgb,var(--color-text)_72%,transparent)]">{k}</span>
            <span className="font-[family-name:var(--font-heading)] text-lg font-semibold tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
