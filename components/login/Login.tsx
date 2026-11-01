"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { css, foc, hov } from "@/lib/inline-style";
import { formatToday } from "@/lib/today";
import { sendReset, signIn, signInWithGoogle, signUp, type AuthResult } from "@/lib/auth";

type Mode = "signin" | "signup";

const CAVEAT = "var(--font-caveat), cursive";
const HAND_INPUT = `height:40px;padding:0 2px;background:transparent;border:0;outline:none;font-family:${CAVEAT};font-size:1.5rem;color:#1e3a8a`;
const LABEL = "font-size:0.6875rem;letter-spacing:.1em;text-transform:uppercase;color:#5b6b8c";
const OPEN = "inset(-8px -8px -8px -8px)";
const CLOSED = "inset(-8px 100% -8px -8px)";

const DOODLES: { side: "left" | "right"; top: string; rotate: number; delay: number; color: string; text?: string; size?: number; svg?: React.ReactNode }[] = [
  { side: "left", top: "120px", rotate: -4, delay: 3.6, color: "#2456c9", text: "sign in<br>here →" },
  {
    side: "left", top: "58%", rotate: 6, delay: 3.9, color: "#5b6b8c",
    svg: <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" style={css("stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round")}><path d="M20 20c1-2 4-1 4 1s-3 5-6 4-5-5-3-8 7-6 11-3 6 8 3 12-11 7-15 3-7-10-3-15 13-8 18-3" /></svg>,
  },
  { side: "right", top: "150px", rotate: 5, delay: 4.2, color: "#d84a52", text: "don’t forget<br>ur password" },
  {
    side: "right", top: "46%", rotate: -8, delay: 4.4, color: "#e0a526",
    svg: <svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" style={css("stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round")}><path d="M17 3 L21 13 L32 13 L23 20 L27 31 L17 24 L7 31 L11 20 L2 13 L13 13 Z" /></svg>,
  },
  { side: "right", top: "72%", rotate: 3, delay: 4.6, color: "#5b6b8c", text: "3 boards<br>waiting :)", size: 17 },
];

export default function Login() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState<"err" | "ok">("err");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [turning, setTurning] = useState(false);
  const [turnLabel, setTurnLabel] = useState("");
  const [today, setToday] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setLoaded(true)));
    // Fallback so the page never stays blank in a background tab, where rAF is paused.
    const t = setTimeout(() => {
      setLoaded(true);
      setToday(formatToday());
    }, 80);
    const timerList = timers.current;
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      timerList.forEach(clearTimeout);
    };
  }, []);

  const up = mode === "signup";
  const okE = /\S+@\S+\.\S+/.test(email);
  const okP = pw.length >= 6;

  function fail(text: string) {
    setBusy(false);
    setTried(true);
    setMsgKind("err");
    setMsg(text);
  }

  /** `leaves`: the provider takes over the whole page (Google), so there is nothing to animate. */
  function go(label: string, run: () => Promise<AuthResult>, leaves = false) {
    setBusy(true);
    setMsg("");
    run()
      .then((r) => {
        if (!r.ok) return fail(r.error);
        if (leaves) return;
        if (r.needsConfirm) {
          setBusy(false);
          setMsgKind("ok");
          setMsg("check your inbox to confirm ✉");
          return;
        }
        timers.current.push(setTimeout(() => { setTurning(true); setTurnLabel(label); }, 900));
        timers.current.push(setTimeout(() => router.push("/dashboard"), 2000));
      })
      .catch(() => fail("couldn't reach the server, try again"));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (up && !name.trim()) { setTried(true); setMsgKind("err"); setMsg("add your name first ✎"); return; }
    if (!okE) { setTried(true); setMsgKind("err"); setMsg("hmm, that email looks off"); return; }
    if (!okP) { setTried(true); setMsgKind("err"); setMsg("password needs 6+ characters"); return; }
    if (up) go("new notebook, coming up…", () => signUp(name, email, pw));
    else go("turning to your desk…", () => signIn(email, pw));
  }

  function pickMode(m: Mode) {
    setMode(m);
    setMsg("");
    setTried(false);
  }

  async function forgot() {
    if (!okE) { setMsgKind("err"); setMsg("type your email first, then tap Forgot it?"); return; }
    const r = await sendReset(email).catch(() => null);
    if (!r?.ok) {
      setMsgKind("err");
      setMsg(r ? r.error : "couldn't reach the server, try again");
      return;
    }
    setMsgKind("ok");
    setMsg("reset link sent, check your inbox ✉");
  }

  const notes: [string, string, string][] = up
    ? [["✎", "make a board for each subject", "#1e3a8a"], ["✎", "drop in your PDFs", "#1e3a8a"], ["→", "highlight. it lands in your notes.", "#d84a52"]]
    : [["✓", "ch. 4 highlights, 12 of them", "#1e3a8a"], ["✓", "lab 2 notes, half done", "#1e3a8a"], ["→", "revise cristae tonight!", "#d84a52"]];

  const L = loaded;
  const h1a = up ? "Start a fresh" : "Welcome back";
  const h1b = up ? "page in the" : "to the";
  const leadA = up ? "Create an account and your first board is one upload away." : "Your boards, highlights and handwritten notes are";
  const leadHl = up ? "No AI rewriting, ever." : "right where you left them.";
  const boxV = L ? "scaleY(1)" : "scaleY(0)";
  const boxH = L ? "scaleX(1)" : "scaleX(0)";
  const boxLine = "position:absolute;background:#d84a52;transition:transform .8s cubic-bezier(.5,0,.3,1)";

  return (
    <div style={css("--ml:max(12px, calc(8vw - 20px));--pl:calc(max(12px, calc(8vw - 20px)) + clamp(16px, 3vw, 44px));position:relative;min-height:100vh;color:#1b2847;font-family:var(--font-body)")}>
      <div style={css(`position:fixed;top:0;bottom:0;left:var(--ml);width:7px;margin-left:-3px;box-sizing:border-box;border-left:2px solid #e2575f;border-right:2px solid #e2575f;z-index:30;pointer-events:none;transform:${L ? "scaleY(1)" : "scaleY(0)"};transform-origin:50% 0;transition:transform 1.8s cubic-bezier(.6,0,.2,1) .3s`)} />
      <div style={css(`position:fixed;top:63px;left:0;right:0;height:2px;background:#5f8fd6;z-index:31;pointer-events:none;transform:${L ? "scaleX(1)" : "scaleX(0)"};transform-origin:0 50%;transition:transform 1.6s cubic-bezier(.6,0,.2,1) 1.9s`)} />
      <div style={css(`position:fixed;top:0;bottom:0;right:var(--ml);width:2px;background:#e2575f;z-index:30;pointer-events:none;transform:${L ? "scaleY(1)" : "scaleY(0)"};transform-origin:50% 0;transition:transform 1.8s cubic-bezier(.6,0,.2,1) 3.4s`)} />

      <nav style={css("position:relative;z-index:25;display:flex;align-items:center;gap:24px;height:64px;padding:0 var(--pl);background:#fdfcf7")}>
        <Link href="/" style={css("margin-right:auto;font-family:var(--font-heading);font-weight:600;font-size:1.5625rem;color:#1b2847;text-decoration:none")}>Margin</Link>
        <Link href="/" style={css("display:flex;align-items:center;gap:6px;font-size:0.875rem;color:#1b2847;text-decoration:none")} {...hov("color:#2456c9")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={css("stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round")}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Back to home
        </Link>
      </nav>

      {DOODLES.map((d, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="nb-doodle"
          style={css(
            `position:absolute;${d.side}:0;width:var(--ml);top:${d.top};box-sizing:border-box;${d.side === "left" ? "padding-right:14px" : "padding-left:14px"};` +
              (d.svg ? `display:flex;justify-content:${d.side === "left" ? "flex-end" : "flex-start"};` : `font-family:${CAVEAT};font-size:${d.size ?? 18}px;line-height:1.05;${d.side === "left" ? "text-align:right;" : ""}`) +
              `color:${d.color};transform:rotate(${d.rotate}deg);opacity:${L ? 1 : 0};transition:opacity .8s ${d.delay}s`,
          )}
        >
          {d.svg ?? d.text!.split("<br>").flatMap((t, k) => (k ? [<br key={k} />, t] : [t]))}
        </div>
      ))}

      <main style={css("min-height:calc(100vh - 64px);box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:48px clamp(40px,7vw,120px);padding:48px var(--pl) 64px")}>
        <section style={css("flex:1 1 380px;max-width:560px;display:flex;flex-direction:column;gap:22px")}>
          <span style={css(`font-family:${CAVEAT};font-size:1.375rem;min-height:1.2em;color:#2456c9;clip-path:${L ? "inset(-10px -10px -10px -10px)" : "inset(-10px 100% -10px -10px)"};transition:clip-path 1s cubic-bezier(.45,0,.55,1) .4s`)}>{today}</span>
          <h1 style={css("font-family:var(--font-heading);font-weight:400;font-size:clamp(2.75rem,5.6vw,5.25rem);line-height:1;letter-spacing:-0.02em;margin:0")}>
            <span style={css("display:block;overflow:hidden;padding-bottom:.06em")}>
              <span style={css(`display:block;transform:${L ? "translateY(0)" : "translateY(105%)"};transition:transform 1.1s cubic-bezier(.2,.75,.15,1) .5s`)}>{h1a}</span>
            </span>
            <span style={css("display:block;overflow:hidden;padding-bottom:.18em")}>
              <span style={css(`display:block;transform:${L ? "translateY(0)" : "translateY(105%)"};transition:transform 1.1s cubic-bezier(.2,.75,.15,1) .65s`)}>
                {h1b}{" "}
                <span style={css(`position:relative;display:inline-block;font-family:${CAVEAT};font-weight:500;font-size:1.1em;color:#d84a52;transform:rotate(-2deg);padding:0 .14em`)}>
                  <span style={css(`display:inline-block;clip-path:${L ? "inset(-20% -10% -40% -5%)" : "inset(-20% 100% -40% -5%)"};transition:clip-path 1s cubic-bezier(.5,0,.4,1) 1.3s`)}>Margin.</span>
                  <span style={css(`${boxLine};left:0;top:4%;bottom:2%;width:2px;transform:${boxV};transform-origin:50% 0;transition-delay:2.1s`)} />
                  <span style={css(`${boxLine};right:0;top:4%;bottom:2%;width:2px;transform:${boxV};transform-origin:50% 100%;transition-delay:2.1s`)} />
                  <span style={css(`${boxLine};left:-6%;right:-6%;top:14%;height:2px;transform:${boxH};transform-origin:0 50%;transition-delay:2.8s`)} />
                  <span style={css(`${boxLine};left:-6%;right:-6%;bottom:10%;height:2px;transform:${boxH};transform-origin:100% 50%;transition-delay:2.8s`)} />
                </span>
              </span>
            </span>
          </h1>
          <p style={css(`margin:0;max-width:44ch;font-size:1.0625rem;line-height:32px;color:#34436a;opacity:${L ? 1 : 0};transition:opacity 1s 1s`)}>
            {leadA}{" "}
            <span style={css(`background-image:linear-gradient(100deg,transparent 0 1%,#fff38a 2% 97%,transparent 98%);background-repeat:no-repeat;background-size:${L ? "100% 100%" : "0% 100%"};transition:background-size 1.1s cubic-bezier(.6,0,.35,1) 2.4s;padding:2px 3px;color:#1b2847`)}>{leadHl}</span>
          </p>
          <div style={css("display:flex;flex-direction:column;margin-top:6px;padding-left:4px")}>
            {notes.map(([m, t, c], i) => (
              <div key={t} style={css(`height:32px;display:flex;align-items:flex-end;gap:10px;padding-bottom:2px;font-family:${CAVEAT};font-size:1.4375rem;line-height:1;color:${c};clip-path:${L ? OPEN : CLOSED};transition:clip-path 1.1s cubic-bezier(.45,0,.55,1) ${3.2 + i * 0.9}s`)}>
                <span style={css("width:18px;flex:none")}>{m}</span>
                {t}
              </div>
            ))}
          </div>
        </section>

        <section style={css(`flex:0 1 420px;position:relative;opacity:${L ? 1 : 0};transform:${busy ? "translateY(-6px) rotate(0deg)" : L ? "translateY(0) rotate(-0.8deg)" : "translateY(40px) rotate(-5deg)"};transition:opacity .7s .9s,transform 1.1s cubic-bezier(.2,.8,.2,1.05) .9s`)}>
          <div style={css("position:absolute;left:50%;top:-14px;width:110px;height:28px;transform:translateX(-50%) rotate(-3deg);background:rgba(255,224,102,.75);z-index:2;box-shadow:0 1px 2px rgba(0,0,0,.06)")} />
          <form onSubmit={submit} noValidate style={css("position:relative;display:flex;flex-direction:column;gap:20px;padding:34px 32px 28px;background-color:#fffefb;background-image:repeating-linear-gradient(to bottom,transparent 0 31px,#dbe6f4 31px 32px);background-position:0 78px;border-radius:3px;box-shadow:0 2px 0 #ece8de,0 18px 44px rgba(30,40,70,.16);border-top:3px solid #e2575f")}>
            <div role="tablist" style={css("display:flex;gap:22px;border-bottom:1.5px solid #9fbde3;background:#fffefb;margin:-6px -32px 0;padding:0 32px")}>
              {([["signin", "Sign in"], ["signup", "Create account"]] as [Mode, string][]).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => pickMode(k)} style={css(`position:relative;padding:8px 0 12px;background:transparent;border:0;font:inherit;font-size:0.9375rem;cursor:pointer;color:${mode === k ? "#1b2847" : "#7a86a0"};transition:color .25s`)}>
                  {label}
                  <span style={css(`position:absolute;left:0;right:0;bottom:-1.5px;height:2.5px;background:#2456c9;transform:${mode === k ? "scaleX(1)" : "scaleX(0)"};transform-origin:0 50%;transition:transform .45s cubic-bezier(.2,.75,.15,1)`)} />
                </button>
              ))}
            </div>

            {up && (
              <label style={css("display:flex;flex-direction:column;gap:2px")}>
                <span style={css(LABEL)}>Your name</span>
                <input value={name} onChange={(e) => { setName(e.target.value); setMsg(""); }} placeholder="what should we call you?" autoComplete="name" style={css(`${HAND_INPUT};border-bottom:1.5px solid #9fbde3`)} {...foc("border-bottom:2px solid #2456c9")} />
              </label>
            )}
            <label style={css("display:flex;flex-direction:column;gap:2px")}>
              <span style={css(LABEL)}>Email</span>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg(""); }} placeholder="you@school.edu" autoComplete="email" style={css(`${HAND_INPUT};border-bottom:1.5px solid ${tried && !okE ? "#d84a52" : "#9fbde3"}`)} {...foc("border-bottom:2px solid #2456c9")} />
            </label>
            <label style={css("display:flex;flex-direction:column;gap:2px")}>
              <span style={css(`display:flex;justify-content:space-between;align-items:baseline;${LABEL}`)}>
                Password
                {!up && (
                  <button type="button" onClick={forgot} style={css("font:inherit;font-size:0.75rem;letter-spacing:0;text-transform:none;color:#2456c9;background:transparent;border:0;padding:0;cursor:pointer")}>Forgot it?</button>
                )}
              </span>
              <span style={css("position:relative;display:block")}>
                <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setMsg(""); }} placeholder="at least 6 characters" autoComplete={up ? "new-password" : "current-password"} style={css(`width:100%;box-sizing:border-box;height:40px;padding:0 40px 0 2px;background:transparent;border:0;border-bottom:1.5px solid ${tried && okE && !okP ? "#d84a52" : "#9fbde3"};outline:none;font-family:var(--font-body);font-size:1rem;letter-spacing:.08em;color:#1e3a8a`)} {...foc("border-bottom:2px solid #2456c9")} />
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"} title={showPw ? "Hide password" : "Show password"} style={css("position:absolute;right:0;top:4px;width:34px;height:34px;display:grid;place-items:center;background:transparent;border:0;cursor:pointer;color:#5b6b8c;border-radius:4px")} {...hov("color:#2456c9")}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={css("stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round")}>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPw && <path d="M3 3l18 18" />}
                  </svg>
                </button>
              </span>
            </label>

            <div role="status" style={css(`min-height:26px;font-family:${CAVEAT};font-size:1.3125rem;line-height:1.1;color:${msgKind === "ok" ? "#2456c9" : "#d84a52"};opacity:${msg ? 1 : 0};transform:${msg ? "translateY(0) rotate(-1deg)" : "translateY(-4px)"};transition:opacity .3s,transform .3s`)}>{msg}</div>

            <button type="submit" className="btn btn-primary btn-block" style={css(`height:48px;font-size:1rem;gap:10px;margin-top:-8px;background:${busy ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent"};transition:background .3s`)}>
              {busy ? "Opening your desk" : up ? "Create account" : "Sign in"}
              <span style={css(`display:${busy ? "inline-flex" : "none"};gap:3px`)}>
                {[0, 0.2, 0.4].map((d) => (
                  <span key={d} style={css(`width:5px;height:5px;border-radius:50%;background:currentColor;animation:blink 1s ${d}s infinite`)} />
                ))}
              </span>
            </button>

            <div style={css(`display:flex;align-items:center;gap:12px;font-family:${CAVEAT};font-size:1.1875rem;color:#5b6b8c`)}>
              <span style={css("flex:1;height:1.5px;background:#c3d6ee")} />or<span style={css("flex:1;height:1.5px;background:#c3d6ee")} />
            </div>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => { if (!busy) go("turning to your desk…", signInWithGoogle, true); }} style={css("height:46px;font-size:0.9375rem;gap:10px;background:#fffefb")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={css("stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round")}><circle cx="12" cy="12" r="9" /><path d="M12 12h8" /></svg>
              Continue with Google
            </button>
            <p style={css("margin:0;font-size:0.7812rem;line-height:1.6;color:#5b6b8c;text-align:center")}>
              {up ? "Already have a notebook?" : "New to Margin?"}{" "}
              <button type="button" onClick={() => pickMode(up ? "signin" : "signup")} style={css("font:inherit;color:#2456c9;background:transparent;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px")}>
                {up ? "Sign in" : "Create an account"}
              </button>
            </p>
            <p style={css("margin:-8px 0 0;font-size:0.7812rem;line-height:1.6;color:#5b6b8c;text-align:center")}>
              <Link href="/dashboard" style={css("color:#5b6b8c;text-decoration:underline;text-underline-offset:3px")}>
                Continue without an account
              </Link>
              {" "}(boards stay in this browser)
            </p>
          </form>
        </section>
      </main>

      <div aria-hidden="true" style={css(`position:fixed;inset:0;z-index:60;pointer-events:none;background-color:#fdfcf7;background-image:repeating-linear-gradient(to bottom,transparent 0 31px,#c3d6ee 31px 32px);box-shadow:-30px 0 60px rgba(30,40,70,.18);transform:${turning ? "translateX(0)" : "translateX(105%)"};transition:transform .9s cubic-bezier(.7,0,.25,1)`)}>
        <div style={css("position:absolute;top:0;bottom:0;left:var(--ml);width:7px;margin-left:-3px;box-sizing:border-box;border-left:2px solid #e2575f;border-right:2px solid #e2575f")} />
        <div style={css(`position:absolute;inset:0;display:grid;place-items:center;font-family:${CAVEAT};font-size:2.5rem;color:#2456c9`)}>{turnLabel}</div>
      </div>
    </div>
  );
}
