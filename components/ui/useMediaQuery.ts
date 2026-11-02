"use client";

import { useSyncExternalStore } from "react";

/** Media queries the workspace switches layout on (keep in sync with `@custom-variant compact` in globals.css). */
export const COMPACT_QUERY = "(max-width: 899px), (max-height: 500px)";
export const STACKED_QUERY = "(max-width: 899px) and (orientation: portrait)";

/** True while `query` matches. Renders as false on the server and first paint. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
