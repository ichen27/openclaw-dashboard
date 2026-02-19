'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Play, RotateCcw, CheckCircle2, XCircle, Trophy, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Question generation ──────────────────────────────────────────────────────

type OpType = 'add' | 'sub' | 'mul' | 'pct';

interface Question {
  a: number;
  b: number;
  op: OpType;
  answer: number;
  display: string;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genQuestion(level: 'easy' | 'medium' | 'hard'): Question {
  const ops: OpType[] = level === 'easy' ? ['add', 'sub'] : ['add', 'sub', 'mul'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number, display: string;

  if (op === 'add') {
    const max = level === 'easy' ? 50 : level === 'medium' ? 200 : 999;
    a = randInt(1, max); b = randInt(1, max);
    answer = a + b; display = `${a} + ${b}`;
  } else if (op === 'sub') {
    const max = level === 'easy' ? 50 : level === 'medium' ? 200 : 999;
    a = randInt(10, max); b = randInt(1, a);
    answer = a - b; display = `${a} − ${b}`;
  } else if (op === 'mul') {
    const max = level === 'easy' ? 12 : level === 'medium' ? 25 : 99;
    a = randInt(2, max); b = randInt(2, max);
    answer = a * b; display = `${a} × ${b}`;
  } else {
    // percentage
    const pcts = [10, 15, 20, 25, 33, 50, 75];
    b = pcts[Math.floor(Math.random() * pcts.length)];
    a = randInt(2, 20) * 10;
    answer = Math.round((a * b) / 100);
    display = `${b}% of ${a}`;
  }

  return { a, b, op, answer, display };
}

// ─── Session duration (seconds) ───────────────────────────────────────────────

const DURATIONS = [
  { label: '60s', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '8 min', seconds: 480 }, // Optiver mode
];

const LEVELS = ['easy', 'medium', 'hard'] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function MentalMathTrainer() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [level, setLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [durationIdx, setDurationIdx] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [history, setHistory] = useState<{ q: string; ans: number; got: string; ok: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextQuestion = useCallback(() => {
    setQuestion(genQuestion(level));
    setInput('');
    setFlash(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [level]);

  const startSession = useCallback(() => {
    setCorrect(0);
    setWrong(0);
    setHistory([]);
    setTimeLeft(DURATIONS[durationIdx].seconds);
    setPhase('running');
    nextQuestion();
  }, [durationIdx, nextQuestion]);

  // Countdown
  useEffect(() => {
    if (phase !== 'running') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setPhase('done');
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const submit = useCallback(() => {
    if (!question || phase !== 'running') return;
    const got = parseInt(input.trim(), 10);
    const ok = !isNaN(got) && got === question.answer;
    setFlash(ok ? 'correct' : 'wrong');
    if (ok) setCorrect(c => c + 1);
    else setWrong(w => w + 1);
    setHistory(h => [{ q: question.display, ans: question.answer, got: input.trim(), ok }, ...h.slice(0, 9)]);
    setTimeout(nextQuestion, 300);
  }, [question, phase, input, nextQuestion]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  }, [submit]);

  const total = correct + wrong;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const rate = DURATIONS[durationIdx].seconds > 0
    ? ((correct / (DURATIONS[durationIdx].seconds - timeLeft)) * 60).toFixed(1)
    : '0';

  const timeColor = timeLeft <= 10 ? 'text-red-500' : timeLeft <= 30 ? 'text-yellow-500' : 'text-foreground';
  const totalSec = DURATIONS[durationIdx].seconds;
  const progressPct = phase === 'running' ? ((totalSec - timeLeft) / totalSec) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" />
          Mental Math Trainer
          <span className="text-xs text-muted-foreground font-normal ml-1">Optiver / IMC / Jane Street prep</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === 'idle' && (
          <div className="space-y-3">
            {/* Level */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Difficulty</p>
              <div className="flex gap-2">
                {LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                      level === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Duration */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Duration</p>
              <div className="flex gap-2">
                {DURATIONS.map((d, i) => (
                  <button
                    key={d.label}
                    onClick={() => setDurationIdx(i)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      durationIdx === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {d.label}
                    {i === 2 && <span className="ml-1 text-[9px] opacity-70">Optiver</span>}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={startSession} className="w-full gap-2">
              <Play className="h-4 w-4" /> Start
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Optiver: 80 questions / 8 min · Jane Street: speed + accuracy
            </p>
          </div>
        )}

        {phase === 'running' && question && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-muted/50 rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3">
                <span className="text-emerald-500 font-semibold">{correct} ✓</span>
                <span className="text-red-500 font-semibold">{wrong} ✗</span>
              </div>
              <span className={cn('font-mono font-bold text-lg', timeColor)}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>

            {/* Question */}
            <div className={cn(
              'flex items-center justify-center py-8 rounded-xl text-4xl font-bold tracking-tight transition-colors',
              flash === 'correct' ? 'bg-emerald-500/20 text-emerald-400' :
              flash === 'wrong' ? 'bg-red-500/20 text-red-400' :
              'bg-muted/30'
            )}>
              {question.display} = ?
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              placeholder="Answer..."
              className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-3 text-xl font-mono text-center outline-none focus:border-primary/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex gap-2">
              <Button onClick={submit} className="flex-1 gap-2">
                <Zap className="h-4 w-4" /> Submit (Enter)
              </Button>
              <Button variant="outline" onClick={() => { setPhase('done'); clearInterval(timerRef.current!); }} className="gap-2">
                Stop
              </Button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4">
            {/* Results */}
            <div className="text-center py-4 space-y-2">
              <Trophy className={cn('h-10 w-10 mx-auto', accuracy >= 90 ? 'text-yellow-500' : accuracy >= 70 ? 'text-blue-500' : 'text-muted-foreground')} />
              <p className="text-2xl font-bold">{correct} / {total}</p>
              <p className="text-sm text-muted-foreground">{accuracy}% accuracy · {rate}/min rate</p>
              {total > 0 && (
                <p className={cn('text-xs font-medium', accuracy >= 90 ? 'text-emerald-500' : accuracy >= 70 ? 'text-yellow-500' : 'text-red-500')}>
                  {accuracy >= 90 ? '🔥 Excellent! Optiver-ready.' :
                   accuracy >= 70 ? '👍 Good — keep practicing.' :
                   '💪 Keep going — speed comes with repetition.'}
                </p>
              )}
            </div>

            {/* Last 5 */}
            {history.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Recent</p>
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-0.5">
                    <span className="font-mono text-muted-foreground">{h.q} = {h.ans}</span>
                    {h.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      : <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3.5 w-3.5" /> {h.got || '—'}</span>
                    }
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => setPhase('idle')} variant="outline" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
