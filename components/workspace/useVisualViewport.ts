"use client";

import { useEffect, useState } from "react";

export interface KeyboardState {
  /** The on-screen keyboard is covering the bottom of the page. */
  open: boolean;
  /** The part of the screen left above it (and where that part starts). */
  height: number;
  top: number;
  /** A text field inside `[data-pane="notes"]` has focus. */
  inNotes: boolean;
}

const CLOSED: KeyboardState = { open: false, height: 0, top: 0, inNotes: false };

/**
 * Tracks the on-screen keyboard through the visual viewport, so the workspace can shrink
 * to the visible part instead of sliding under it. A pinch zoom also shrinks the visual
 * viewport, so it is ignored unless the page is at normal scale. Off (and closed) when `enabled` is false.
 */
export function useVisualViewport(enabled: boolean): KeyboardState {
  const [state, setState] = useState<KeyboardState>(CLOSED);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) return;
    const update = () => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el?.closest("input, textarea, [contenteditable='true']");
      const open = typing && Math.abs(vv.scale - 1) < 0.01 && window.innerHeight - vv.height > 120;
      const next: KeyboardState = open
        ? { open, height: vv.height, top: vv.offsetTop, inNotes: !!el?.closest('[data-pane="notes"]') }
        : CLOSED;
      setState((prev) =>
        prev.open === next.open &&
        prev.height === next.height &&
        prev.top === next.top &&
        prev.inNotes === next.inNotes
          ? prev
          : next,
      );
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      setState(CLOSED);
    };
  }, [enabled]);

  return enabled ? state : CLOSED;
}
