'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sun, CheckCircle2, Clock, ListTodo, TrendingUp,
  Play, Loader2, RefreshCw, GitBranch, MessageSquare, AlertTriangle,
  CalendarClock
} from 'lucide-react';
import { PomodoroTimer } from '@/components/pomodoro-timer';
import { MissionControl } from '@/components/mission-control';
import { DailyGoals } from '@/components/daily-goals';
import { MorningBrief } from '@/components/morning-brief';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  score?: number;
  assignedAgent: string | null;
  dueDate: string | null;
  updatedAt: string;
  category: { name: string; color: string };
  _count?: { comments?: number; blockedBy?: number };
}

interface TodayData {
  workQueue: TaskItem[];
  inProgress: TaskItem[];
  inReview: TaskItem[];
  recentlyDone: TaskItem[];
  stats: {
    total: number;
    done: number;
    inProgress: number;
    backlog: number;
    doneToday: number;
    doneThisWeek: number;
    byCategory: Record<string, { total: number; done: number; color: string }>;
  };
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  done: 'text-emerald-600 dark:text-emerald-400',
  'in-progress': 'text-blue-600 dark:text-blue-400',
  review: 'text-yellow-600 dark:text-yellow-400',
  backlog: 'text-muted-foreground',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  action,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  acting,
}: {
  task: TaskItem;
  action?: string;
  actionLabel?: string;
  actionIcon?: React.ElementType;
  onAction?: (id: string, action: string) => void;
  acting?: boolean;
}) {
  const isBlocked = (task._count?.blockedBy ?? 0) > 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0 group">
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1 py-0 border ${PRIORITY_COLOR[task.priority] ?? ''}`}>
            {task.priority}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{task.category.name}</span>
          {isBlocked && (
            <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />blocked
            </span>
          )}
          {(task._count?.comments ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />{task._count?.comments}
            </span>
          )}
        </div>
        <p className="text-xs font-medium leading-snug truncate" title={task.title}>
          {task.title}
        </p>
        {task.assignedAgent && (
          <p className="text-[10px] text-muted-foreground">→ {task.assignedAgent}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.score !== undefined && (
          <span className="text-[10px] font-mono text-primary/70">#{task.score.toFixed(1)}</span>
        )}
        <span className="text-[10px] text-muted-foreground hidden group-hover:block">
          {timeAgo(task.updatedAt)}
        </span>
        {action && ActionIcon && onAction && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={acting}
            onClick={() => onAction(task.id, action)}
          >
            {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ActionIcon className="h-3 w-3" />}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Category Progress ────────────────────────────────────────────────────────

function CategoryProgress({ name, done, total, color }: { name: string; done: number; total: number; color: string }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-muted-foreground truncate max-w-[120px]">{name}</span>
        </div>
        <span className="text-muted-foreground text-[10px]">{done}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Deadline Panel ──────────────────────────────────────────────────────────

function DeadlinePanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/tasks?limit=100')
      .then(r => r.json())
      .then((all: TaskItem[]) => {
        const withDue = all
          .filter(t => t.dueDate && t.status !== 'done' && t.status !== 'failed')
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
          .slice(0, 8);
        setTasks(withDue);
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  if (tasks.length === 0) return null;

  const now = Date.now();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-500" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-0">
        {tasks.map(t => {
          const due = new Date(t.dueDate!);
          const daysLeft = Math.ceil((due.getTime() - now) / 86400000);
          const urgent = daysLeft <= 3;
          const soon = daysLeft <= 7;
          const label = daysLeft < 0 ? 'OVERDUE' : daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`;
          return (
            <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${urgent ? 'bg-red-500' : soon ? 'bg-yellow-500' : 'bg-muted-foreground'}`} />
              <p className="text-xs truncate flex-1" title={t.title}>{t.title}</p>
              <span className={`text-[10px] font-mono shrink-0 font-semibold ${urgent ? 'text-red-500' : soon ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/today');
      setData(await res.json() as TodayData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (taskId: string, action: string) => {
    setActing(taskId);
    try {
      let newStatus = '';
      if (action === 'start') newStatus = 'in-progress';
      else if (action === 'done') newStatus = 'done';
      else if (action === 'review') newStatus = 'review';

      if (newStatus) {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        await fetchData();
      }
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const completionRate = data.stats.total > 0
    ? Math.round((data.stats.done / data.stats.total) * 100)
    : 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Sun className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Today</h1>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Done today', value: data.stats.doneToday, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'This week', value: data.stats.doneThisWeek, icon: TrendingUp, color: 'text-blue-500' },
          { label: 'In progress', value: data.stats.inProgress, icon: Clock, color: 'text-yellow-500' },
          { label: `${completionRate}% complete`, value: `${data.stats.done}/${data.stats.total}`, icon: ListTodo, color: 'text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <div>
                  <p className="text-sm font-semibold">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work queue */}
        <div className="lg:col-span-2 space-y-4">
          {/* In progress */}
          {data.inProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  In Progress
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{data.inProgress.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.inProgress.map(t => (
                  <TaskRow
                    key={t.id} task={t}
                    action="done" actionLabel="Done" actionIcon={CheckCircle2}
                    onAction={handleAction} acting={acting === t.id}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Review */}
          {data.inReview.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-yellow-500" />
                  Needs Review
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{data.inReview.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.inReview.map(t => (
                  <TaskRow
                    key={t.id} task={t}
                    action="done" actionLabel="Done" actionIcon={CheckCircle2}
                    onAction={handleAction} acting={acting === t.id}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Work queue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-primary" />
                Work Queue
                <span className="text-xs text-muted-foreground font-normal">top {data.workQueue.length} by priority</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.workQueue.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nothing in the backlog — all caught up! 🎉
                </p>
              ) : (
                data.workQueue.map(t => (
                  <TaskRow
                    key={t.id} task={t}
                    action="start" actionLabel="Start" actionIcon={Play}
                    onAction={handleAction} acting={acting === t.id}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: pomodoro + category progress + recently done */}
        <div className="space-y-4">
          {/* Morning Brief */}
          <MorningBrief />

          {/* Daily Goals */}
          <DailyGoals />

          {/* Mission Control — cross-system status */}
          <MissionControl />

          {/* Pomodoro timer */}
          <PomodoroTimer
            focusTask={data.inProgress[0]?.title ?? data.workQueue[0]?.title}
          />

          {/* Deadlines */}
          <DeadlinePanel />

          {/* Category progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Project Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {Object.entries(data.stats.byCategory).map(([name, { done, total, color }]) => (
                <CategoryProgress key={name} name={name} done={done} total={total} color={color} />
              ))}
            </CardContent>
          </Card>

          {/* Recently done */}
          {data.recentlyDone.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Recently Shipped
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.recentlyDone.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate text-muted-foreground line-through" title={t.title}>
                        {t.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">{timeAgo(t.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Updated {new Date(data.generatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
