import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, RotateCcw, Square, Trash2, Volume2, VolumeX, BarChart2,
  Clock, Timer, ChevronRight, Flame, SkipForward, Play, Pause, Check,
  ArrowLeft, Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toISOString();

function fmtMs(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

function fmtShort(ms: number) {
  if (!ms) return "0s";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function fmtTime12(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ─── Types ──────────────────────────────────────────────
interface TrackerColor {
  name: string; bg: string; fg: string; dot: string; soft: string; shadow: string;
}

interface ChainStep {
  type: "timer" | "stopwatch" | "counter";
  emoji: string; label: string;
  durationMs?: number; target?: number;
}

interface Activity {
  id: string;
  type: "timer" | "stopwatch" | "counter" | "chain";
  label: string; emoji: string; color: string;
  durationMs?: number; step?: number;
  dailyGoal?: number; streak?: boolean;
  steps?: ChainStep[];
}

interface Alarm {
  id: string; label: string; emoji: string;
  hour: number; minute: number; enabled: boolean; color: string;
}

interface RunState {
  startedAt: number; accMs: number; pausedAt?: number | null;
  stepIndex: number; stepCount: number; alerted?: boolean;
}

interface Session {
  id: string; actId: string; kind: string;
  at?: string; startAt?: string; endAt?: string | null;
  delta?: number; durationMs?: number;
}

// ─── Constants ──────────────────────────────────────────
const COLORS: TrackerColor[] = [
  { name: "strawberry", bg: "#FFE4E6", fg: "#E11D48", dot: "#F43F5E", soft: "#FFF1F2", shadow: "rgba(244, 63, 94, 0.25)" },
  { name: "orange", bg: "#FFEDD5", fg: "#EA580C", dot: "#F97316", soft: "#FFF7ED", shadow: "rgba(249, 115, 22, 0.25)" },
  { name: "banana", bg: "#FEF9C3", fg: "#CA8A04", dot: "#EAB308", soft: "#FEFCE8", shadow: "rgba(234, 179, 8, 0.25)" },
  { name: "lime", bg: "#ECFCCB", fg: "#65A30D", dot: "#84CC16", soft: "#F7FEE7", shadow: "rgba(132, 204, 22, 0.25)" },
  { name: "mint", bg: "#CCFBF1", fg: "#0D9488", dot: "#14B8A6", soft: "#F0FDFA", shadow: "rgba(20, 184, 166, 0.25)" },
  { name: "blueberry", bg: "#DBEAFE", fg: "#2563EB", dot: "#3B82F6", soft: "#EFF6FF", shadow: "rgba(59, 130, 246, 0.25)" },
  { name: "grape", bg: "#F3E8FF", fg: "#7C3AED", dot: "#8B5CF6", soft: "#FAF5FF", shadow: "rgba(139, 92, 246, 0.25)" },
  { name: "bubblegum", bg: "#FAE8FF", fg: "#C026D3", dot: "#D946EF", soft: "#FDF4FF", shadow: "rgba(217, 70, 239, 0.25)" },
  { name: "coal", bg: "#E5E7EB", fg: "#374151", dot: "#6B7280", soft: "#F3F4F6", shadow: "rgba(107, 114, 128, 0.25)" },
];

const EMOJIS = [
  "🎯", "⏰", "⏳", "🧘", "💪", "🏃", "🚴", "🏊", "💧", "☕", "🍎",
  "📚", "📝", "💻", "🎵", "🎨", "🔬", "💊", "🧠", "🌱", "🧹",
  "✅", "🔥", "🚀", "💯", "🏆", "⚡", "✨", "🌟", "🎮", "🧩",
  "🤸", "🍳", "🥊", "🦷", "🍵", "🥤", "🥦", "📱", "💡",
];

const DEFAULTS: Activity[] = [
  { id: uid(), type: "timer", label: "Focus", emoji: "🎯", color: "grape", durationMs: 25 * 60000, streak: true },
  { id: uid(), type: "counter", label: "Water", emoji: "💧", color: "blueberry", step: 1, dailyGoal: 8 },
  {
    id: uid(), type: "chain", label: "Workout", emoji: "💪", color: "strawberry", streak: true,
    steps: [
      { type: "timer", emoji: "🧘", label: "Warm Up", durationMs: 5 * 60000 },
      { type: "counter", emoji: "🤸", label: "Pushups", target: 20 },
      { type: "stopwatch", emoji: "🏃", label: "Run", durationMs: 0 },
    ],
  },
];

const DEFAULT_ALARMS: Alarm[] = [
  { id: uid(), label: "Wake Up", emoji: "☀️", hour: 7, minute: 0, enabled: true, color: "orange" },
];

// ─── Sound ──────────────────────────────────────────────
function playChime(type = "success") {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    if (type === "success") {
      o.type = "sine";
      o.frequency.setValueAtTime(523.25, t);
      o.frequency.exponentialRampToValueAtTime(1046.5, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      o.start(t); o.stop(t + 0.45);
    } else {
      o.type = "triangle";
      o.frequency.setValueAtTime(800, t);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.start(t); o.stop(t + 0.06);
    }
  } catch {}
}

function playAlarmSound() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    [659.25, 523.25, 392.00, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f;
      const st = t + i * 0.15;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.2, st + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, st + 0.4);
      o.start(st); o.stop(st + 0.45);
    });
  } catch {}
}

// ─── Streak ─────────────────────────────────────────────
function getStreak(actId: string, sessions: Session[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = [...new Set(
    sessions.filter(s => s.actId === actId && (s.startAt || s.at))
      .map(s => { const d = new Date(s.startAt || s.at!); d.setHours(0, 0, 0, 0); return d.getTime(); })
  )].sort((a, b) => b - a);
  if (!days.length) return 0;
  if (Math.floor((today.getTime() - days[0]) / 864e5) > 1) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (Math.floor((days[i - 1] - days[i]) / 864e5) === 1) streak++; else break;
  }
  return streak;
}

// ─── Persistence ────────────────────────────────────────
const STORE_KEY = "juicy-tracker-v3";
function loadStore() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveStore(d: any) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch {}
}

// ─── Main Component ─────────────────────────────────────
const TrackerPage = () => {
  const [acts, setActs] = useState<Activity[]>(DEFAULTS);
  const [alarms, setAlarms] = useState<Alarm[]>(DEFAULT_ALARMS);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [running, setRunning] = useState<Record<string, RunState>>({});
  const [sheet, setSheet] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const firedRef = useRef(new Set<string>());

  // Load
  useEffect(() => {
    const d = loadStore();
    if (d) {
      if (d.acts) setActs(d.acts);
      if (d.alarms) setAlarms(d.alarms);
      if (d.sessions) setSessions(d.sessions);
    }
  }, []);

  // Save
  useEffect(() => { saveStore({ acts, alarms, sessions }); }, [acts, alarms, sessions]);

  // Tick
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const k = `${d.toDateString()}:${d.getHours()}:${d.getMinutes()}`;
      if (!firedRef.current.has(k)) {
        alarms.forEach(a => {
          if (a.enabled && d.getHours() === a.hour && d.getMinutes() === a.minute && d.getSeconds() < 2) {
            firedRef.current.add(k);
            if (soundOn) playAlarmSound();
          }
        });
      }

      setRunning(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [actId, run] of Object.entries(next)) {
          if (run.pausedAt) continue;
          const act = acts.find(a => a.id === actId);
          if (!act) continue;

          if (act.type === "timer") {
            const el = Date.now() - run.startedAt;
            const rem = (act.durationMs || 0) - (run.accMs + el);
            if (rem <= 0 && !run.alerted) {
              if (soundOn) playChime();
              next[actId] = { ...run, alerted: true, pausedAt: Date.now() };
              changed = true;
            }
          }

          if (act.type === "chain" && act.steps) {
            const step = act.steps[run.stepIndex];
            if (!step) continue;
            if (step.type === "timer") {
              const el = Date.now() - run.startedAt;
              const rem = (step.durationMs || 0) - (run.accMs + el);
              if (rem <= 0) {
                if (soundOn) playChime();
                const nextIdx = run.stepIndex + 1;
                if (nextIdx < act.steps.length) {
                  next[actId] = { ...run, stepIndex: nextIdx, startedAt: Date.now(), accMs: 0, stepCount: 0 };
                } else {
                  next[actId] = { ...run, alerted: true, pausedAt: Date.now() };
                }
                changed = true;
              }
            }
          }
        }
        return changed ? next : prev;
      });
    }, 200);
    return () => clearInterval(id);
  }, [acts, alarms, soundOn]);

  const handleTapAct = (act: Activity) => {
    if (act.type === "counter") {
      setSessions(s => [...s, { id: uid(), actId: act.id, kind: "counter", at: now(), delta: act.step || 1 }]);
      if (soundOn) playChime("tick");
      return;
    }

    setRunning(prev => {
      const run = prev[act.id];
      if (!run) {
        setSessions(s => [...s, { id: uid(), actId: act.id, kind: act.type, startAt: now(), endAt: null }]);
        return { ...prev, [act.id]: { startedAt: Date.now(), accMs: 0, stepIndex: 0, stepCount: 0 } };
      }
      if (run.alerted) {
        const next = { ...prev }; delete next[act.id]; return next;
      }

      if (act.type === "chain" && act.steps) {
        const step = act.steps[run.stepIndex];
        if (step?.type === "counter" && !run.pausedAt) {
          const newCount = (run.stepCount || 0) + 1;
          if (soundOn) playChime("tick");
          if (step.target && newCount >= step.target) {
            if (soundOn) playChime("success");
            const nextIdx = run.stepIndex + 1;
            if (nextIdx < act.steps.length) {
              return { ...prev, [act.id]: { ...run, stepIndex: nextIdx, startedAt: Date.now(), accMs: 0, stepCount: 0 } };
            }
            return { ...prev, [act.id]: { ...run, alerted: true, pausedAt: Date.now() } };
          }
          return { ...prev, [act.id]: { ...run, stepCount: newCount } };
        }
      }

      if (run.pausedAt) {
        return { ...prev, [act.id]: { ...run, startedAt: Date.now(), pausedAt: null } };
      }
      return { ...prev, [act.id]: { ...run, accMs: run.accMs + (Date.now() - run.startedAt), pausedAt: Date.now() } };
    });
  };

  const handleFinishSession = (actId: string) => {
    const run = running[actId];
    if (!run) return;
    setSessions(s => {
      let idx = -1;
      for (let i = s.length - 1; i >= 0; i--) {
        if (s[i].actId === actId && !s[i].endAt) { idx = i; break; }
      }
      if (idx === -1) return s;
      const copy = [...s];
      const dur = run.accMs + (run.pausedAt ? 0 : (Date.now() - run.startedAt));
      copy[idx] = { ...copy[idx], endAt: now(), durationMs: dur };
      return copy;
    });
  };

  const handleSkip = (actId: string, act: Activity) => {
    setRunning(prev => {
      const run = prev[actId];
      if (!run) return prev;
      if (act.type === "chain" && act.steps) {
        const nextIdx = run.stepIndex + 1;
        if (nextIdx < act.steps.length) {
          return { ...prev, [actId]: { ...run, stepIndex: nextIdx, startedAt: Date.now(), accMs: 0, stepCount: 0, pausedAt: null } };
        }
        handleFinishSession(actId);
        const next = { ...prev }; delete next[actId]; return next;
      }
      handleFinishSession(actId);
      const next = { ...prev }; delete next[actId]; return next;
    });
  };

  const handleReset = (actId: string) => {
    handleFinishSession(actId);
    setRunning(p => { const n = { ...p }; delete n[actId]; return n; });
  };

  const handleDeleteAct = (id: string) => setActs(p => p.filter(a => a.id !== id));
  const handleDeleteAlarm = (id: string) => setAlarms(p => p.filter(a => a.id !== id));

  const allCards = [
    ...alarms.map(a => ({ kind: "alarm" as const, data: a, sort: 0 })),
    ...acts.map(a => ({ kind: "act" as const, data: a, sort: 1 })),
  ].sort((a, b) => a.sort - b.sort);

  return (
    <div className="min-h-screen font-nunito" style={{ background: "#FDFCF8" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-4" style={{ background: "#FDFCF8" }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
            </div>
            <div className="text-xl font-extrabold text-foreground">Tracker</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSheet("stats")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80 transition">
            <BarChart2 size={18} />
          </button>
          <button onClick={() => setSoundOn(!soundOn)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80 transition">
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-4 px-5 pb-28" style={{ maxWidth: 500, margin: "0 auto" }}>
        {allCards.map((item) => (
          <React.Fragment key={item.data.id}>
            {item.kind === "alarm" ? (
              <AlarmCard
                alarm={item.data as Alarm}
                onToggle={() => setAlarms(p => p.map(a => a.id === item.data.id ? { ...a, enabled: !(a as Alarm).enabled } : a))}
                onLongPress={() => handleDeleteAlarm(item.data.id)}
              />
            ) : (
              <ActCard
                act={item.data as Activity}
                run={running[(item.data as Activity).id]}
                sessions={sessions}
                onTap={() => handleTapAct(item.data as Activity)}
                onSkip={() => handleSkip((item.data as Activity).id, item.data as Activity)}
                onReset={() => handleReset((item.data as Activity).id)}
                onLongPress={() => handleDeleteAct(item.data.id)}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <button
          onClick={() => setSheet("add")}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-xl transition hover:scale-105 active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Sheets */}
      <AnimatePresence>
        {sheet === "add" && (
          <AddSheet
            onClose={() => setSheet(null)}
            onAddAct={a => setActs(p => [...p, a])}
            onAddAlarm={a => setAlarms(p => [...p, a])}
          />
        )}
        {sheet === "stats" && (
          <StatsSheet sessions={sessions} acts={acts} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── AlarmCard ──────────────────────────────────────────
function AlarmCard({ alarm, onToggle, onLongPress }: { alarm: Alarm; onToggle: () => void; onLongPress: () => void }) {
  const col = COLORS.find(c => c.name === alarm.color) || COLORS[1];
  return (
    <div
      className="col-span-2 flex items-center justify-between rounded-[28px] p-[18px_20px] transition-all active:scale-[0.96]"
      style={{ background: col.soft, border: `1px solid ${col.bg}` }}
      onContextMenu={e => { e.preventDefault(); onLongPress(); }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{alarm.emoji}</span>
        <div>
          <div className="font-mono text-lg font-bold" style={{ color: col.fg }}>{fmtTime12(alarm.hour, alarm.minute)}</div>
          <div className="text-xs text-muted-foreground">{alarm.label}</div>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className="relative h-[26px] w-[44px] rounded-full transition-all duration-300"
        style={{ background: alarm.enabled ? "#34D399" : "#E4E4E7" }}
      >
        <div
          className="absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-300"
          style={{ transform: alarm.enabled ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

// ─── ActCard ────────────────────────────────────────────
function ActCard({ act, run, sessions, onTap, onSkip, onReset, onLongPress }: {
  act: Activity; run?: RunState; sessions: Session[];
  onTap: () => void; onSkip: () => void; onReset: () => void; onLongPress: () => void;
}) {
  const [tick, setTick] = useState(0);
  const col = COLORS.find(c => c.name === act.color) || COLORS[0];

  useEffect(() => {
    if (!run || run.pausedAt) return;
    const id = requestAnimationFrame(() => setTick(t => t + 1));
    return () => cancelAnimationFrame(id);
  }, [run, tick]);

  const isRunning = !!run && !run.alerted;
  const isPaused = !!run?.pausedAt;
  const isDone = !!run?.alerted;

  const td = new Date(); td.setHours(0, 0, 0, 0);
  const todayCount = act.type === "counter"
    ? sessions.filter(s => s.actId === act.id && s.at && new Date(s.at) >= td).reduce((a, b) => a + (b.delta || 0), 0)
    : 0;

  const streak = act.streak ? getStreak(act.id, sessions) : 0;

  let mainText: string | number = "";
  let subText = act.label;
  let progress = 0;

  if (act.type === "timer") {
    if (run) {
      const el = ((run.pausedAt || Date.now()) - run.startedAt);
      const rem = Math.max(0, (act.durationMs || 0) - (run.accMs + el));
      mainText = fmtMs(rem);
      progress = 1 - (rem / (act.durationMs || 1));
    } else {
      mainText = fmtShort(act.durationMs || 0);
    }
  } else if (act.type === "stopwatch") {
    if (run) {
      const el = ((run.pausedAt || Date.now()) - run.startedAt);
      mainText = fmtMs(run.accMs + el);
    } else {
      mainText = "0:00";
    }
  } else if (act.type === "counter") {
    mainText = todayCount;
    if (act.dailyGoal) {
      subText = `/ ${act.dailyGoal} ${act.label}`;
      progress = Math.min(1, todayCount / act.dailyGoal);
    }
  } else if (act.type === "chain" && act.steps) {
    if (run && !isDone) {
      const step = act.steps[run.stepIndex];
      subText = step?.label || act.label;
      if (step?.type === "timer") {
        const el = ((run.pausedAt || Date.now()) - run.startedAt);
        const rem = Math.max(0, (step.durationMs || 0) - (run.accMs + el));
        mainText = fmtMs(rem);
        progress = 1 - (rem / (step.durationMs || 1));
      } else if (step?.type === "stopwatch") {
        const el = ((run.pausedAt || Date.now()) - run.startedAt);
        mainText = fmtMs(run.accMs + el);
      } else if (step?.type === "counter") {
        mainText = `${run.stepCount || 0}`;
        if (step.target) { mainText += `/${step.target}`; progress = (run.stepCount || 0) / step.target; }
      }
    } else if (isDone) {
      mainText = "Done";
    } else {
      mainText = `${act.steps.length} steps`;
    }
  }

  return (
    <div
      onClick={onTap}
      onContextMenu={e => { e.preventDefault(); onLongPress(); }}
      className="relative flex flex-col items-center rounded-[28px] p-5 text-center transition-all duration-300 select-none active:scale-[0.96]"
      style={{
        background: isRunning && !isPaused ? col.bg : col.soft,
        border: "1px solid transparent",
        boxShadow: isRunning && !isPaused ? `${col.shadow.replace("0.25", "0.4")} 0px 12px 30px -8px, inset 0 0 0 2px ${col.dot}` : "0 2px 8px -2px rgba(0,0,0,0.05)",
        transform: isRunning && !isPaused ? "translateY(-2px)" : undefined,
        cursor: "pointer",
      }}
    >
      <div className={`mb-3 text-3xl ${isRunning && !isPaused ? "animate-pulse" : ""}`}>
        {act.type === "chain" && run && !isDone && act.steps ? act.steps[run.stepIndex]?.emoji : act.emoji}
      </div>

      {streak > 0 && (
        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold" style={{ color: col.fg }}>
          <Flame size={12} fill={col.fg} /> {streak}
        </div>
      )}

      <div className="mb-1 font-mono text-2xl font-bold" style={{ color: col.fg }}>
        {isDone ? <Check size={32} /> : mainText}
      </div>

      <div className="text-[11px] font-semibold text-muted-foreground">{subText}</div>

      {(isRunning || (act.type === "counter" && act.dailyGoal)) && !isDone && progress > 0 && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: `${col.dot}30` }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress * 100}%`, background: col.dot }} />
        </div>
      )}

      {/* Controls */}
      {isRunning && (
        <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={onSkip} className="flex h-8 w-8 items-center justify-center rounded-lg transition" style={{ background: `${col.dot}20`, color: col.fg }}>
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button onClick={isDone ? onReset : onReset} className="flex h-8 w-8 items-center justify-center rounded-lg transition" style={{ background: `${col.dot}20`, color: col.fg }}>
            {isDone ? <RotateCcw size={18} /> : <Square size={16} fill="currentColor" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AddSheet ───────────────────────────────────────────
function AddSheet({ onClose, onAddAct, onAddAlarm }: {
  onClose: () => void;
  onAddAct: (a: Activity) => void;
  onAddAlarm: (a: Alarm) => void;
}) {
  const [mode, setMode] = useState<"menu" | "simple" | "chain" | "alarm">("menu");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-[500px] rounded-t-[32px] bg-white p-6 shadow-xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {mode === "menu" && (
          <>
            <h2 className="mb-6 text-xl font-extrabold">Create New</h2>
            <MenuBtn icon="⏱️" title="Timer / Counter" desc="Simple tracking activity" onClick={() => setMode("simple")} color={COLORS[5]} />
            <MenuBtn icon="🔗" title="Routine Chain" desc="Sequence of timers & counters" onClick={() => setMode("chain")} color={COLORS[0]} />
            <MenuBtn icon="⏰" title="Alarm" desc="Daily scheduled reminder" onClick={() => setMode("alarm")} color={COLORS[1]} />
          </>
        )}
        {mode === "simple" && <AddSimple onBack={() => setMode("menu")} onAdd={a => { onAddAct(a); onClose(); }} />}
        {mode === "chain" && <AddChain onBack={() => setMode("menu")} onAdd={a => { onAddAct(a); onClose(); }} />}
        {mode === "alarm" && <AddAlarmForm onBack={() => setMode("menu")} onAdd={a => { onAddAlarm(a); onClose(); }} />}
      </motion.div>
    </motion.div>
  );
}

function MenuBtn({ icon, title, desc, onClick, color }: { icon: string; title: string; desc: string; onClick: () => void; color: TrackerColor }) {
  return (
    <button
      onClick={onClick}
      className="mb-3 flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:bg-secondary/50 active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: color.soft }}>{icon}</div>
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight size={20} className="text-muted-foreground" />
    </button>
  );
}

function AddSimple({ onBack, onAdd }: { onBack: () => void; onAdd: (a: Activity) => void }) {
  const [type, setType] = useState<"timer" | "stopwatch" | "counter">("timer");
  const [emoji, setEmoji] = useState("🎯");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("blueberry");
  const [min, setMin] = useState(25);
  const [goal, setGoal] = useState(8);

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ChevronRight size={16} className="rotate-180" /> Back</button>
      <div className="mb-4 flex gap-2">
        {(["timer", "stopwatch", "counter"] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className="flex-1 rounded-xl border-none px-3 py-2.5 text-sm font-semibold capitalize transition"
            style={{ background: type === t ? "#27272A" : "#F4F4F5", color: type === t ? "white" : "#71717A" }}>
            {t}
          </button>
        ))}
      </div>
      <EmojiPicker sel={emoji} onSel={setEmoji} />
      <input className="mb-4 w-full rounded-2xl border-none bg-secondary p-3.5 text-base font-semibold outline-none transition focus:bg-muted" placeholder="Activity name" value={label} onChange={e => setLabel(e.target.value)} />
      <ColorPicker sel={color} onSel={setColor} />
      {type === "timer" && (
        <div className="mb-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Duration (minutes)</div>
          <input type="number" value={min} onChange={e => setMin(+e.target.value)} className="w-full rounded-2xl border-none bg-secondary p-3 font-mono text-2xl font-bold outline-none" />
        </div>
      )}
      {type === "counter" && (
        <div className="mb-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Daily Goal</div>
          <input type="number" value={goal} onChange={e => setGoal(+e.target.value)} className="w-full rounded-2xl border-none bg-secondary p-3 font-mono text-2xl font-bold outline-none" />
        </div>
      )}
      <PrimaryBtn onClick={() => onAdd({
        id: uid(), type, label: label || "New Activity", emoji, color,
        durationMs: type === "timer" ? min * 60000 : undefined,
        dailyGoal: type === "counter" ? goal : undefined,
        step: type === "counter" ? 1 : undefined,
        streak: true,
      })} label="Create Activity" color={COLORS.find(c => c.name === color)} />
    </div>
  );
}

function AddChain({ onBack, onAdd }: { onBack: () => void; onAdd: (a: Activity) => void }) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("strawberry");
  const [steps, setSteps] = useState<ChainStep[]>([
    { type: "timer", emoji: "🧘", label: "Step 1", durationMs: 5 * 60000 },
  ]);

  const updateStep = (i: number, updates: Partial<ChainStep>) => setSteps(p => p.map((s, idx) => idx === i ? { ...s, ...updates } : s));
  const removeStep = (i: number) => setSteps(p => p.filter((_, idx) => idx !== i));

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ChevronRight size={16} className="rotate-180" /> Back</button>
      <input className="mb-4 w-full rounded-2xl border-none bg-secondary p-3.5 text-base font-semibold outline-none" placeholder="Routine name" value={label} onChange={e => setLabel(e.target.value)} />
      <ColorPicker sel={color} onSel={setColor} />

      {steps.map((step, i) => (
        <div key={i} className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3">
          <select value={step.type} onChange={e => updateStep(i, { type: e.target.value as any })} className="border-none bg-transparent text-xs font-bold text-muted-foreground">
            <option value="timer">Timer</option>
            <option value="stopwatch">Watch</option>
            <option value="counter">Count</option>
          </select>
          <input value={step.emoji} onChange={e => updateStep(i, { emoji: e.target.value })} className="w-8 border-none bg-transparent text-center text-xl" />
          <input value={step.label} onChange={e => updateStep(i, { label: e.target.value })} placeholder="Step Name" className="flex-1 border-none bg-transparent font-semibold" />
          {step.type === "timer" && (
            <input type="number" value={(step.durationMs || 0) / 60000} onChange={e => updateStep(i, { durationMs: +e.target.value * 60000 })} className="w-12 rounded-md border-none bg-muted p-1 text-center text-sm" placeholder="min" />
          )}
          {step.type === "counter" && (
            <input type="number" value={step.target || 0} onChange={e => updateStep(i, { target: +e.target.value })} className="w-12 rounded-md border-none bg-muted p-1 text-center text-sm" />
          )}
          <button onClick={() => removeStep(i)} className="text-destructive"><X size={16} /></button>
        </div>
      ))}

      <button onClick={() => setSteps(p => [...p, { type: "timer", emoji: "⏱️", label: "", durationMs: 5 * 60000 }])} className="mb-4 w-full rounded-xl border border-dashed border-border p-3 text-sm font-bold text-muted-foreground hover:bg-secondary/50 transition">
        + Add Step
      </button>

      <PrimaryBtn onClick={() => onAdd({ id: uid(), type: "chain", label: label || "New Routine", color, steps, streak: true, emoji: "🔗" })} label="Create Routine" color={COLORS.find(c => c.name === color)} />
    </div>
  );
}

function AddAlarmForm({ onBack, onAdd }: { onBack: () => void; onAdd: (a: Alarm) => void }) {
  const [label, setLabel] = useState("Alarm");
  const [emoji, setEmoji] = useState("⏰");
  const [hour, setHour] = useState(7);
  const [min, setMin] = useState(0);
  const [color, setColor] = useState("orange");

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-muted-foreground"><ChevronRight size={16} className="rotate-180" /> Back</button>
      <EmojiPicker sel={emoji} onSel={setEmoji} />
      <input className="mb-4 w-full rounded-2xl border-none bg-secondary p-3.5 text-base font-semibold outline-none" placeholder="Alarm label" value={label} onChange={e => setLabel(e.target.value)} />
      <div className="mb-4 flex items-center justify-center gap-2">
        <input type="number" value={hour} onChange={e => setHour(Math.max(0, Math.min(23, +e.target.value)))} className="w-14 border-none bg-transparent text-center font-mono text-4xl font-bold" />
        <span className="text-3xl font-bold">:</span>
        <input type="number" value={min} onChange={e => setMin(Math.max(0, Math.min(59, +e.target.value)))} className="w-14 border-none bg-transparent text-center font-mono text-4xl font-bold" />
      </div>
      <ColorPicker sel={color} onSel={setColor} />
      <PrimaryBtn onClick={() => onAdd({ id: uid(), label, emoji, hour, minute: min, color, enabled: true })} label="Set Alarm" color={COLORS.find(c => c.name === color)} />
    </div>
  );
}

// ─── Small UI Components ────────────────────────────────
function EmojiPicker({ sel, onSel }: { sel: string; onSel: (e: string) => void }) {
  return (
    <div className="relative mb-4 flex items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">{sel}</div>
      <select value={sel} onChange={e => onSel(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
        {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
    </div>
  );
}

function ColorPicker({ sel, onSel }: { sel: string; onSel: (c: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 justify-center">
      {COLORS.map(c => (
        <button key={c.name} onClick={() => onSel(c.name)}
          className="h-8 w-8 rounded-full border-2 border-white transition-all"
          style={{ background: c.dot, boxShadow: sel === c.name ? `0 0 0 2px ${c.dot}` : "none" }}
        />
      ))}
    </div>
  );
}

function PrimaryBtn({ onClick, label, color }: { onClick: () => void; label: string; color?: TrackerColor }) {
  return (
    <button onClick={onClick}
      className="w-full rounded-2xl p-4 text-center font-bold text-white transition active:scale-[0.98]"
      style={{ background: color?.dot || "#18181B" }}>
      {label}
    </button>
  );
}

// ─── StatsSheet ─────────────────────────────────────────
function StatsSheet({ sessions, acts, onClose }: { sessions: Session[]; acts: Activity[]; onClose: () => void }) {
  const total = sessions.length;
  const time = sessions.reduce((a, s) => a + (s.durationMs || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-[500px] rounded-t-[32px] bg-white p-6 shadow-xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Stats</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"><X size={18} /></button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <div className="text-3xl font-bold">{fmtShort(time)}</div>
            <div className="text-xs text-muted-foreground">Focus Time</div>
          </div>
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent History</h3>
        {sessions.slice(-5).reverse().map(s => {
          const a = acts.find(x => x.id === s.actId);
          if (!a) return null;
          return (
            <div key={s.id} className="mb-2 flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <span className="text-xl">{a.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{a.label}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(s.startAt || s.at || "").toLocaleDateString()}</div>
              </div>
              <div className="font-mono text-sm font-bold">{s.durationMs ? fmtMs(s.durationMs) : s.delta}</div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

export default TrackerPage;
