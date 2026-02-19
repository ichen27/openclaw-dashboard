'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, RotateCcw,
  Check, Loader2, BookOpen, Shuffle
} from 'lucide-react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  reviewed: number;
  correct: number;
}

interface FlashcardStats {
  total: number;
  byCategory: Record<string, number>;
  accuracy: number;
}

const CATEGORIES = [
  { id: 'all',           label: 'All' },
  { id: 'algorithm',     label: 'Algorithms' },
  { id: 'probability',   label: 'Probability' },
  { id: 'system_design', label: 'System Design' },
  { id: 'behavioral',    label: 'Behavioral' },
  { id: 'other',         label: 'Other' },
];

const DIFF_COLOR: Record<string, string> = {
  easy:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hard:   'text-red-400 bg-red-500/10 border-red-500/30',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function AddCardModal({ onAdd, onClose }: { onAdd: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    question: '', answer: '', category: 'algorithm', difficulty: 'medium'
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onAdd();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h3 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-violet-500" />Add Flashcard</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Question *</label>
            <textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              rows={2} autoFocus placeholder="What is the time complexity of quicksort?"
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Answer *</label>
            <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              rows={4} placeholder="Average: O(n log n), Worst: O(n²) when pivot is always min/max..."
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none">
                {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
          <button disabled={!form.question.trim() || !form.answer.trim() || saving} onClick={submit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}

export function FlashcardStudy() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [studyMode, setStudyMode] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const params = catFilter !== 'all' ? `?category=${catFilter}` : '';
    const res = await fetch(`/api/flashcards${params}`);
    const data = await res.json();
    setCards(data.cards);
    setStats(data.stats);
    setLoading(false);
  }, [catFilter]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  // Build deck on cards change
  useEffect(() => {
    setDeck(shuffle(cards));
    setDeckIndex(0);
    setFlipped(false);
  }, [cards]);

  const currentCard = deck[deckIndex];

  const handleFlip = () => setFlipped(f => !f);

  const handleAnswer = useCallback(async (correct: boolean) => {
    if (!currentCard) return;
    setSessionTotal(t => t + 1);
    if (correct) setSessionCorrect(c => c + 1);
    await fetch(`/api/flashcards/${currentCard.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correct }),
    });
    setFlipped(false);
    setDeckIndex(i => (i + 1) % deck.length);
  }, [currentCard, deck.length]);

  const reshuffle = () => {
    setDeck(shuffle(cards));
    setDeckIndex(0);
    setFlipped(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-500" /> Study Cards
          </h2>
          <p className="text-xs text-muted-foreground">
            {stats?.total ?? 0} cards · {stats?.accuracy ?? 0}% accuracy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reshuffle} title="Reshuffle" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Shuffle className="h-4 w-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add Card
          </button>
        </div>
      </div>

      {/* Session stats */}
      {sessionTotal > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="text-emerald-500 font-semibold">{sessionCorrect} correct</span>
          <span>/ {sessionTotal} reviewed</span>
          <span className="font-semibold">{Math.round((sessionCorrect / sessionTotal) * 100)}% this session</span>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.id}
            onClick={() => setCatFilter(c.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              catFilter === c.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground border-border/50 hover:border-border hover:text-foreground'
            }`}
          >
            {c.label}
            {c.id !== 'all' && stats?.byCategory[c.id] ? ` (${stats.byCategory[c.id]})` : ''}
          </button>
        ))}
      </div>

      {/* Flashcard */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : deck.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 rounded-xl">
          <BookOpen className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No cards in this category</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary hover:underline">Add a card</button>
        </div>
      ) : currentCard ? (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{deckIndex + 1} / {deck.length}</span>
            <span className={DIFF_COLOR[currentCard.difficulty]?.split(' ')[0]}>
              {currentCard.difficulty}
            </span>
            <span className="text-muted-foreground/60">{CATEGORIES.find(c => c.id === currentCard.category)?.label}</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${((deckIndex) / deck.length) * 100}%` }} />
          </div>

          {/* Card */}
          <div
            className="bg-card border border-border/50 rounded-2xl p-8 min-h-[200px] cursor-pointer hover:border-border transition-colors shadow-sm flex flex-col"
            onClick={handleFlip}
          >
            <div className="flex items-start gap-2 mb-4">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${DIFF_COLOR[currentCard.difficulty] ?? ''}`}>
                {currentCard.difficulty}
              </span>
              <span className="text-[10px] text-muted-foreground/60 pt-0.5">
                {CATEGORIES.find(c => c.id === currentCard.category)?.label}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/40">
                {currentCard.reviewed > 0 ? `${currentCard.reviewed}× reviewed` : 'New'}
              </span>
            </div>

            <div className="flex-1">
              {!flipped ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Question:</p>
                  <p className="text-base font-medium leading-relaxed">{currentCard.question}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-6 text-center">Click to reveal answer</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Answer:</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{currentCard.answer}</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          {flipped ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
              >
                <RotateCcw className="h-4 w-4" /> Missed
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
              >
                <Check className="h-4 w-4" /> Got it!
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDeckIndex(i => (i - 1 + deck.length) % deck.length)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={handleFlip}
                className="px-6 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm hover:bg-primary/20 transition-colors"
              >
                Flip Card
              </button>
              <button
                onClick={() => setDeckIndex(i => (i + 1) % deck.length)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : null}

      {showAdd && <AddCardModal onAdd={fetchCards} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
