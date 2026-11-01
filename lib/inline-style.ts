import type { CSSProperties, MouseEvent, FocusEvent } from "react";

/** Turns a CSS declaration string ("a-b:c;d:e") into a React style object. Used by the notebook pages, whose markup comes straight from the design files. */
export function css(s: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const key = decl.slice(0, i).trim();
    if (!key) continue;
    out[key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = decl.slice(i + 1).trim();
  }
  return out as CSSProperties;
}

function overlay(spec: string) {
  const pairs = spec
    .split(";")
    .map((d) => {
      const i = d.indexOf(":");
      return i < 0 ? null : ([d.slice(0, i).trim(), d.slice(i + 1).trim()] as const);
    })
    .filter((p): p is readonly [string, string] => !!p && !!p[0]);
  const saved = new WeakMap<HTMLElement, string[]>();
  const on = (el: HTMLElement) => {
    saved.set(el, pairs.map(([k]) => el.style.getPropertyValue(k)));
    for (const [k, val] of pairs) el.style.setProperty(k, val);
  };
  const off = (el: HTMLElement) => {
    const prev = saved.get(el);
    pairs.forEach(([k], i) => el.style.setProperty(k, prev?.[i] ?? ""));
  };
  return { on, off };
}

/** Hover styling for inline-styled elements (the design files use a `style-hover` attribute). */
export function hov(spec: string) {
  const o = overlay(spec);
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => o.on(e.currentTarget),
    onMouseLeave: (e: MouseEvent<HTMLElement>) => o.off(e.currentTarget),
  };
}

/** Focus styling for inline-styled elements (`style-focus`). */
export function foc(spec: string) {
  const o = overlay(spec);
  return {
    onFocus: (e: FocusEvent<HTMLElement>) => o.on(e.currentTarget),
    onBlur: (e: FocusEvent<HTMLElement>) => o.off(e.currentTarget),
  };
}
