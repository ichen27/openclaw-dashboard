'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Zap } from 'lucide-react';

type Mode = 'focus' | 'short' | 'long';

const MODE_CONFIG: Record<Mode, { label: string; seconds: number; color: string; ring: string; icon: React.ElementType }> = {
  focus: { label: 'Focus', seconds: 25 * 60, color: 'text-violet-400', ring: '#8b5cf6', icon: Brain },
  short: { label: 'Short Break', seconds: 5 * 60, color: 'text-emerald-400', ring: '#10b981', icon: Coffee },
  long:  { label: 'Long Break',  seconds: 15 * 60, color: 'text-blue-400',   ring: '#3b82f6', icon: Coffee },
};

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function PomodoroTimer({ focusTask }: { focusTask?: string }) {
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.focus.seconds);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0); // completed focus sessions
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = useRef<string>('');

  // Update document title while running
  useEffect(() => {
    if (running) {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      document.title = `${pad(m)}:${pad(s)} — ${MODE_CONFIG[mode].label}`;
    } else {
      document.title = originalTitle.current || 'OpenClaw Dashboard';
    }
  }, [running, timeLeft, mode]);

  // Save original title
  useEffect(() => {
    originalTitle.current = document.title;
    return () => { document.title = originalTitle.current; };
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const tick = useCallback(() => {
    setTimeLeft(t => {
      if (t <= 1) {
        stop();
        setRunning(false);
        // Session complete
        if (mode === 'focus') {
          setSessions(s => s + 1);
        }
        // Flash title
        document.title = mode === 'focus' ? '🍅 Focus done! Take a break.' : '⚡ Break over! Back to work.';
        setTimeout(() => { document.title = originalTitle.current || 'OpenClaw Dashboard'; }, 4000);
        return 0;
      }
      return t - 1;
    });
  }, [stop, mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      stop();
    }
    return stop;
  }, [running, tick, stop]);

  const switchMode = useCallback((m: Mode) => {
    stop();
    setRunning(false);
    setMode(m);
    setTimeLeft(MODE_CONFIG[m].seconds);
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setRunning(false);
    setTimeLeft(MODE_CONFIG[mode].seconds);
  }, [stop, mode]);

  const toggle = useCallback(() => {
    if (timeLeft === 0) {
      reset();
      return;
    }
    setRunning(r => !r);
  }, [timeLeft, reset]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const total = MODE_CONFIG[mode].seconds;
  const progress = total > 0 ? (total - timeLeft) / total : 0;
  const strokeDash = `${CIRC * progress} ${CIRC}`;
  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
      {/* Mode tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['focus', 'short', 'long'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded-md transition-colors font-medium ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
        {/* Session dots */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i < (sessions % 4) ? 'bg-violet-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="64" cy="64" r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="64" cy="64" r={RADIUS}
              fill="none"
              stroke={cfg.ring}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={strokeDash}
              style={{ transition: running ? 'stroke-dasharray 0.5s linear' : 'none' }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon className={`h-4 w-4 ${cfg.color} mb-0.5`} />
            <span className={`text-2xl font-mono font-bold tabular-nums ${cfg.color}`}>
              {pad(mins)}:{pad(secs)}
            </span>
            <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggle}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              running
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? 'Pause' : timeLeft === 0 ? 'Restart' : 'Start'}
          </button>
          <div className="p-1.5 rounded-md text-muted-foreground" title={`${sessions} sessions completed`}>
            <Zap className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Active task */}
      {focusTask && (
        <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2 truncate">
          🎯 {focusTask}
        </div>
      )}

      {/* Session count */}
      {sessions > 0 && (
        <p className="text-[10px] text-center text-muted-foreground/60">
          {sessions} session{sessions !== 1 ? 's' : ''} today
          {sessions % 4 === 0 ? ' — take a long break! 🧘' : ''}
        </p>
      )}
    </div>
  );
}
