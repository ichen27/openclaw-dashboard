'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock, Plus, Trash2, Power, PowerOff, Clock,
  Loader2, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PingSchedule {
  id: string;
  target: string;
  message: string;
  cronExpr: string;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  status: string;
  sessions: { key: string; updatedAt?: number }[];
}

// Preset schedule options
const PRESETS = [
  { label: 'Every 30 min', cron: '*/30 * * * *' },
  { label: 'Every hour',   cron: '0 * * * *' },
  { label: 'Every 2 hrs',  cron: '0 */2 * * *' },
  { label: 'Every 4 hrs',  cron: '0 */4 * * *' },
  { label: 'Every 8 hrs',  cron: '0 */8 * * *' },
  { label: 'Daily 9am',    cron: '0 9 * * *' },
];

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PingScheduler({ agents }: { agents: Agent[] }) {
  const [schedules, setSchedules] = useState<PingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  // Form state
  const [fTarget, setFTarget] = useState('all');
  const [fMessage, setFMessage] = useState('');
  const [fCron, setFCron] = useState('0 */2 * * *');
  const [saving, setSaving] = useState(false);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch('/api/pings');
    const data = await res.json();
    setSchedules(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const createSchedule = async () => {
    if (!fMessage.trim() || !fCron.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/pings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: fTarget, message: fMessage.trim(), cronExpr: fCron }),
      });
      setFMessage('');
      setShowForm(false);
      await fetchSchedules();
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    await fetch(`/api/pings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  };

  const deleteSchedule = async (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/pings/${id}`, { method: 'DELETE' });
  };

  const runNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/pings/run', { method: 'POST' });
      const data = await res.json();
      const sent = data.results?.filter((r: { sent: boolean }) => r.sent).length ?? 0;
      setRunResult(`Checked ${data.checked} schedules, sent ${sent} ping(s)`);
      await fetchSchedules();
    } catch {
      setRunResult('Error running schedules');
    } finally {
      setRunning(false);
    }
  };

  const allTargets = ['all', ...Array.from(new Set(agents.map(a => a.id)))];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Ping Scheduler
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <button
              onClick={runNow}
              disabled={running}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Check and run due schedules"
            >
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              Run Now
            </button>
            <button
              onClick={() => setShowForm(p => !p)}
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                showForm
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              )}
            >
              {showForm ? <ChevronUp className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showForm ? 'Cancel' : 'Add'}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Run result */}
        {runResult && (
          <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {runResult}
          </div>
        )}

        {/* New schedule form */}
        {showForm && (
          <div className="space-y-2.5 bg-muted/20 border border-border/40 rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Target</p>
              <select
                value={fTarget}
                onChange={e => setFTarget(e.target.value)}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs outline-none focus:border-primary/50"
              >
                {allTargets.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Agents' : t}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Message</p>
              <textarea
                value={fMessage}
                onChange={e => setFMessage(e.target.value)}
                rows={2}
                placeholder="Message to send to agent(s)..."
                className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs outline-none focus:border-primary/50 resize-none"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Schedule</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {PRESETS.map(p => (
                  <button
                    key={p.cron}
                    onClick={() => setFCron(p.cron)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded border transition-colors',
                      fCron === p.cron
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                value={fCron}
                onChange={e => setFCron(e.target.value)}
                placeholder="cron expression (e.g. 0 */2 * * *)"
                className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs outline-none focus:border-primary/50 font-mono"
              />
            </div>
            <button
              onClick={createSchedule}
              disabled={!fMessage.trim() || !fCron.trim() || saving}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Schedule
            </button>
          </div>
        )}

        {/* Schedule list */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No schedules yet. Add one to start recurring pings.
          </p>
        ) : (
          <div className="space-y-2">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className={cn(
                  'border rounded-lg px-3 py-2.5 transition-colors',
                  schedule.enabled
                    ? 'border-border/50 bg-card/40'
                    : 'border-border/30 bg-muted/10 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">
                        → {schedule.target === 'all' ? 'All Agents' : schedule.target}
                      </span>
                      <span className="text-[10px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground border border-border/40">
                        {schedule.cronExpr}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{schedule.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      Last run: {timeAgo(schedule.lastRunAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleEnabled(schedule.id, !schedule.enabled)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        schedule.enabled
                          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                      title={schedule.enabled ? 'Disable' : 'Enable'}
                    >
                      {schedule.enabled ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this schedule?')) deleteSchedule(schedule.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
