"use client";

import { useEffect, useRef, useState } from "react";
import {
  Group,
  Panel,
  Separator,
  useGroupRef,
  usePanelRef,
  type Layout,
} from "react-resizable-panels";
import type { PaneVisibility } from "@/lib/types";

interface Props {
  ratio: number;
  visibility: PaneVisibility;
  /** Phones: PDF above notes instead of side by side, with its own remembered divider position. */
  stacked?: boolean;
  onRatioChange: (ratio: number) => void;
  onVisibilityChange: (v: PaneVisibility) => void;
  pdf: React.ReactNode;
  notes: React.ReactNode;
}

const STACK_KEY = "pdfnote.stackRatio";
const STACK_DEFAULT = 0.45;

/** The phone divider position is a per-browser convenience, kept apart from the board's saved ratio. */
function readStackRatio() {
  try {
    const v = parseFloat(localStorage.getItem(STACK_KEY) ?? "");
    if (v > 0.1 && v < 0.9) return v;
  } catch {}
  return STACK_DEFAULT;
}

/** PDF | draggable divider | notes (or PDF over notes when stacked). Closed panes stay mounted but collapsed. */
export default function SplitLayout({
  ratio,
  visibility,
  stacked = false,
  onRatioChange,
  onVisibilityChange,
  pdf,
  notes,
}: Props) {
  const groupRef = useGroupRef();
  const pdfRef = usePanelRef();
  const notesRef = usePanelRef();
  const visRef = useRef(visibility);
  const [stackRatio, setStackRatio] = useState(readStackRatio);
  const active = stacked ? stackRatio : ratio;
  const activeRef = useRef(active);
  useEffect(() => {
    visRef.current = visibility;
    activeRef.current = active;
  }, [visibility, active]);

  // Drive the panels from the saved/toggled visibility.
  useEffect(() => {
    const sync = (
      ref: typeof pdfRef,
      shouldShow: boolean,
    ) => {
      const p = ref.current;
      if (!p) return;
      if (shouldShow && p.isCollapsed()) {
        p.expand();
        // A pane that was closed before a reload has no remembered size.
        if (visRef.current.pdf && visRef.current.notes) {
          const share = ref === pdfRef ? activeRef.current : 1 - activeRef.current;
          p.resize(`${share * 100}%`);
        }
      }
      if (!shouldShow && !p.isCollapsed()) p.collapse();
    };
    sync(pdfRef, visibility.pdf);
    sync(notesRef, visibility.notes);
  }, [visibility, pdfRef, notesRef]);

  // Rotating the phone swaps the axis; put the divider where that layout last had it.
  const wasStacked = useRef(stacked);
  useEffect(() => {
    if (wasStacked.current === stacked) return;
    wasStacked.current = stacked;
    if (!visRef.current.pdf || !visRef.current.notes) return;
    const share = activeRef.current * 100;
    groupRef.current?.setLayout({ pdf: share, notes: 100 - share });
  }, [stacked, groupRef]);

  // Dragging a pane to zero closes it.
  function reportCollapse(key: keyof PaneVisibility, percent: number) {
    const open = percent > 0;
    if (visRef.current[key] !== open) {
      onVisibilityChange({ ...visRef.current, [key]: open });
    }
  }

  function layoutChanged(layout: Layout) {
    const p = layout.pdf;
    const n = layout.notes;
    if (!(p > 0 && n > 0)) return;
    const next = p / (p + n);
    if (stacked) {
      setStackRatio(next);
      try {
        localStorage.setItem(STACK_KEY, String(next));
      } catch {}
    } else {
      onRatioChange(next);
    }
  }

  const pdfStart = visibility.pdf ? (visibility.notes ? active * 100 : 100) : 0;
  return (
    <Group
      groupRef={groupRef}
      orientation={stacked ? "vertical" : "horizontal"}
      defaultLayout={{ pdf: pdfStart, notes: 100 - pdfStart }}
      onLayoutChanged={layoutChanged}
      resizeTargetMinimumSize={{ coarse: 36, fine: 10 }}
      className="h-full"
    >
      <Panel
        id="pdf"
        panelRef={pdfRef}
        collapsible
        collapsedSize={0}
        minSize="15%"
        onResize={(s) => reportCollapse("pdf", s.asPercentage)}
      >
        <div className="h-full overflow-hidden">{pdf}</div>
      </Panel>
      <Separator
        className={`group flex flex-none touch-none items-center justify-center bg-[var(--color-bg)] transition-colors hover:bg-[var(--color-accent-100)] data-[separator=active]:bg-[var(--color-accent-100)] ${
          stacked ? "h-3 w-full flex-col" : "w-2.5"
        }`}
      >
        <span
          className={
            stacked
              ? "h-1 w-12 rounded-full bg-[var(--color-neutral-400)] group-data-[separator=active]:bg-[var(--color-accent)]"
              : "w-0.5 self-stretch bg-[var(--color-divider)]"
          }
        />
      </Separator>
      <Panel
        id="notes"
        panelRef={notesRef}
        collapsible
        collapsedSize={0}
        minSize="15%"
        onResize={(s) => reportCollapse("notes", s.asPercentage)}
      >
        <div className="h-full overflow-hidden">{notes}</div>
      </Panel>
    </Group>
  );
}
