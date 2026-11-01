/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// Logic ported from the "Margin Landing v2" design file: a 20 s workflow timeline, six sticky feature sheets with
// auto-playing demos, the scroll-linked night transition and a 26 s simulated focus session. The markup lives in LandingView.
import { Component } from "react";
import LandingView from "./LandingView";
import { ambient, loadSoundPrefs, type SoundId } from "@/lib/ambient";

type S = Record<string, any>;

const WF_MS = 20000;

const DEMO_SOUNDS: Record<string, SoundId> = { Rain: 'rain', 'Coffee shop': 'coffee', Ocean: 'ocean', 'Lo-fi': 'lofi' };
const FOCUS_END = 0.78;
const isBreak = (fp: number) => fp >= 0.59 && fp < 0.68;

const QUOTES = [
  ['I stopped keeping a second window open for notes. Every quote still knows which page it came from.', 'Priya, second-year biology', 'card', -1.6],
  ['Clipping diagrams straight into my notes got rid of a screenshots folder I never opened again.', 'Daniel, mechanical engineering', 'hand', 1.2],
  ['Focus mode with rain on and a page target is how I got through organic chemistry this term.', 'Amara, pre-med', 'card', -0.6],
  ['Nothing gets summarised for me. I still do the thinking; it just takes fewer steps to write it down.', 'Jonas, philosophy', 'hand', 1.8],
  ['Case readings run forty pages. Highlighting straight into my outline saves me an hour a week.', 'Mei, law', 'hand', -1.2],
  ['I pick one handwriting per course. Revising from notes in the same hand makes them feel like mine.', 'Tomás, history', 'card', 1],
  ['Go to source is the feature I didn’t know I needed until exam week.', 'Sara, computer science', 'hand', -1.8],
  ['Two PDFs and one notebook on one screen. That’s the whole idea, and it works.', 'Kwame, economics', 'card', 0.8]
];
const GS_SEQ = [[0, 900], [1, 1000], [2, 450], [3, 2400], [4, 1000], [5, 450], [6, 2600]];
const card = ([text, who, kind, rot]: any[]) => kind === 'card'
  ? { text, who, bg: '#fbf9f6', img: 'repeating-linear-gradient(to bottom, transparent 0 1.6875rem, color-mix(in srgb, #201f1d 10%, transparent) 1.6875rem 1.75rem)', top: '2px solid var(--color-accent)', family: 'var(--font-body)', size: '0.9375rem', lh: '1.75rem', ink: 'var(--color-text)', tape: 0, tf: 'rotate(' + rot + 'deg)' }
  : { text, who, bg: 'var(--color-accent-100)', img: 'none', top: '0', family: "var(--font-caveat), cursive", size: '1.5625rem', lh: '1.25', ink: '#1e3a8a', tape: 1, tf: 'rotate(' + rot + 'deg)' };

class Landing extends Component<object, S> {
  state: S = {
    loaded: false, sp: 0, night: 0, strike: 0, scale: 1, page: 1, total: 7, label: 'Title', wide: true, scrolled: false, foot: 0,
    picked: [], lastAdded: null, revealed: true, sweep: null, slip: null, act: -1, vh: 900, fp: 0, wfT: 0, wfPlay: true, wfVis: false, fT: 0.1, fRun: false, gsPh: 0, fsScale: 1, fSound: 'Rain', hlIdx: 0, cPh: 0, dPh: 0, pdfIn: true, font: 'Caveat', ink: '#1e3a8a', clipped: false, paper: 'Dotted', pdf: 0,
    secs: 24 * 60 + 12, sound: 'Rain'
  };
  demoSound: SoundId | null = null;
  reduced = false; loopId = 0; raf: number | null = null; clock: any; demoT: any; user1 = false; userPdf = false; busy = false;
  onScroll: () => void = () => {};
  story: HTMLElement | null = null; desk: HTMLElement | null = null; fs: HTMLElement | null = null; focus: HTMLElement | null = null;
  setStory = (el: HTMLElement | null) => { this.story = el; };
  setDesk = (el: HTMLElement | null) => { this.desk = el; };
  setFs = (el: HTMLElement | null) => { this.fs = el; };
  setFocus = (el: HTMLElement | null) => { this.focus = el; };

  componentDidMount() {
    this.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (this.reduced) this.setState({ wfT: 0.995, wfPlay: false });
    let last = performance.now(), hold = 0;
    const loop = (t: number) => {
      this.loopId = requestAnimationFrame(loop);
      // ~30 fps is plenty for these animations and halves the render work.
      if (t - last < 32) return;
      // Keep real time on slow devices; the cap only stops a jump after the tab was in the background.
      const dt = Math.min(250, t - last); last = t;
      const s = this.state, n: S = {};
      if (s.wfVis && s.wfPlay) {
        if (s.wfT >= 1) { hold += dt; if (hold > 1800) { hold = 0; n.wfT = 0; } }
        else n.wfT = Math.min(1, s.wfT + dt / WF_MS);
      }
      if (s.fRun) { const v = s.fT + dt / 26000; if (v >= 1) { n.fT = 1; n.fRun = false; } else n.fT = v; }
      if (Object.keys(n).length) this.setState(n);
    };
    this.loopId = requestAnimationFrame(loop);
    requestAnimationFrame(() => requestAnimationFrame(() => this.setState({ loaded: true })));
    setTimeout(() => { if (!this.state.loaded) this.setState({ loaded: true }); }, 80);
    this.onScroll = () => { if (!this.raf) this.raf = requestAnimationFrame(this.update); };
    window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
    window.addEventListener('resize', this.onScroll);
    document.addEventListener('visibilitychange', this.syncSound);
    this.update();
    this.clock = setInterval(() => { if (this.state.night > 0.05) this.setState((s: any) => ({ secs: s.secs > 0 ? s.secs - 1 : 1500 })); }, 1000);
  }
  componentDidUpdate() { this.syncSound(); }
  // Same rule as a real session: sound only during focus rounds. rAF pauses in a hidden tab, so the demo clock stops there too.
  syncSound = () => {
    const s = this.state;
    const live = s.fRun && s.night > 0.05 && s.fT < FOCUS_END && !isBreak(s.fT) && !document.hidden;
    const next: SoundId | null = live ? DEMO_SOUNDS[s.fSound] ?? null : null;
    if (next === this.demoSound) return;
    this.demoSound = next;
    if (next) ambient.play(next); else ambient.fadeOut();
  };
  componentWillUnmount() {
    document.removeEventListener('visibilitychange', this.syncSound);
    ambient.fadeOut(0.2);
    window.removeEventListener('scroll', this.onScroll, { capture: true });
    window.removeEventListener('resize', this.onScroll);
    cancelAnimationFrame(this.raf ?? 0); cancelAnimationFrame(this.loopId); clearInterval(this.clock);
  }
  update = () => {
    this.raf = null;
    const vh = window.innerHeight, c = (v: number) => Math.max(0, Math.min(1, v)), n: S = {};
    const st = this.story;
    if (st) { const r = st.getBoundingClientRect(); n.wfVis = r.top < vh * 0.7 && r.bottom > vh * 0.3; }
    const dk = this.desk;
    if (dk && dk.clientWidth) n.scale = Math.max(0.2, Math.min(1.6, dk.clientWidth / 940, dk.clientHeight / 660));
    const fo = this.focus;
    if (fo) { const r = fo.getBoundingClientRect(); n.night = c((vh * 0.9 - r.top) / (vh * 0.5)) * c((r.bottom - vh * 0.1) / (vh * 0.4)); }
    const fs = this.fs;
    if (fs && fs.clientWidth) { const avail = fs.offsetTop > 80 ? (vh - 64 - fs.offsetTop - 22) : (vh - 64 - 44); n.fsScale = Math.max(0.2, Math.min(1.25, fs.clientWidth / 880, avail / 560)); n.fNarrow = fs.offsetTop > 80; }
    const pages = Array.from(document.querySelectorAll('[data-page]'));
    let idx = 0;
    pages.forEach((el, i) => { if (el.getBoundingClientRect().top < vh * 0.45) idx = i; });
    n.page = idx + 1; n.total = pages.length || 7; n.label = pages[idx] ? (pages[idx] as HTMLElement).dataset.page : '';
    n.wide = window.innerWidth >= 960;
    n.vh = vh;
    const se = document.scrollingElement || document.documentElement;
    n.scrolled = se.scrollTop > 8;
    n.foot = c((se.scrollTop + vh - (se.scrollHeight - vh * 0.8)) / (vh * 0.8));
    let act = -1;
    document.querySelectorAll('[data-sheet]').forEach((el, i) => { const r = el.getBoundingClientRect(); if (r.top < vh * 0.6 && r.bottom > 140) act = i; });
    n.act = act;
    const prevAct = this.state.act;
    // Scroll fires constantly; only re-render when a value actually changed.
    const cur = this.state;
    const changed = Object.keys(n).some((k) => cur[k] !== n[k]);
    if (changed) this.setState(n, () => { if (act !== prevAct) this.startDemo(act); });
  };

  later(ms: number, fn: () => void) { clearTimeout(this.demoT); this.demoT = setTimeout(fn, ms); }
  startDemo(k: number) {
    clearTimeout(this.demoT);
    if (this.reduced) { this.setState({ cPh: 5, dPh: 7, picked: this.state.picked.length ? this.state.picked : [0, 1] }); return; }
    if (k === 0 && !this.user1) { this.setState({ picked: [] }); this.later(700, () => this.auto1()); }
    if (k === 1) this.runSeq(1, 'cPh', [[0, 500], [1, 500], [2, 1300], [3, 800], [4, 1100], [5, 3400]]);
    if (k === 2) this.runSeq(2, 'dPh', [[0, 400], [1, 700], [2, 600], [3, 700], [4, 600], [5, 800], [6, 800], [7, 3600]]);
    if (k === 3 && !this.userPdf) this.later(2600, () => this.autoPdf());
    if (k === 4) this.runSeq(4, 'hlIdx', [0, 1, 2, 3, 4, 5].map((i: any) => [i, 2300]));
    if (k === 5) this.runSeq(5, 'gsPh', GS_SEQ);
  }
  runSeq(sheet: number, key: string, seq: any[][]) {
    let k = 0;
    const step = () => { if (this.state.act !== sheet) return; const [ph, ms] = seq[k]; this.setState({ [key]: ph }); k = (k + 1) % seq.length; this.later(ms, step); };
    step();
  }
  auto1() {
    if (this.state.act !== 0 || this.user1) return;
    const next = [0, 1, 2, 3].find((i: any) => !this.state.picked.includes(i));
    if (next === undefined) { this.later(2600, () => { this.setState({ picked: [] }); this.later(900, () => this.auto1()); }); return; }
    this.transfer(next);
    this.later(3100, () => this.auto1());
  }
  autoPdf() {
    if (this.state.act !== 3 || this.userPdf) return;
    this.switchPdf((this.state.pdf + 1) % 3);
    this.later(2800, () => this.autoPdf());
  }
  switchPdf(i: number) { this.setState({ pdf: i, pdfIn: false }, () => requestAnimationFrame(() => requestAnimationFrame(() => this.setState({ pdfIn: true })))); }
  transfer(i: number) {
    if (this.busy) return; this.busy = true;
    this.setState({ sweep: i });
    setTimeout(() => this.setState({ slip: { i, ph: 'show' } }), 700);
    setTimeout(() => this.setState({ slip: { i, ph: 'fly' } }), 900);
    setTimeout(() => this.setState((st: any) => ({ picked: st.picked.includes(i) ? st.picked : [...st.picked, i], lastAdded: i, revealed: false }), () => requestAnimationFrame(() => requestAnimationFrame(() => this.setState({ revealed: true })))), 1350);
    setTimeout(() => { this.setState({ slip: null, sweep: null }); this.busy = false; }, 1900);
  }
  toggle(i: number) {
    this.user1 = true;
    if (this.state.picked.includes(i)) this.setState((st: any) => ({ picked: st.picked.filter((x: any) => x !== i) }));
    else this.transfer(i);
  }

  renderVals() {
    const s = this.state, sp = s.wfT;
    const c = (v: number) => Math.max(0, Math.min(1, v));
    const seg = (a: number, b: number) => c((sp - a) / (b - a));
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
    const CAPS = [
      { n: '01', t: 'Read', d: 'Open one or more PDFs and study in a focused workspace.' },
      { n: '02', t: 'Highlight', d: 'Select a passage and pick a marker colour. The exact words are captured, nothing paraphrased.' },
      { n: '03', t: 'Export', d: 'Send it to the board. It lands in your notebook in your handwriting, linked back to its page.' },
      { n: '04', t: 'Make it yours', d: 'Place it into a notebook and write, draw, organize, and customize your notes.' },
      { n: '05', t: 'Download', d: 'Export your notebook pages as a PDF whenever you need a copy to print, share or revise from.' }
    ];
    const storyText = ['Mitochondria convert the chemical', 'energy in glucose into ATP through', 'cellular respiration, which is why', 'muscle cells contain thousands of them.'];
    const fp = s.fT, fseg = (a: number, b: number) => c((fp - a) / (b - a));
    const enter = ease(fseg(0.2, 0.3)), r1 = fseg(0.34, 0.58), brk = fseg(0.6, 0.68), r2 = fseg(0.68, FOCUS_END);
    const inBreak = isBreak(fp);
    const secsLeft = fp < 0.59 ? 1500 * (1 - r1) : inBreak ? 300 * (1 - brk) : 1500 * (1 - r2);
    const fT = Math.round(secsLeft), ringP = fp < 0.59 ? r1 : inBreak ? brk : r2;
    const fPages = Math.round(1 + 11 * fseg(0.34, 0.78));
    const fActive = fp < 0.22 ? 0 : fp < 0.36 ? 1 : fp < 0.79 ? 2 : 3;
    const FSTEPS = [
      ['Set the session', 'Pick a timer, a goal and the pages you want to cover. Add rain or a coffee shop if it helps.'],
      ['The room goes quiet', 'The header shrinks to a slim countdown and everything else steps back.'],
      ['Keep your place', 'Rounds and breaks run on their own. Pages you visit and highlights you export are counted as you go.'],
      ['See what you did', 'A summary waits at the end, and your streak carries over to the dashboard.']
    ];
    const HLS = [
      ['Mitochondria convert glucose into ATP', ' through cellular respiration.', 'glucose → ATP', '#fde68a'],
      ['The inner membrane is folded into cristae', ', increasing its surface area.', 'cristae = more surface', '#a7f3d0'],
      ['Muscle cells contain thousands of mitochondria', '; skin cells far fewer.', 'muscle cells: 1000s', '#fde68a'],
      ['Mitochondria carry their own circular DNA', ', separate from the nucleus.', 'own DNA, circular', '#bae6fd'],
      ['It is inherited almost entirely from the mother', '.', 'maternal line only', '#fbcfe8'],
      ['Chloroplasts capture light energy', ' and build glucose from CO₂ and water.', 'chloroplast: light → glucose', '#a7f3d0']
    ];

    const fontDefs: Record<string, any> = { Caveat: { f: "var(--font-caveat), cursive", sz: 26, ui: '1.1875rem' }, Kalam: { f: "var(--font-kalam), cursive", sz: 19, ui: '0.875rem' }, 'Patrick Hand': { f: "var(--font-patrick), cursive", sz: 22, ui: '1rem' } };
    const sentences = [
      'Mitochondria convert the chemical energy in glucose into ATP through cellular respiration.',
      'The inner membrane is folded into cristae, which increase the surface area for the electron transport chain.',
      'Muscle cells can contain thousands of mitochondria; skin cells contain far fewer.',
      'Mitochondria carry their own circular DNA, inherited almost entirely from the mother.'
    ];
    const inks = [{ n: 'Graphite', c: '#2d2b2b' }, { n: 'Navy', c: '#1e3a8a' }, { n: 'Brown', c: '#78350f' }, { n: 'Crimson', c: '#9f1239' }];
    const rule = 'color-mix(in srgb, var(--color-text) 10%, transparent)';
    const PAPER: Record<string, string[]> = {
      Lined: [`repeating-linear-gradient(to bottom, transparent 0 33px, ${rule} 33px 34px)`, 'auto'],
      Dotted: ['radial-gradient(circle, var(--color-neutral-400) 1.1px, transparent 1.5px)', '22px 22px'],
      Grid: [`linear-gradient(${rule} 1px, transparent 1px), linear-gradient(90deg, ${rule} 1px, transparent 1px)`, '24px 24px'],
      Blank: ['none', 'auto']
    };
    const PDFS = [
      { name: 'Ch4 The cell.pdf', run: 'Chapter 4 · The cell', page: '87', title: '4.2 Energy and the mitochondrion', body: 'Every living cell needs a steady supply of energy to build proteins, move molecules across its membranes and divide. Mitochondria convert the chemical energy in glucose into ATP through cellular respiration.' },
      { name: 'Lecture 4 slides.pdf', run: 'BIO 101 · Lecture 4', page: '12', title: 'Cellular respiration, in three stages', body: 'Glycolysis in the cytoplasm, the Krebs cycle in the matrix, and oxidative phosphorylation along the inner membrane. Know where each stage happens and what it produces.' },
      { name: 'Lab 2 handout.pdf', run: 'Lab 2 · Yeast respiration', page: '2', title: 'Measuring CO₂ output', body: 'Record the gas volume in each tube every five minutes for thirty minutes. Compare the glucose and sucrose tubes against the water control and note the temperature.' }
    ];
    const pd = PDFS[s.pdf];
    const mm = Math.floor(s.secs / 60), ss = s.secs % 60;
    const night = s.night;
    const SOUNDS = ['Rain', 'Coffee shop', 'Ocean', 'Brown noise', 'Lo-fi', 'Binaural'];

    return {
            wideOp: s.wide ? 1 : 0,
      page: s.page, total: s.total, label: s.label,
      navLine: s.scrolled ? 'var(--color-divider)' : 'transparent',
      lineTf: s.loaded ? 'translateY(0)' : 'translateY(105%)',
      wordClip: s.loaded ? 'inset(-20% -10% -40% -5%)' : 'inset(-20% 100% -40% -5%)',
      swoosh: s.loaded ? 0 : 320,
      fadeOp: s.loaded ? 1 : 0, fadeTf: s.loaded ? 'none' : 'translateY(16px)',

      caps: CAPS.map((k, i) => ({ ...k, op: i === active ? 1 : 0, tf: `translateY(${(i - active) * 18}px)` })),
      wfToggle: () => this.setState((st: any) => ({ wfPlay: !st.wfPlay, wfT: st.wfT >= 1 ? 0 : st.wfT })), wfLabel: s.wfPlay ? 'Pause' : 'Play', wfIcon: s.wfPlay ? '❚❚' : '▶',
      steps5: CAPS.map((k, i) => ({ w: ((R[i][1] - R[i][0]) * 100).toFixed(0), go: () => this.setState({ wfT: R[i][0] + 0.002, wfPlay: true }), n: k.n, t: k.t, fill: (seg(R[i][0], R[i][1]) * 100).toFixed(1) + '%', c: i === active ? 'var(--color-accent-700)' : i < active ? 'var(--color-text)' : 'color-mix(in srgb, var(--color-text) 50%, transparent)' })),
      scale: s.scale.toFixed(3), deskH: Math.round(660 * s.scale) + 'px', deskW: Math.round(940 * s.scale) + 'px',
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

      fColGap: s.fNarrow ? '8px' : '22px', fH2: s.fNarrow ? '26px' : 'clamp(36px,4.2vw,64px)', fGap: s.fNarrow ? '12px 40px' : '28px 56px', fDescDisplay: s.fNarrow ? 'none' : 'block',
      fSteps: FSTEPS.map(([t, d], i) => ({ disp: s.fNarrow && i !== fActive ? 'none' : 'flex', n: '0' + (i + 1), t, d, op: i === fActive ? 1 : 0.45, mh: i === fActive ? '90px' : '0px', bar: i === fActive ? '100%' : '0px' })),
      fsW: Math.round(880 * s.fsScale) + 'px', fsH: Math.round(560 * s.fsScale) + 'px', fsScale: s.fsScale.toFixed(3),
      fBtnBorder: fp > 0.12 && fp < 0.22 ? 'var(--color-accent)' : 'var(--color-divider)', fBtnC: fp > 0.12 && fp < 0.22 ? 'var(--color-accent-700)' : 'inherit', fBtnBg: fp > 0.12 && fp < 0.22 ? 'var(--color-accent-100)' : 'transparent',
      fNote3: `inset(-6px ${((1 - fseg(0.5, 0.56)) * 100).toFixed(1)}% -6px 0)`,
      dimOp: (enter * 0.6).toFixed(3),
      barOp: enter.toFixed(3), barTf: `translateY(${((1 - enter) * -100).toFixed(1)}%)`,
      fRoundTxt: inBreak ? 'Break' : `Round ${fp < 0.68 ? 1 : 2}/2`, fTime: `${String(Math.floor(fT / 60)).padStart(2, '0')}:${String(fT % 60).padStart(2, '0')}`,
      fPhaseTxt: inBreak ? 'Break' : 'Focus', fPagesTxt: `${fPages}/12 pages`, fPagesN: fPages, fHl: Math.round(9 * fseg(0.34, 0.78)),
      fSoundName: s.fSound || 'Sound off',
      panelOp: fseg(0.28, 0.34).toFixed(3), panelTf: `translateX(${((1 - fseg(0.28, 0.34)) * 24).toFixed(1)}px)`,
      ringOff: (415 * (1 - ringP)).toFixed(1),
      seg1: (r1 * 100).toFixed(1) + '%', seg2: (brk * 100).toFixed(1) + '%', seg3: (r2 * 100).toFixed(1) + '%',
      fPageTicks: Array.from({ length: 12 }, (_, i) => ({ f: i < fPages ? 'var(--color-accent-400)' : 'transparent', b: i < fPages ? 'var(--color-accent-400)' : 'rgba(255,255,255,.25)' })),
      fSounds: ['Rain', 'Coffee shop', 'Ocean', 'Lo-fi'].map((name: any) => { const on = s.fSound === name; return { name, border: on ? 'var(--color-accent-400)' : 'rgba(255,255,255,.2)', c: on ? 'var(--color-accent-300)' : 'rgba(255,255,255,.8)', eqOp: on ? (inBreak ? 0.35 : 1) : 0, play: on && !inBreak ? 'running' : 'paused', pick: () => this.setState({ fSound: on ? null : name }) }; }),
      breakOp: (fseg(0.59, 0.61) * (1 - fseg(0.67, 0.69))).toFixed(3),
      setupOp: (1 - fseg(0.2, 0.26)).toFixed(3), setupTf: `translateY(${(-12 * fseg(0.2, 0.26)).toFixed(1)}px) scale(${(1 - 0.04 * fseg(0.2, 0.26)).toFixed(3)})`,
      sheetPos: s.vh >= 700 ? 'sticky' : 'relative',
      sheetH0: s.vh >= 700 ? 'min(700px, calc(100vh - 100px))' : '600px',
      sheetH1: s.vh >= 700 ? 'min(700px, calc(100vh - 124px))' : '600px',
      sheetH2: s.vh >= 700 ? 'min(700px, calc(100vh - 148px))' : '600px',
      sheetH3: s.vh >= 700 ? 'min(700px, calc(100vh - 172px))' : '600px',
      sheetH4: s.vh >= 700 ? 'min(700px, calc(100vh - 196px))' : '600px',
      sheetH5: s.vh >= 700 ? 'min(700px, calc(100vh - 220px))' : '600px',
      startFocusDemo: () => { ambient.setVolume(loadSoundPrefs().volume); ambient.unlock(); this.setState({ fT: 0.13, fRun: true }); },
      setupPe: fp < 0.2 ? 'auto' : 'none', sumPe: fp > 0.86 ? 'auto' : 'none',
      startGlow: fp <= 0.12 ? '0 0 0 4px color-mix(in srgb, var(--color-accent-400) 25%, transparent)' : 'none',
      // The mock's own button is too small to tap once the stage is scaled down for phones.
      fStartLabel: s.fNarrow && !s.fRun ? (fp >= 1 ? 'Run it again' : 'Start focusing') : null,
      fHint: fp <= 0.12 ? '← press Start focusing to run a session' : fp >= 1 ? 'that was 50 minutes, in 26 seconds' : '', fHintOp: fp <= 0.12 || fp >= 1 ? 1 : 0,
      gsPickA: () => { clearTimeout(this.demoT); this.setState({ act: 5 }, () => this.runSeq(5, 'gsPh', GS_SEQ.slice(1, 4).concat([[0, 1200]]))); },
      gsPickB: () => { clearTimeout(this.demoT); this.setState({ act: 5 }, () => this.runSeq(5, 'gsPh', GS_SEQ.slice(4, 7).concat([[0, 1200]]))); },
      gsRingA: s.gsPh >= 1 && s.gsPh <= 3 ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
      gsRingB: s.gsPh >= 4 && s.gsPh <= 6 ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
      gsChipA: s.gsPh === 1 || s.gsPh === 2 ? 1 : 0, gsChipTfA: s.gsPh === 2 ? 'scale(.93)' : s.gsPh === 1 ? 'none' : 'translateY(6px)', gsChipBgA: s.gsPh === 2 ? 'var(--color-accent-100)' : 'var(--color-bg)',
      gsChipB: s.gsPh === 4 || s.gsPh === 5 ? 1 : 0, gsChipTfB: s.gsPh === 5 ? 'scale(.93)' : s.gsPh === 4 ? 'none' : 'translateY(6px)', gsChipBgB: s.gsPh === 5 ? 'var(--color-accent-100)' : 'var(--color-bg)',
      gsY: s.gsPh === 3 || s.gsPh === 4 || s.gsPh === 5 ? '-262px' : s.gsPh === 6 ? '-372px' : '0px',
      gsPage: s.gsPh >= 3 ? 87 : 86,
      gsFlashA: s.gsPh === 3 ? '2px solid var(--color-accent-800)' : '2px solid transparent', gsGlowA: s.gsPh === 3 ? '0 0 0 6px color-mix(in srgb, var(--color-accent) 22%, transparent)' : 'none',
      gsFlashB: s.gsPh === 6 ? '2px solid var(--color-accent-800)' : '2px solid transparent', gsGlowB: s.gsPh === 6 ? '0 0 0 6px color-mix(in srgb, var(--color-accent) 22%, transparent)' : 'none',
      startBg: fp > 0.15 && fp < 0.21 ? 'color-mix(in srgb, var(--color-accent-400) 22%, transparent)' : 'transparent', startTf: fp > 0.16 && fp < 0.19 ? 'scale(.95)' : 'none',
      sumOp: fseg(0.8, 0.86).toFixed(3), sumTf: `translateY(${((1 - fseg(0.8, 0.86)) * 22).toFixed(1)}px)`,

      hlList: HLS.map(([t, rest, note, color], i) => ({ t, rest, note, color, ring: i === s.hlIdx ? '2px solid var(--color-accent-800)' : '2px solid transparent', noteBg: i === s.hlIdx ? 'var(--color-accent-100)' : 'transparent', noteRing: i === s.hlIdx ? 'inset 2px 0 0 var(--color-accent)' : 'none', check: i < s.hlIdx ? 1 : 0 })),
      hlRest: s.wide ? 'inline' : 'none', hlLabel: `${s.hlIdx + 1} of ${HLS.length}`, hlBar: (((s.hlIdx + 1) / HLS.length) * 100).toFixed(1) + '%',
      hlPrev: () => { clearTimeout(this.demoT); this.setState((st: any) => ({ hlIdx: (st.hlIdx + HLS.length - 1) % HLS.length })); },
      hlNext: () => { clearTimeout(this.demoT); this.setState((st: any) => ({ hlIdx: (st.hlIdx + 1) % HLS.length })); },

      fonts: Object.keys(fontDefs).map((name: any) => ({ name, family: fontDefs[name].f, size: fontDefs[name].ui, pressed: String(s.font === name), c: s.font === name ? 'var(--color-accent-700)' : 'var(--color-text)', sh: s.font === name ? 'inset 0 0 0 1px var(--color-accent)' : 'none', pick: () => this.setState({ font: name }) })),
      fFamily: fontDefs[s.font].f, fSize: (fontDefs[s.font].sz / 16) + 'rem',
      inks: inks.map((k: any) => ({ ...k, ring: s.ink === k.c ? '1.5px solid var(--color-text)' : '1.5px solid transparent', pick: () => this.setState({ ink: k.c }) })),
      inkColor: s.ink,
      sentences: sentences.map((t, i) => {
        const on = s.picked.includes(i) || s.sweep === i;
        return { t, bs: on ? '100% 100%' : '0% 100%', tr: s.sweep === i ? 'background-size .7s cubic-bezier(.6,0,.35,1)' : 'none', line: s.picked.includes(i) ? 'inset 0 -1.5px 0 var(--color-accent)' : 'none', toggle: () => this.toggle(i), key: (e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggle(i); } } };
      }),
      notes: [...s.picked].sort((a, b) => a - b).map((i: any) => {
        const fresh = i === s.lastAdded;
        return { t: sentences[i], clip: fresh && !s.revealed ? 'inset(-12px 100% -12px -80px)' : 'inset(-12px -12px -12px -80px)', tr: fresh && s.revealed ? 'clip-path 1.3s cubic-bezier(.45,0,.55,1)' : 'none' };
      }),
      slipText: s.slip ? sentences[s.slip.i] : '',
      slipOp: s.slip ? (s.slip.ph === 'fly' ? 0 : 1) : 0,
      slipTf: s.slip && s.slip.ph === 'fly' ? 'translate(10px, 200px) scale(.9) rotate(1.5deg)' : 'translate(0, 0)',
      slipTr: s.slip ? (s.slip.ph === 'fly' ? 'transform .8s cubic-bezier(.5,0,.2,1), opacity .4s .45s' : 'opacity .2s') : 'none',
      noPicked: s.picked.length === 0,

      replayClip: () => { clearTimeout(this.demoT); this.setState({ act: 1 }, () => this.runSeq(1, 'cPh', [[0, 400], [1, 500], [2, 1300], [3, 800], [4, 1100], [5, 3400]])); },
      cBoxOp: s.cPh >= 1 ? 1 : 0, cBoxW: s.cPh >= 2 ? '100%' : '0%', cBoxH: s.cPh >= 2 ? '100%' : '0%',
      cChipOp: s.cPh >= 3 ? 1 : 0, cChipTf: s.cPh === 4 ? 'scale(.9)' : s.cPh >= 3 ? 'scale(1)' : 'scale(.8)',
      curOp: s.cPh >= 1 && s.cPh <= 4 ? 1 : 0,
      curTf: 'translate(' + (({ 0: '10px, 60px', 1: '22px, 87px', 2: '236px, 178px', 3: '200px, 68px', 4: '200px, 68px', 5: '200px, 68px' }) as Record<number, string>)[s.cPh] + ')',
      clipFigOp: s.cPh >= 4 ? 1 : 0, clipFigTf: s.cPh >= 4 ? 'translate(0,0) rotate(-1.5deg)' : 'translate(-150px,-40px) rotate(0deg) scale(.9)',
      clipNoteClip: s.cPh >= 5 ? 'inset(-10px -10px -10px -10px)' : 'inset(-10px 100% -10px -10px)',
      d1: s.dPh >= 1 ? 'inset(-4px -4px -4px -4px)' : 'inset(-4px 100% -4px -4px)',
      d2: s.dPh >= 2 ? 'inset(-4px -4px -4px -4px)' : 'inset(-4px 100% -4px -4px)',
      d3: s.dPh >= 3 ? 'inset(-4px -4px -4px -4px)' : 'inset(-4px 100% -4px -4px)',
      d4: s.dPh >= 4 ? 'inset(-4px -4px -4px -4px)' : 'inset(-4px -4px 100% -4px)',
      d5: s.dPh >= 5 ? 'inset(-4px -4px -4px -4px)' : 'inset(-4px 100% -4px -4px)',
      d6: s.dPh >= 6 ? 'circle(80% at 50% 50%)' : 'circle(0% at 50% 50%)',
      d7: s.dPh >= 7 ? 'inset(-6px -6px -6px -6px)' : 'inset(-6px 100% -6px -6px)',
      dTr: s.dPh === 0 ? 'none' : 'clip-path .6s cubic-bezier(.45,0,.4,1)', dTrSlow: s.dPh === 0 ? 'none' : 'clip-path 1.2s cubic-bezier(.45,0,.55,1)',
      penOp: s.dPh < 7 ? 1 : 0,
      penTf: 'translate(' + ['66px, 20px', '176px, 46px', '250px, 40px', '368px, 46px', '318px, 128px', '380px, 170px', '384px, 236px', '232px, 278px'][s.dPh] + ')',
      papers: Object.keys(PAPER).map((name: any) => ({ name, pressed: String(s.paper === name), c: s.paper === name ? 'var(--color-accent-700)' : 'var(--color-text)', sh: s.paper === name ? 'inset 0 0 0 1px var(--color-accent)' : 'none', pick: () => this.setState({ paper: name }) })),
      paperImg: PAPER[s.paper][0], paperSize: PAPER[s.paper][1], paperName: s.paper,

      pdfTabs: PDFS.map((p, i) => ({ name: p.name, pick: () => { this.userPdf = true; clearTimeout(this.demoT); this.switchPdf(i); }, top: i === s.pdf ? 'inset 0 2px 0 var(--color-accent)' : 'none', bg: i === s.pdf ? 'var(--color-neutral-100)' : 'transparent', border: i === s.pdf ? 'var(--color-divider)' : 'transparent', color: i === s.pdf ? 'var(--color-text)' : 'color-mix(in srgb, var(--color-text) 62%, transparent)' })),
      pdfOp: s.pdfIn ? 1 : 0, pdfTf: s.pdfIn ? 'none' : 'translateY(10px)', pdfTr: s.pdfIn ? 'opacity .45s, transform .6s cubic-bezier(.2,.75,.15,1)' : 'none',
      pdfRun: pd.run, pdfPage: pd.page, pdfTitle: pd.title, pdfBody: pd.body,

      night: night.toFixed(3),
      nightBg: `color-mix(in oklab, var(--color-bg), color-mix(in oklab, var(--color-neutral-900) 72%, black) ${(night * 100).toFixed(1)}%)`,
      nightInk: `color-mix(in oklab, var(--color-text), var(--color-neutral-100) ${(night * 100).toFixed(1)}%)`,
      timeText: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
      timePct: ((1 - s.secs / 1500) * 100).toFixed(2) + '%',
      pages: Array.from({ length: 12 }, (_, i) => ({ fill: i < 7 ? 'var(--color-accent-400)' : 'transparent', border: i < 7 ? 'var(--color-accent-400)' : 'color-mix(in srgb, currentColor 30%, transparent)' })),
      sounds: SOUNDS.map((name: any) => {
        const on = s.sound === name;
        return { name, on: String(on), border: on ? 'var(--color-accent-400)' : 'color-mix(in srgb, currentColor 24%, transparent)', color: on ? 'var(--color-accent-400)' : 'inherit', pick: () => this.setState({ sound: on ? null : name }) };
      }),

      lineV: s.loaded ? 'scaleY(1)' : 'scaleY(0)', lineH: s.loaded ? 'scaleX(1)' : 'scaleX(0)', boxDash: s.loaded ? 0 : 1400, boxV: s.loaded ? 'scaleY(1)' : 'scaleY(0)', boxH: s.loaded ? 'scaleX(1)' : 'scaleX(0)',
      rowA: [...QUOTES.slice(0, 4), ...QUOTES.slice(0, 4)].map(card), rowB: [...QUOTES.slice(4), ...QUOTES.slice(4)].map(card),
      markTf: `translateY(${((1 - s.foot) * 18).toFixed(1)}%)`
    };
  }

  render() {
    return <LandingView v={this.renderVals()} setStory={this.setStory} setDesk={this.setDesk} setFs={this.setFs} setFocus={this.setFocus} />;
  }
}

export default Landing;
