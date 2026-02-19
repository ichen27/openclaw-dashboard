'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GitBranch, Plus, X, Loader2, AlertTriangle, CheckCircle2, Search } from 'lucide-react';

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: { name: string; color: string };
}

interface DepsData {
  blockedBy: TaskSummary[];
  blocking: TaskSummary[];
}

const STATUS_COLOR: Record<string, string> = {
  done: 'text-emerald-600 dark:text-emerald-400',
  'in-progress': 'text-blue-600 dark:text-blue-400',
  review: 'text-yellow-600 dark:text-yellow-400',
  backlog: 'text-muted-foreground',
  failed: 'text-red-500',
};

const STATUS_DOT: Record<string, string> = {
  done: 'bg-emerald-500',
  'in-progress': 'bg-blue-500',
  review: 'bg-yellow-500',
  backlog: 'bg-gray-400',
  failed: 'bg-red-500',
};

function TaskChip({
  task,
  onRemove,
  removing,
}: {
  task: TaskSummary;
  onRemove?: () => void;
  removing?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border/40 group">
      <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-tight truncate ${STATUS_COLOR[task.status] ?? ''}`}>
          {task.status === 'done' && <CheckCircle2 className="h-3 w-3 inline mr-0.5 mb-0.5" />}
          {task.title}
        </p>
        <p className="text-[10px] text-muted-foreground">{task.category.name} · {task.priority}</p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 text-muted-foreground/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

export function DependenciesPanel({ taskId }: { taskId: string }) {
  const [data, setData] = useState<DepsData>({ blockedBy: [], blocking: [] });
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<TaskSummary[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const fetchDeps = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`);
      const d = await res.json() as DepsData;
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchAllTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const tasks = await res.json() as TaskSummary[];
    setAllTasks(tasks.filter(t => t.id !== taskId));
  }, [taskId]);

  useEffect(() => {
    fetchDeps();
    fetchAllTasks();
  }, [fetchDeps, fetchAllTasks]);

  const addDependency = async (blockedById: string) => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedById }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) {
        await fetchDeps();
        setSearch('');
        setShowPicker(false);
      } else {
        setError(json.error ?? 'Failed to add dependency');
      }
    } finally {
      setAdding(false);
    }
  };

  const removeDependency = async (blockedById: string) => {
    setRemovingId(blockedById);
    try {
      await fetch(`/api/tasks/${taskId}/dependencies?blockedById=${blockedById}`, { method: 'DELETE' });
      await fetchDeps();
    } finally {
      setRemovingId(null);
    }
  };

  // Already linked task ids
  const linkedIds = new Set([
    ...data.blockedBy.map(t => t.id),
    ...data.blocking.map(t => t.id),
    taskId,
  ]);

  const filteredTasks = allTasks.filter(t => {
    if (linkedIds.has(t.id)) return false;
    if (!search) return true;
    return t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.name.toLowerCase().includes(search.toLowerCase());
  });

  const isBlocked = data.blockedBy.some(t => t.status !== 'done');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Dependencies</span>
        {isBlocked && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            blocked
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Blocked by */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Blocked by ({data.blockedBy.length})
            </p>
            {data.blockedBy.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-1">None — task is unblocked</p>
            ) : (
              data.blockedBy.map(t => (
                <TaskChip
                  key={t.id}
                  task={t}
                  onRemove={() => removeDependency(t.id)}
                  removing={removingId === t.id}
                />
              ))
            )}
          </div>

          {/* Blocking others */}
          {data.blocking.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Blocking ({data.blocking.length})
              </p>
              {data.blocking.map(t => (
                <TaskChip key={t.id} task={t} />
              ))}
            </div>
          )}

          {/* Add dependency */}
          <div className="space-y-2">
            {!showPicker ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 w-full"
                onClick={() => setShowPicker(true)}
              >
                <Plus className="h-3 w-3" />
                Add blocked-by dependency
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium flex-1">This task is blocked by…</p>
                  <button onClick={() => { setShowPicker(false); setSearch(''); setError(null); }}
                    className="text-muted-foreground/50 hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks…"
                    className="h-7 text-xs pl-7"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />{error}
                  </p>
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      {search ? 'No matching tasks' : 'All tasks already linked'}
                    </p>
                  ) : (
                    filteredTasks.slice(0, 8).map(t => (
                      <button
                        key={t.id}
                        disabled={adding}
                        onClick={() => addDependency(t.id)}
                        className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[t.status] ?? 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.category.name}</p>
                        </div>
                        {adding && <Loader2 className="h-3 w-3 animate-spin" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
