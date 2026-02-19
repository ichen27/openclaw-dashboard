'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Plus, X, Check, Loader2 } from 'lucide-react';

interface Goal {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

const MAX_GOALS = 5;
const TODAY = new Date().toISOString().split('T')[0];

export function DailyGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGoals = useCallback(async () => {
    const res = await fetch(`/api/goals?date=${TODAY}`);
    const data = await res.json();
    setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const addGoal = useCallback(async () => {
    if (!input.trim() || goals.length >= MAX_GOALS) return;
    setAdding(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.trim(), date: TODAY }),
      });
      const created = await res.json();
      setGoals(prev => [...prev, created]);
      setInput('');
    } finally {
      setAdding(false);
    }
  }, [input, goals.length]);

  const toggleGoal = useCallback(async (id: string, done: boolean) => {
    // Optimistic
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done } : g));
    await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id, done }]),
    });
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
  }, []);

  const doneCount = goals.filter(g => g.done).length;
  const allDone = goals.length > 0 && doneCount === goals.length;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className={`h-4 w-4 ${allDone ? 'text-emerald-500' : 'text-primary'}`} />
          Today&apos;s Goals
        </h3>
        {goals.length > 0 && (
          <span className={`text-xs font-mono ${allDone ? 'text-emerald-500' : 'text-muted-foreground'}`}>
            {doneCount}/{goals.length}
            {allDone && ' 🎉'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Goal list */}
          <div className="space-y-1.5">
            {goals.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-2">
                Set your focus for today ↓
              </p>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleGoal(goal.id, !goal.done)}
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      goal.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-border/70 hover:border-primary'
                    }`}
                  >
                    {goal.done && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span className={`text-xs flex-1 leading-tight ${goal.done ? 'line-through text-muted-foreground/50' : ''}`}>
                    {goal.text}
                  </span>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-500 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add input */}
          {goals.length < MAX_GOALS && (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addGoal(); }}
                placeholder={goals.length === 0 ? 'Goal #1 — e.g. Apply to Two Sigma' : `Goal #${goals.length + 1}...`}
                className="flex-1 bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
              />
              <button
                onClick={addGoal}
                disabled={!input.trim() || adding}
                className="p-1.5 text-primary hover:bg-primary/10 rounded-md disabled:opacity-30 transition-colors"
              >
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          {/* Progress bar */}
          {goals.length > 0 && (
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${(doneCount / goals.length) * 100}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
