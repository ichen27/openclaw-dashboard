'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft, ChevronRight, Plus, X, Check,
  Square, CheckSquare, Loader2, BookOpen, Calendar,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Mood = 'bullish' | 'neutral' | 'bearish';

interface GoalItem {
  id: string;
  text: string;
}

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface JournalEntry {
  date: string;
  mood: Mood | null;
  goals: GoalItem[];
  tasks: TaskItem[];
  notes: string;
  pnl: number | null;
}

interface RecentEntry {
  date: string;
  mood: Mood | null;
  goalCount: number;
  tasksDone: number;
  tasksTotal: number;
  pnl: number | null;
  notesPreview: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function displayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isToday(iso: string): boolean {
  return iso === fmtDate(new Date());
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

const MOOD_OPTIONS: { value: Mood; emoji: string; label: string; color: string; activeBg: string }[] = [
  { value: 'bullish', emoji: '\u{1F4C8}', label: 'Bullish', color: 'text-emerald-500', activeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  { value: 'neutral', emoji: '\u27A1\uFE0F', label: 'Neutral', color: 'text-yellow-500', activeBg: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' },
  { value: 'bearish', emoji: '\u{1F4C9}', label: 'Bearish', color: 'text-red-500', activeBg: 'bg-red-500/15 border-red-500/40 text-red-400' },
];

const EMPTY_ENTRY: JournalEntry = {
  date: '',
  mood: null,
  goals: [],
  tasks: [],
  notes: '',
  pnl: null,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()));
  const [entry, setEntry] = useState<JournalEntry>({ ...EMPTY_ENTRY, date: selectedDate });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // New item input state
  const [newGoal, setNewGoal] = useState('');
  const [newTask, setNewTask] = useState('');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryRef = useRef(entry);
  entryRef.current = entry;

  // ─── Fetch entry for selected date ──────────────────────────────────────

  const fetchEntry = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.date) {
          setEntry(data);
        } else {
          setEntry({ ...EMPTY_ENTRY, date });
        }
      } else {
        setEntry({ ...EMPTY_ENTRY, date });
      }
    } catch {
      setEntry({ ...EMPTY_ENTRY, date });
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch recent entries ───────────────────────────────────────────────

  const fetchRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch('/api/journal?days=7');
      if (res.ok) {
        const data = await res.json();
        setRecentEntries(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntry(selectedDate);
  }, [selectedDate, fetchEntry]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  // ─── Auto-save with debounce ────────────────────────────────────────────

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const current = entryRef.current;
      setSaving(true);
      try {
        await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
        });
        fetchRecent();
      } catch {
        // silent
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [fetchRecent]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ─── Mutators (update + trigger save) ───────────────────────────────────

  const updateEntry = useCallback((updater: (prev: JournalEntry) => JournalEntry) => {
    setEntry(prev => {
      const next = updater(prev);
      return next;
    });
    // schedule save after state updates
    setTimeout(() => scheduleSave(), 0);
  }, [scheduleSave]);

  const setMood = (mood: Mood) => {
    updateEntry(e => ({ ...e, mood: e.mood === mood ? null : mood }));
  };

  const addGoal = () => {
    const text = newGoal.trim();
    if (!text) return;
    updateEntry(e => ({ ...e, goals: [...e.goals, { id: uid(), text }] }));
    setNewGoal('');
  };

  const removeGoal = (id: string) => {
    updateEntry(e => ({ ...e, goals: e.goals.filter(g => g.id !== id) }));
  };

  const updateGoalText = (id: string, text: string) => {
    updateEntry(e => ({
      ...e,
      goals: e.goals.map(g => g.id === id ? { ...g, text } : g),
    }));
  };

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    updateEntry(e => ({ ...e, tasks: [...e.tasks, { id: uid(), text, done: false }] }));
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    updateEntry(e => ({
      ...e,
      tasks: e.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
    }));
  };

  const removeTask = (id: string) => {
    updateEntry(e => ({ ...e, tasks: e.tasks.filter(t => t.id !== id) }));
  };

  const setNotes = (notes: string) => {
    updateEntry(e => ({ ...e, notes }));
  };

  const setPnl = (val: string) => {
    const num = val === '' ? null : parseFloat(val);
    updateEntry(e => ({ ...e, pnl: num !== null && isNaN(num) ? e.pnl : num }));
  };

  // ─── Date navigation ───────────────────────────────────────────────────

  const navigateDay = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(fmtDate(d));
  };

  const jumpToToday = () => {
    setSelectedDate(fmtDate(new Date()));
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const todaySelected = isToday(selectedDate);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <BookOpen className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Trading Journal</h1>
            <p className="text-xs text-muted-foreground">Daily reflections & performance</p>
          </div>
        </div>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigateDay(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          onClick={jumpToToday}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            todaySelected
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border/50 text-foreground hover:bg-muted'
          }`}
        >
          <Calendar className="h-4 w-4" />
          {displayDate(selectedDate)}
          {todaySelected && (
            <span className="text-[10px] font-normal opacity-80 ml-0.5">today</span>
          )}
        </button>

        <Button variant="ghost" size="icon-sm" onClick={() => navigateDay(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mood Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Market Sentiment</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                      entry.mood === m.value
                        ? m.activeBg
                        : 'border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goals */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Goals</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {entry.goals.map(g => (
                  <div key={g.id} className="flex items-center gap-2 group">
                    <Input
                      value={g.text}
                      onChange={e => updateGoalText(g.id, e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                    <button
                      onClick={() => removeGoal(g.id)}
                      className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newGoal}
                    onChange={e => setNewGoal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGoal()}
                    placeholder="Add a goal..."
                    className="h-8 text-sm flex-1"
                  />
                  <Button variant="ghost" size="icon-xs" onClick={addGoal} disabled={!newGoal.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Checklist */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Tasks
                  {entry.tasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {entry.tasks.filter(t => t.done).length}/{entry.tasks.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {entry.tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 group">
                    <button onClick={() => toggleTask(t.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {t.done
                        ? <CheckSquare className="h-4 w-4 text-emerald-500" />
                        : <Square className="h-4 w-4" />}
                    </button>
                    <span className={`text-sm flex-1 ${t.done ? 'line-through text-muted-foreground/60' : ''}`}>
                      {t.text}
                    </span>
                    <button
                      onClick={() => removeTask(t.id)}
                      className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-transparent shrink-0" />
                  <Input
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="Add a task..."
                    className="h-8 text-sm flex-1"
                  />
                  <Button variant="ghost" size="icon-xs" onClick={addTask} disabled={!newTask.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                value={entry.notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Market observations, trade rationale, lessons learned..."
                className="min-h-[120px] text-sm resize-y"
              />
            </CardContent>
          </Card>

          {/* P&L */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">P&L</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={entry.pnl ?? ''}
                  onChange={e => setPnl(e.target.value)}
                  placeholder="0.00"
                  className={`h-9 text-sm max-w-[200px] font-mono ${
                    entry.pnl !== null && entry.pnl > 0
                      ? 'text-emerald-500'
                      : entry.pnl !== null && entry.pnl < 0
                        ? 'text-red-500'
                        : ''
                  }`}
                />
                {entry.pnl !== null && entry.pnl !== 0 && (
                  <span className={`text-sm font-medium ${entry.pnl > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {entry.pnl > 0 ? '+' : ''}{entry.pnl.toFixed(2)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Entries */}
      <div className="pt-4 border-t border-border/30">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Recent Entries</h2>
        {recentLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : recentEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-6">
            No recent entries. Start journaling today!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentEntries.map(re => {
              const moodInfo = MOOD_OPTIONS.find(m => m.value === re.mood);
              const isSelected = re.date === selectedDate;
              return (
                <button
                  key={re.date}
                  onClick={() => setSelectedDate(re.date)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card border-border/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">
                      {displayDate(re.date)}
                      {isToday(re.date) && (
                        <span className="text-[10px] text-primary ml-1">today</span>
                      )}
                    </span>
                    {moodInfo && (
                      <span className="text-sm">{moodInfo.emoji}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-1">
                    {re.goalCount > 0 && (
                      <span>{re.goalCount} goal{re.goalCount !== 1 ? 's' : ''}</span>
                    )}
                    {re.tasksTotal > 0 && (
                      <span>{re.tasksDone}/{re.tasksTotal} tasks</span>
                    )}
                    {re.pnl !== null && (
                      <span className={`font-mono font-medium ${
                        re.pnl > 0 ? 'text-emerald-500' : re.pnl < 0 ? 'text-red-500' : ''
                      }`}>
                        {re.pnl > 0 ? '+' : ''}${re.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {re.notesPreview && (
                    <p className="text-[11px] text-muted-foreground/70 truncate">
                      {re.notesPreview}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
