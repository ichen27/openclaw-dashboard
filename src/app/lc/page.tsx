'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Code2, Plus, X, Trash2, ExternalLink,
  TrendingUp, Target, Flame, Loader2, RefreshCw,
  CheckCircle2, Clock, AlertCircle, BookOpen
} from 'lucide-react';
import { FlashcardStudy } from '@/components/flashcard-study';
import { MentalMathTrainer } from '@/components/mental-math-trainer';

interface LCProblem {
  id: string;
  number: number | null;
  title: string;
  url: string;
  difficulty: string;
  category: string;
  status: string;
  notes: string;
  timeMin: number | null;
  solvedAt: string;
}

interface LCStats {
  totalSolved: number;
  thisWeek: number;
  today: number;
  byCat: Record<string, number>;
  byDiff: Record<string, number>;
}

interface LCData {
  problems: LCProblem[];
  stats: LCStats;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const STATUSES = ['solved', 'attempted', 'review'] as const;
const CATEGORIES = [
  { id: 'arrays',        label: 'Arrays & Hashing' },
  { id: 'two_pointers',  label: 'Two Pointers' },
  { id: 'sliding_window',label: 'Sliding Window' },
  { id: 'binary_search', label: 'Binary Search' },
  { id: 'linked_list',   label: 'Linked List' },
  { id: 'trees',         label: 'Trees' },
  { id: 'graphs',        label: 'Graphs' },
  { id: 'dp',            label: 'Dynamic Programming' },
  { id: 'stack',         label: 'Stack / Monotonic' },
  { id: 'heap',          label: 'Heap / Priority Queue' },
  { id: 'intervals',     label: 'Intervals' },
  { id: 'greedy',        label: 'Greedy' },
  { id: 'math',          label: 'Math / Bit Manip' },
  { id: 'probability',   label: 'Probability / Stats' },
  { id: 'other',         label: 'Other' },
] as const;

// Week 1 target (from Ivan's study plan)
const WEEK_GOAL = 15;

const DIFF_COLOR: Record<string, string> = {
  easy:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hard:   'text-red-400 bg-red-500/10 border-red-500/30',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  solved:    CheckCircle2,
  attempted: Clock,
  review:    AlertCircle,
};

const STATUS_COLOR: Record<string, string> = {
  solved:    'text-emerald-500',
  attempted: 'text-yellow-500',
  review:    'text-blue-500',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface AddForm {
  number: string;
  title: string;
  url: string;
  difficulty: string;
  category: string;
  status: string;
  notes: string;
  timeMin: string;
}

function AddProblemForm({ onAdd }: { onAdd: (data: AddForm) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddForm>({
    number: '',
    title: '',
    url: '',
    difficulty: 'medium',
    category: 'arrays',
    status: 'solved',
    notes: '',
    timeMin: '',
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onAdd(form);
    setForm({ number: '', title: '', url: '', difficulty: 'medium', category: 'arrays', status: 'solved', notes: '', timeMin: '' });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Log Problem
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold flex items-center gap-2">
            <Code2 className="h-4 w-4 text-violet-500" />
            Log Problem
          </h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">#</label>
              <input
                type="number"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                placeholder="42"
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Two Sum"
                autoFocus
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Time (min)</label>
              <input
                type="number"
                value={form.timeMin}
                onChange={e => setForm(f => ({ ...f, timeMin: e.target.value }))}
                placeholder="20"
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL (optional)</label>
            <input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://leetcode.com/problems/..."
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes / Key insight</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="e.g. Use two-pointer, sort first, O(n log n)..."
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            disabled={!form.title.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LCPage() {
  const [data, setData] = useState<LCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'problems' | 'flashcards' | 'mental-math'>('problems');
  const [filter, setFilter] = useState<{ category?: string; difficulty?: string }>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set('category', filter.category);
      if (filter.difficulty) params.set('difficulty', filter.difficulty);
      const res = await fetch(`/api/lc?${params}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addProblem = useCallback(async (formData: AddForm) => {
    const res = await fetch('/api/lc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) fetchData();
  }, [fetchData]);

  const deleteProblem = useCallback(async (id: string) => {
    setDeleting(id);
    await fetch(`/api/lc/${id}`, { method: 'DELETE' });
    setDeleting(null);
    fetchData();
  }, [fetchData]);

  const weekPct = data ? Math.min((data.stats.thisWeek / WEEK_GOAL) * 100, 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code2 className="h-6 w-6 text-violet-500" />
            LeetCode Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Interview prep problem log</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          {tab === 'problems' && <AddProblemForm onAdd={addProblem} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-2 border-b border-border/50">
        {[
          { id: 'problems',    label: '🔢 Problems', icon: Code2 },
          { id: 'flashcards',  label: '🃏 Flashcards', icon: BookOpen },
          { id: 'mental-math', label: '🧠 Mental Math', icon: Code2 },
        ].map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id as 'problems' | 'flashcards' | 'mental-math')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Flashcard tab */}
      {tab === 'flashcards' && <FlashcardStudy />}

      {/* Mental Math tab */}
      {tab === 'mental-math' && (
        <div className="max-w-md mx-auto">
          <MentalMathTrainer />
        </div>
      )}

      {/* Problems tab */}
      {tab === 'problems' && <>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Solved', value: data?.stats.totalSolved ?? '—', icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'This Week', value: data?.stats.thisWeek ?? '—', icon: Flame, color: 'text-orange-500' },
          { label: 'Today', value: data?.stats.today ?? '—', icon: Target, color: 'text-violet-500' },
          { label: 'Streak', value: data?.stats.thisWeek ? '🔥 Active' : '—', icon: TrendingUp, color: 'text-yellow-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-lg p-3 flex items-center gap-3">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Problem list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filter.category ?? ''}
              onChange={e => setFilter(f => ({ ...f, category: e.target.value || undefined }))}
              className="bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select
              value={filter.difficulty ?? ''}
              onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value || undefined }))}
              className="bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
            {(filter.category || filter.difficulty) && (
              <button
                onClick={() => setFilter({})}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Problem table */}
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !data || data.problems.length === 0 ? (
              <div className="text-center py-16">
                <Code2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No problems logged yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Log your first problem to start tracking</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">#</th>
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">Problem</th>
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Category</th>
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">Diff</th>
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">Time</th>
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">When</th>
                    <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium w-8" />
                  </tr>
                </thead>
                <tbody>
                  {data.problems.map(p => {
                    const StatusIcon = STATUS_ICON[p.status] ?? CheckCircle2;
                    const catLabel = CATEGORIES.find(c => c.id === p.category)?.label ?? p.category;
                    return (
                      <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-2.5 text-muted-foreground text-xs font-mono">
                          {p.number ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${STATUS_COLOR[p.status] ?? ''}`} />
                            <span className="font-medium truncate max-w-[160px]" title={p.title}>
                              {p.title}
                            </span>
                            {p.url && (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-blue-400 transition-colors">
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                          {p.notes && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate max-w-[200px]" title={p.notes}>
                              {p.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                          {catLabel}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${DIFF_COLOR[p.difficulty] ?? ''}`}>
                            {p.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                          {p.timeMin ? `${p.timeMin}m` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {timeAgo(p.solvedAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => deleteProblem(p.id)}
                            disabled={deleting === p.id}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all"
                          >
                            {deleting === p.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: stats panels */}
        <div className="space-y-4">
          {/* Week 1 goal */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Week 1 Goal</h3>
              <span className="text-xs text-muted-foreground">{data?.stats.thisWeek ?? 0}/{WEEK_GOAL} problems</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${weekPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {weekPct >= 100
                ? '🎉 Week 1 goal complete!'
                : `${WEEK_GOAL - (data?.stats.thisWeek ?? 0)} more to hit your Week 1 target`}
            </p>
          </div>

          {/* By difficulty */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">By Difficulty</h3>
            <div className="space-y-2">
              {DIFFICULTIES.map(d => {
                const count = data?.stats.byDiff[d] ?? 0;
                const max = Math.max(...DIFFICULTIES.map(x => data?.stats.byDiff[x] ?? 0), 1);
                return (
                  <div key={d} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`capitalize ${d === 'easy' ? 'text-emerald-500' : d === 'medium' ? 'text-yellow-500' : 'text-red-500'}`}>
                        {d}
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d === 'easy' ? 'bg-emerald-500' : d === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By category */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">By Category</h3>
            {!data || Object.keys(data.stats.byCat).length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No data yet</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(data.stats.byCat)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    const label = CATEGORIES.find(c => c.id === cat)?.label ?? cat;
                    return (
                      <div key={cat} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{label}</span>
                        <span className="font-mono font-semibold shrink-0 ml-2">{count}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Quant prep reminder */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-violet-400 mb-1">🎯 Week 1 Focus (Arrays)</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Two Sum · Contains Duplicate · Valid Anagram · Group Anagrams · Top K Frequent · Product Array · Valid Sudoku · Longest Consecutive
            </p>
            <p className="text-[10px] text-violet-400/70 mt-1.5">15 problems in 5 days → 3/day</p>
          </div>
        </div>
      </div>

      </> /* end problems tab */}
    </div>
  );
}
