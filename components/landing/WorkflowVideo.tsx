/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// The 20 s workflow demo in the hero. It keeps its own clock and state, so each frame redraws only this stage
// rather than the whole landing page, and it stops while off screen.
import { Fragment, useEffect, useRef, useState } from "react";
import { css } from "@/lib/inline-style";

const DURATION_MS = 20000;
const LOOP_HOLD_MS = 1800;

const CAPS = [
  { n: '01', t: 'Read' },
  { n: '02', t: 'Highlight' },
  { n: '03', t: 'Export' },
  { n: '04', t: 'Make it yours' },
  { n: '05', t: 'Download' }
];

const c = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function frame(sp: number, scale: number) {
  const seg = (a: number, b: number) => c((sp - a) / (b - a));
    const hl = seg(0.11, 0.22);
    const pop = seg(0.22, 0.25) * (1 - seg(0.31, 0.34));
    const split = ease(seg(0.31, 0.44));
    const slipIn = seg(0.29, 0.31), fly = ease(seg(0.31, 0.44));
    const slipOp = slipIn * (1 - seg(0.42, 0.46));
    const col = ease(seg(0.8, 0.87));
    const pdfX = lerp(270, 40, split), nbX = lerp(640, 480, split);
    const clipB = seg(0.57, 0.6) * (1 - seg(0.66, 0.68));
    const fig = ease(seg(0.6, 0.68));
    const fan = ease(seg(0.74, 0.78)) * (1 - col);
    const chip = seg(0.52, 0.56) * (1 - seg(0.79, 0.81));
    const file = ease(seg(0.84, 0.88)), prog = seg(0.87, 0.95);
    const R = [[0, 0.1], [0.1, 0.26], [0.26, 0.56], [0.56, 0.78], [0.78, 1]];
    const active = R.findIndex(([, b]) => sp < b || b === 1);
    const storyText = ['Mitochondria convert the chemical', 'energy in glucose into ATP through', 'cellular respiration, which is why', 'muscle cells contain thousands of them.'];
  return {
      caps: CAPS.map((k, i) => ({ ...k, op: i === active ? 1 : 0, tf: `translateY(${(i - active) * 18}px)` })),
      scale: scale.toFixed(3), deskH: Math.round(660 * scale) + 'px', deskW: Math.round(940 * scale) + 'px', deskVis: scale ? 'visible' : 'hidden',
      deskSaved: sp > 0.44 && sp < 0.52 ? 'Saving…' : 'Saved',
      splitC: split > 0.5 ? 'var(--color-accent-700)' : 'inherit', splitSh: split > 0.5 ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
      exBg: sp > 0.27 && sp < 0.31 ? 'var(--color-accent-200)' : 'var(--color-accent-100)', exTf: sp > 0.28 && sp < 0.3 ? 'scale(.94)' : 'none',
      dlBorder: sp > 0.79 ? 'var(--color-accent)' : 'var(--color-divider)', dlBg: sp > 0.79 ? 'var(--color-accent-100)' : 'transparent', dlC: sp > 0.79 ? 'var(--color-accent-700)' : 'var(--color-text)', dlBtnTf: sp > 0.8 && sp < 0.82 ? 'scale(.94)' : 'none',
      deskPdfTf: `translate(${pdfX.toFixed(1)}px, ${lerp(10, 0, seg(0, 0.08)).toFixed(1)}px) scale(${lerp(1, 0.92, col).toFixed(3)})`, deskPdfOp: (1 - 0.7 * col).toFixed(3),
      nbTf: `translateX(${nbX.toFixed(1)}px) rotate(${lerp(3, 0, split).toFixed(2)}deg) scale(${lerp(1, 0.62, col).toFixed(3)})`, nbOp: (split * (1 - 0.6 * col)).toFixed(3),
      hlSize: `${(hl * 100).toFixed(1)}% 100%`,
      hlLine: sp > 0.44 ? 'inset 0 -1.5px 0 var(--color-accent)' : 'none',
      popOp: pop.toFixed(3), popTf: `translateY(${((1 - seg(0.22, 0.25)) * 6).toFixed(1)}px)`,
      sSlipOp: slipOp.toFixed(3),
      sSlipTf: `translate(${lerp(310, 560, fly).toFixed(1)}px, ${lerp(262 - (1 - slipIn) * 8, 184, fly).toFixed(1)}px) rotate(${lerp(0, 2, fly).toFixed(2)}deg) scale(${lerp(1, 0.9, fly).toFixed(3)})`,
      storyLines: storyText.map((t, i) => { const v = seg(0.44 + i * 0.025, 0.47 + i * 0.025); return { t, clip: `inset(-10px ${((1 - v) * 100).toFixed(1)}% -10px 0)` }; }),
      clipOp: clipB.toFixed(3),
      figOp: fig.toFixed(3), figTf: `translate(${lerp(-120, 0, fig).toFixed(1)}px, ${lerp(-30, 0, fig).toFixed(1)}px) rotate(${lerp(-4, -1.5, fig).toFixed(2)}deg)`,
      annClip: `inset(-10px ${((1 - seg(0.66, 0.71)) * 100).toFixed(1)}% -10px 0)`,
      ann2Clip: `inset(-10px ${((1 - seg(0.71, 0.76)) * 100).toFixed(1)}% -10px 0)`,
      fan1: `rotate(${(-3 * fan).toFixed(2)}deg) translate(${(-10 * fan).toFixed(1)}px, ${(4 * fan).toFixed(1)}px)`,
      fan2: `rotate(${(-6.5 * fan).toFixed(2)}deg) translate(${(-22 * fan).toFixed(1)}px, ${(8 * fan).toFixed(1)}px)`,
      chipOp: chip.toFixed(3), chipTf: `translateY(${((1 - chip) * 6).toFixed(1)}px)`,
      fileOp: file.toFixed(3), fileTf: `translateY(${((1 - file) * 24).toFixed(1)}px) scale(${lerp(0.96, 1, file).toFixed(3)})`,
      dlProg: (prog * 100).toFixed(1) + '%', dlStatus: prog >= 1 ? '✓ Saved to Downloads' : 'Preparing your notebook…', dlStatusC: prog >= 1 ? 'var(--color-accent-700)' : 'color-mix(in srgb, var(--color-text) 62%, transparent)',
  };
}

export default function WorkflowVideo() {
  const [time, setTime] = useState(0);
  const [scale, setScale] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const desk = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = desk.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.2, Math.min(1.6, el.clientWidth / 940, el.clientHeight / 660)));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let id = 0;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      id = requestAnimationFrame(() => setTime(0.995));
      return () => cancelAnimationFrame(id);
    }
    let visible = true, last = 0, elapsed = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (root.current) io.observe(root.current);
    const tick = (t: number) => {
      id = requestAnimationFrame(tick);
      // The cap only stops a jump when the tab comes back from the background.
      const dt = last ? Math.min(250, t - last) : 0;
      last = t;
      if (!visible) return;
      elapsed += dt;
      if (elapsed >= DURATION_MS + LOOP_HOLD_MS) elapsed = 0;
      setTime(Math.min(1, elapsed / DURATION_MS));
    };
    id = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(id); io.disconnect(); };
  }, []);

  const v = frame(time, scale);
  return (
    <div ref={root}>
<div style={css(`position:relative;display:flex;flex-direction:column;width:min(100%, calc((100svh - 18.5rem) * 1.6));min-width:min(100%, 420px);margin:0 auto;contain:layout paint;border:1px solid var(--color-divider);border-radius:var(--radius-lg);background:color-mix(in srgb,var(--color-neutral-200) 65%,var(--color-bg));box-shadow:var(--shadow-lg);overflow:hidden`)}><div style={css(`display:grid;padding:clamp(8px,1.2vw,12px) clamp(12px,2vw,20px);pointer-events:none`)}>{v.caps.map((c: any, i0: number) => (<Fragment key={i0}><div style={css(`grid-area:1 / 1;display:flex;align-items:center;gap:clamp(10px,2vw,18px);min-width:0;opacity:${c.op};transform:${c.tf};transition:opacity .45s,transform .6s cubic-bezier(.2,.75,.15,1)`)}><span style={css(`font-family:var(--font-heading);font-size:clamp(1.5rem,2.4vw,2.25rem);line-height:1;color:transparent;-webkit-text-stroke:1px var(--color-accent);font-feature-settings:'tnum' 1;flex:none`)}>{c.n}</span><span style={css(`font-family:var(--font-heading);font-weight:400;font-size:clamp(1.25rem,1.9vw,1.75rem);line-height:1`)}>{c.t}</span></div></Fragment>))}</div><div ref={desk} style={css(`position:relative;aspect-ratio:940 / 660;max-height:max(260px, calc((100svh - 18.5rem) * 0.88));margin:0 clamp(8px,2vw,24px) clamp(8px,2vw,24px);display:flex;justify-content:center;align-items:center`)}><div style={css(`position:relative;width:${v.deskW};height:${v.deskH}`)}><div style={css(`position:absolute;left:0;top:0;width:940px;height:660px;transform:scale(${v.scale});transform-origin:0 0;visibility:${v.deskVis}`)}><div style={css(`position:absolute;left:0;top:0;width:940px;height:46px;display:flex;align-items:center;gap:12px;padding:0 14px;background:var(--color-bg);border:1px solid var(--color-divider);border-radius:var(--radius-md);box-shadow:var(--shadow-sm);font-size:0.75rem;box-sizing:border-box`)}><span style={css(`font-size:0.625rem;letter-spacing:.09em;text-transform:uppercase;color:var(--color-accent-700)`)}>Biology 101</span><span style={css(`font-family:var(--font-heading);font-weight:600;font-size:1.0625rem;margin-right:auto`)}>Cell Biology — Ch. 4</span><span style={css(`color:color-mix(in srgb,var(--color-text) 62%,transparent);min-width:84px;text-align:right`)}>{v.deskSaved}</span><span style={css(`display:flex;border:1px solid var(--color-divider);border-radius:var(--radius-md);overflow:hidden;font-size:0.7188rem`)}><span style={css(`padding:4px 10px`)}>PDF</span><span style={css(`padding:4px 10px;border-left:1px solid var(--color-divider);color:${v.splitC};box-shadow:${v.splitSh}`)}>Split</span><span style={css(`padding:4px 10px;border-left:1px solid var(--color-divider)`)}>Notes</span></span><span style={css(`display:flex;align-items:center;gap:6px;padding:5px 11px;border:1px solid ${v.dlBorder};border-radius:var(--radius-md);background:${v.dlBg};color:${v.dlC};transform:${v.dlBtnTf};transition:transform .2s`)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={css(`stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round`)}><path d="M12 15V3M7 10l5 5 5-5M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></svg>Download PDF</span></div><div style={css(`position:absolute;left:0;top:64px;width:420px;height:590px;transform:${v.nbTf};transform-origin:50% 40%;opacity:${v.nbOp}`)}><div style={css(`position:absolute;inset:0;background:var(--color-neutral-200);box-shadow:var(--shadow-sm);transform:${v.fan2};transform-origin:20% 100%`)}></div><div style={css(`position:absolute;inset:0;background:var(--color-neutral-100);box-shadow:var(--shadow-sm);transform:${v.fan1};transform-origin:20% 100%`)}></div><div style={css(`position:absolute;inset:0;background-color:#fbf9f6;background-image:repeating-linear-gradient(to bottom,transparent 0 33px,color-mix(in srgb,var(--color-text) 12%,transparent) 33px 34px);box-shadow:var(--shadow-md);padding:34px 20px 0 70px`)}><div style={css(`position:absolute;top:0;bottom:0;left:54px;width:1px;background:color-mix(in srgb,var(--color-accent) 55%,transparent)`)}></div><div style={css(`position:absolute;left:10px;top:44px;font-family:var(--font-caveat), cursive;font-size:1.0625rem;color:var(--color-neutral-700)`)}>31 Oct</div><div style={css(`position:absolute;left:8px;top:180px;font-size:0.625rem;letter-spacing:.04em;color:var(--color-accent-700);opacity:${v.chipOp}`)}>p. 87</div><div style={css(`height:34px;display:flex;align-items:flex-end;padding-bottom:2px;font-family:var(--font-caveat), cursive;font-weight:500;font-size:1.9375rem;line-height:1;color:#2d2b2b`)}>Ch. 4 — the cell</div><div style={css(`height:34px`)}></div>{v.storyLines.map((ln: any, i0: number) => (<Fragment key={i0}><div style={css(`height:34px;display:flex;align-items:flex-end;padding-bottom:3px;white-space:nowrap;font-family:var(--font-caveat), cursive;font-size:1.625rem;line-height:1;color:#1e3a8a;clip-path:${ln.clip}`)}>{ln.t}</div></Fragment>))}<div style={css(`position:absolute;left:70px;top:322px;padding:8px;background:var(--color-neutral-100);border:1px solid var(--color-divider);box-shadow:var(--shadow-sm);opacity:${v.figOp};transform:${v.figTf}`)}><div style={css(`width:150px;height:60px;border:1.4px solid #3b3837;border-radius:50%;display:grid;place-items:center`)}><div style={css(`width:114px;height:34px;border:1px dashed #6b6766;border-radius:50%`)}></div></div></div><div style={css(`position:absolute;left:254px;top:330px;width:150px;font-family:var(--font-caveat), cursive;font-size:1.3125rem;line-height:1.1;color:var(--color-accent-700);clip-path:${v.annClip}`)}>← folds = more surface area</div><div style={css(`position:absolute;left:70px;top:430px;width:300px;font-family:var(--font-caveat), cursive;font-size:1.375rem;line-height:1.2;color:#2d2b2b;clip-path:${v.ann2Clip}`)}>Q: why do muscle cells need so many?</div><div style={css(`position:absolute;left:70px;top:500px;opacity:${v.chipOp};transform:${v.chipTf}`)}><span style={css(`display:inline-flex;align-items:center;gap:6px;padding:4px 12px 4px 9px;background:var(--color-bg);border:1px solid var(--color-accent);border-radius:999px;font-size:0.75rem;color:var(--color-accent-700)`)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={css(`stroke-width:2;stroke-linecap:round;stroke-linejoin:round`)}><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>Go to source · p. 87</span></div></div></div><div style={css(`position:absolute;left:0;top:64px;width:400px;height:590px;background:var(--color-neutral-100);box-shadow:var(--shadow-md);padding:30px 34px;color:#2a2826;transform:${v.deskPdfTf};opacity:${v.deskPdfOp}`)}><div style={css(`display:flex;justify-content:space-between;font-size:0.625rem;letter-spacing:.08em;text-transform:uppercase;color:var(--color-neutral-700);padding-bottom:8px;border-bottom:1px solid var(--color-neutral-300);margin-bottom:20px;font-feature-settings:'tnum' 1`)}><span>Chapter 4 · The cell</span><span>87</span></div><div style={css(`font-family:var(--font-heading);font-weight:600;font-size:1.4375rem;line-height:1.15;margin-bottom:10px`)}>4.2 Energy and the mitochondrion</div><p style={css(`margin:0 0 12px;font-size:0.7812rem;line-height:1.7;text-align:justify;hyphens:auto`)}>Every living cell needs a steady supply of energy to build proteins, move molecules across its membranes and divide.</p><p style={css(`position:relative;margin:0 0 12px;font-size:0.7812rem;line-height:1.7;text-align:justify;hyphens:auto`)}><span style={css(`background-image:linear-gradient(var(--color-accent-200),var(--color-accent-200));background-repeat:no-repeat;background-size:${v.hlSize};box-shadow:${v.hlLine}`)}>Mitochondria convert the chemical energy in glucose into ATP through cellular respiration, which is why muscle cells contain thousands of them.</span>{" "}Cells with lower demands, such as skin cells, contain far fewer.{" "}<span style={css(`position:absolute;left:12px;top:-50px;display:flex;align-items:center;gap:10px;padding:5px 5px 5px 10px;background:var(--color-bg);border:1px solid var(--color-divider);border-radius:var(--radius-md);box-shadow:var(--shadow-md);white-space:nowrap;opacity:${v.popOp};transform:${v.popTf}`)}><span style={css(`display:flex;gap:6px`)}><span style={css(`width:12px;height:12px;border-radius:50%;background:var(--color-accent-200);outline:1.5px solid var(--color-text);outline-offset:1.5px`)}></span><span style={css(`width:12px;height:12px;border-radius:50%;background:#a7f3d0`)}></span><span style={css(`width:12px;height:12px;border-radius:50%;background:#bae6fd`)}></span><span style={css(`width:12px;height:12px;border-radius:50%;background:#fbcfe8`)}></span></span><span style={css(`width:1px;height:18px;background:var(--color-divider)`)}></span><span style={css(`padding:5px 9px;border-radius:var(--radius-sm);color:var(--color-accent-700);font-family:var(--font-heading);font-weight:600;font-size:0.8438rem;background:${v.exBg};transform:${v.exTf};transition:background .2s,transform .15s;display:inline-block`)}>Export to board →</span></span></p><div style={css(`position:relative;margin:6px 0 14px;padding:14px;border:1px solid var(--color-neutral-300);display:flex;flex-direction:column;align-items:center;gap:10px`)}><div style={css(`width:190px;height:76px;border:1.5px solid #3b3837;border-radius:50%;display:grid;place-items:center`)}><div style={css(`width:148px;height:44px;border:1px dashed #6b6766;border-radius:50%`)}></div></div><div style={css(`font-size:0.6562rem;color:#4a4644;align-self:flex-start`)}>Figure 4.6 Structure of a mitochondrion</div><div style={css(`position:absolute;inset:4px 60px 26px;outline:1.5px dashed var(--color-accent);background:color-mix(in srgb,var(--color-accent-100) 60%,transparent);opacity:${v.clipOp}`)}><span style={css(`position:absolute;right:-10px;top:-12px;padding:2px 8px;background:var(--color-bg);border:1px solid var(--color-accent);border-radius:var(--radius-sm);font-size:0.625rem;color:var(--color-accent-700);white-space:nowrap`)}>Import to notes</span></div></div><p style={css(`margin:0;font-size:0.7812rem;line-height:1.7;text-align:justify;hyphens:auto`)}>The inner membrane is folded into cristae, which increase the surface area available to the enzymes of the electron transport chain.</p></div><div style={css(`position:absolute;left:0;top:0;width:260px;padding:9px 11px;background:var(--color-accent-100);border:1px solid var(--color-accent-300);box-shadow:var(--shadow-lg);font-size:0.6875rem;line-height:1.5;color:#2a2826;opacity:${v.sSlipOp};transform:${v.sSlipTf}`)}>Mitochondria convert the chemical energy in glucose into ATP through cellular respiration, which is why muscle cells contain thousands of them.</div><div style={css(`position:absolute;left:300px;top:230px;width:360px;padding:20px 22px;background:var(--color-bg);border:1px solid var(--color-divider);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:14px;opacity:${v.fileOp};transform:${v.fileTf}`)}><div style={css(`display:flex;gap:16px;align-items:center`)}><div style={css(`position:relative;width:46px;height:58px;flex:none;background-color:#fffdf8;background-image:repeating-linear-gradient(to bottom,transparent 0 7px,color-mix(in srgb,var(--color-text) 12%,transparent) 7px 8px);border:1px solid var(--color-divider);box-shadow:3px 3px 0 -1px var(--color-neutral-200)`)}><span style={css(`position:absolute;left:-7px;bottom:7px;padding:1px 5px;background:var(--color-accent-700);color:#fff;font-size:0.5312rem;letter-spacing:.06em`)}>PDF</span></div><div style={css(`display:flex;flex-direction:column;gap:3px`)}><span style={css(`font-family:var(--font-heading);font-weight:600;font-size:1.125rem`)}>Cell Biology — Ch. 4.pdf</span><span style={css(`font-size:0.75rem;color:color-mix(in srgb,var(--color-text) 62%,transparent)`)}>2 notebook pages · 1.2 MB</span></div></div><div style={css(`height:3px;background:var(--color-divider);border-radius:2px;overflow:hidden`)}><div style={css(`height:100%;width:${v.dlProg};background:var(--color-accent)`)}></div></div><div style={css(`display:flex;align-items:center;gap:7px;font-size:0.7812rem;color:${v.dlStatusC}`)}>{v.dlStatus}</div></div></div></div></div></div>
    </div>
  );
}
