"use client";

import { useState } from "react";
import { MARKER_COLORS } from "@/lib/handwriting-fonts";

interface Props {
  x: number;
  y: number;
  /** Current note color and handwriting font, chosen in the toolbar above the PDF. */
  color: string;
  /** Light color of the highlight drawn over the PDF text. */
  marker: string;
  onMarker: (c: string) => void;
  fontLabel: string;
  fontFamily: string;
  onExport: () => void;
  onDismiss: () => void;
}

const HALF_WIDTH = 290; // about half the popout's width
/** Below this screen width the full popout doesn't fit, so a small pill is shown instead. */
export const DOCK_BELOW = 640;

/** Appears next to selected PDF text; one click sends it to the notes. */
export default function SelectionPopout({
  x,
  y,
  color,
  marker,
  onMarker,
  fontLabel,
  fontFamily,
  onExport,
  onDismiss,
}: Props) {
  const narrow = window.innerWidth < DOCK_BELOW;
  const [palette, setPalette] = useState(false);

  if (narrow) {
    // A small pill just under the selected text: the highlight color is one swatch that
    // opens the palette, so the Export button stays small. The browser's own Copy /
    // Select all bar and the selection handles sit around the text, so it is kept clear of them.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    return (
      <div
        data-popout
        onMouseDown={(e) => e.preventDefault()}
        style={{
          left: palette ? window.innerWidth / 2 : Math.min(Math.max(x, 110), window.innerWidth - 110),
          top: Math.min(y + (coarse ? 26 : 0), window.innerHeight - 56),
        }}
        className="fixed z-40 flex w-max max-w-[calc(100vw-16px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white p-1.5 text-sm text-black shadow-lg"
        role="dialog"
        aria-label="Highlight options"
      >
        {palette ? (
          <div className="flex items-center gap-1.5" role="listbox" aria-label="Highlight color">
            {MARKER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={marker === c.value}
                aria-label={`${c.label} highlight`}
                onClick={() => {
                  onMarker(c.value);
                  setPalette(false);
                }}
                className="h-7 w-7 shrink-0 rounded-full border border-black/25"
                style={{
                  background: c.value,
                  outline: marker === c.value ? "2px solid #111827" : "none",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-label="Highlight color"
            aria-expanded={false}
            className="h-8 w-8 shrink-0 rounded-full border border-black/25"
            style={{ background: marker }}
          />
        )}
        <button
          type="button"
          onClick={onExport}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white active:bg-indigo-700"
        >
          Export to board
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="px-1.5 text-xl leading-none text-zinc-500"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div
      data-popout
      // keep the text selection alive while using the popout
      onMouseDown={(e) => e.preventDefault()}
      style={{
        left: Math.min(Math.max(x, HALF_WIDTH), window.innerWidth - HALF_WIDTH),
        top: Math.min(y, window.innerHeight - 90),
      }}
      className="fixed z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-base text-black shadow-xl"
      role="dialog"
      aria-label="Highlight options"
    >
      <div className="flex items-center gap-1.5" role="listbox" aria-label="Highlight color">
        {MARKER_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={marker === c.value}
            aria-label={`${c.label} highlight`}
            title={`${c.label} highlight`}
            onClick={() => onMarker(c.value)}
            className="h-6 w-6 shrink-0 rounded-full border border-black/25"
            style={{
              background: c.value,
              outline: marker === c.value ? "2px solid #111827" : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
      <div
        className="flex items-center gap-2 text-zinc-900"
        title="Change the text color and font in the toolbar above the notes"
      >
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-black/25"
          style={{ background: color }}
          aria-hidden
        />
        <span className="text-xl leading-none" style={{ fontFamily }}>
          {fontLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onExport}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-indigo-700"
      >
        Export to board
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="px-1.5 text-2xl leading-none text-zinc-500 hover:text-zinc-800"
      >
        &times;
      </button>
    </div>
  );
}
