'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  ArrowRight,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Zap,
  Eye,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  taskId: string;
  fromStatus: string | null;
  toStatus: string;
  agent: string | null;
  note: string;
  createdAt: string;
  task: {
    title: string;
    priority: string;
    category: { name: string; color: string; slug: string };
  };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  backlog: { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Clock },
  queued: { color: 'text-violet-400', bg: 'bg-violet-400/10', icon: Zap },
  'in-progress': { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Activity },
  review: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Eye },
  done: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
  failed: { color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
};

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
  critical: 'bg-red-600',
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: AlertCircle };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function groupByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const date = new Date(e.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  }
  return groups;
}

export function ActivityTimeline({ hours = 48 }: { hours?: number }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHours, setSelectedHours] = useState(hours);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/timeline?hours=${selectedHours}&limit=100`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error('Failed to fetch timeline', e);
    } finally {
      setLoading(false);
    }
  }, [selectedHours]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Auto-refresh 30s
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const grouped = groupByDate(events);

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Activity Timeline</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {events.length} events
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(Number(e.target.value))}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1"
          >
            <option value={6}>Last 6h</option>
            <option value={12}>Last 12h</option>
            <option value={24}>Last 24h</option>
            <option value={48}>Last 48h</option>
            <option value={168}>Last 7d</option>
          </select>
          <button
            onClick={fetchEvents}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {events.length === 0 && !loading && (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No activity in this period</p>
          </div>
        )}

        {Object.entries(grouped).map(([dateLabel, dateEvents]) => (
          <div key={dateLabel} className="mb-6 last:mb-0">
            <div className="sticky top-0 bg-card z-10 pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {dateLabel}
              </span>
            </div>

            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border/60" />

              {dateEvents.map((event, i) => {
                const config = getStatusConfig(event.toStatus);
                const Icon = event.fromStatus === null ? Plus : config.icon;
                const isCreation = event.fromStatus === null;

                return (
                  <div key={event.id} className="relative pb-4 last:pb-0">
                    {/* Dot on timeline */}
                    <div
                      className={`absolute left-[-15px] top-1 w-[18px] h-[18px] rounded-full border-2 border-card flex items-center justify-center ${config.bg}`}
                    >
                      <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="group">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" title={event.task.title}>
                            {event.task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {isCreation ? (
                              <span className={`text-xs ${config.color} flex items-center gap-1`}>
                                <Plus className="h-3 w-3" /> Created as{' '}
                                <span className="capitalize font-medium">{event.toStatus}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="capitalize">{event.fromStatus}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className={`capitalize font-medium ${config.color}`}>
                                  {event.toStatus}
                                </span>
                              </span>
                            )}
                            {event.agent && (
                              <span className="text-xs text-muted-foreground">
                                by <span className="font-mono">{event.agent}</span>
                              </span>
                            )}
                            <span
                              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                              style={{
                                color: event.task.category.color,
                                backgroundColor: event.task.category.color + '15',
                              }}
                            >
                              {event.task.category.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  PRIORITY_DOT[event.task.priority] || 'bg-slate-400'
                                }`}
                              />
                              {event.task.priority}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {timeAgo(event.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
