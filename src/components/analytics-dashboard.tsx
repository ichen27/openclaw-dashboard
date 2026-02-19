'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { ActivityTimeline } from './activity-timeline';

interface AnalyticsData {
  period: { days: number; since: string };
  totalTasks: number;
  totalEvents: number;
  velocity: { date: string; count: number }[];
  throughput: { date: string; created: number; completed: number }[];
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  agentStats: Record<string, { created: number; completed: number; events: number }>;
  heatmap: number[][];
  statusFlow: { from: string; to: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  backlog: '#64748b',
  queued: '#8b5cf6',
  'in-progress': '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
  failed: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const recentVelocity = data.velocity.slice(-7);
  const avgVelocity = recentVelocity.length
    ? recentVelocity.reduce((s, v) => s + v.count, 0) / recentVelocity.length
    : 0;
  const prevVelocity = data.velocity.slice(-14, -7);
  const prevAvg = prevVelocity.length
    ? prevVelocity.reduce((s, v) => s + v.count, 0) / prevVelocity.length
    : 0;
  const velocityTrend = prevAvg ? ((avgVelocity - prevAvg) / prevAvg) * 100 : 0;

  const totalCompleted = Object.values(data.agentStats).reduce((s, a) => s + a.completed, 0);
  const totalCreated = Object.values(data.agentStats).reduce((s, a) => s + a.created, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Task velocity, agent productivity & work patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm bg-card border border-border rounded-md px-3 py-1.5"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Tasks"
          value={data.totalTasks}
          icon={<BarChart3 className="h-4 w-4" />}
          subtitle={`${data.totalEvents} events tracked`}
        />
        <SummaryCard
          title="Avg Daily Velocity"
          value={avgVelocity.toFixed(1)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={velocityTrend}
          subtitle="tasks completed/day (7d)"
        />
        <SummaryCard
          title="Tasks Completed"
          value={totalCompleted}
          icon={<Clock className="h-4 w-4" />}
          subtitle={`of ${totalCreated} created in period`}
        />
        <SummaryCard
          title="Active Agents"
          value={Object.keys(data.agentStats).filter((a) => a !== 'unassigned').length}
          icon={<Users className="h-4 w-4" />}
          subtitle={`${Object.keys(data.agentStats).length} total contributors`}
        />
      </div>

      {/* Charts Row 1: Velocity + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VelocityChart data={data.throughput} />
        </div>
        <StatusDonut counts={data.statusCounts} />
      </div>

      {/* Charts Row 2: Heatmap + Agent Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityHeatmap heatmap={data.heatmap} />
        </div>
        <AgentLeaderboard stats={data.agentStats} />
      </div>

      {/* Charts Row 3: Status Flow + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusFlowTable flow={data.statusFlow} />
        <PriorityBreakdown counts={data.priorityCounts} total={data.totalTasks} />
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline hours={days * 24} />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: number;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend !== undefined && trend !== 0 && (
          <span
            className={`flex items-center text-xs font-medium ${
              trend > 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function VelocityChart({ data }: { data: { date: string; created: number; completed: number }[] }) {
  // Show last 14 entries max for readability
  const sliced = data.slice(-14);
  const maxVal = Math.max(...sliced.map((d) => Math.max(d.created, d.completed)), 1);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Throughput</h3>
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Created
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Completed
          </span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-40">
        {sliced.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '120px' }}>
              <div
                className="flex-1 max-w-3 bg-blue-500/80 rounded-t-sm transition-all"
                style={{ height: `${(d.created / maxVal) * 100}%`, minHeight: d.created ? '4px' : 0 }}
                title={`Created: ${d.created}`}
              />
              <div
                className="flex-1 max-w-3 bg-green-500/80 rounded-t-sm transition-all"
                style={{ height: `${(d.completed / maxVal) * 100}%`, minHeight: d.completed ? '4px' : 0 }}
                title={`Completed: ${d.completed}`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDonut({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // Simple horizontal bar chart instead of SVG donut
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold text-sm mb-4">Status Distribution</h3>
      <div className="space-y-3">
        {entries.map(([status, count]) => (
          <div key={status}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="capitalize">{status}</span>
              <span className="text-muted-foreground">
                {count} ({((count / total) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(count / total) * 100}%`,
                  backgroundColor: STATUS_COLORS[status] || '#6366f1',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{total} total tasks</p>
    </div>
  );
}

function ActivityHeatmap({ heatmap }: { heatmap: number[][] }) {
  const maxVal = Math.max(...heatmap.flat(), 1);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold text-sm mb-4">Activity Heatmap (UTC)</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-10" />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
                {h % 3 === 0 ? `${h}` : ''}
              </div>
            ))}
          </div>
          {/* Grid */}
          {heatmap.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-10 text-xs text-muted-foreground">{DAY_LABELS[dayIdx]}</div>
              {row.map((val, h) => (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-sm transition-colors"
                  style={{
                    backgroundColor: val
                      ? `rgba(59, 130, 246, ${0.15 + (val / maxVal) * 0.85})`
                      : 'rgba(100, 116, 139, 0.08)',
                  }}
                  title={`${DAY_LABELS[dayIdx]} ${h}:00 — ${val} events`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        {[0.1, 0.3, 0.5, 0.7, 1].map((opacity) => (
          <div
            key={opacity}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function AgentLeaderboard({
  stats,
}: {
  stats: Record<string, { created: number; completed: number; events: number }>;
}) {
  const entries = Object.entries(stats).sort((a, b) => b[1].events - a[1].events);
  const maxEvents = Math.max(...entries.map(([, s]) => s.events), 1);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold text-sm mb-4">Agent Leaderboard</h3>
      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No agent activity yet</p>
        )}
        {entries.map(([agent, s], i) => (
          <div key={agent}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  #{i + 1}
                </span>
                <span className="truncate max-w-[120px]">{agent}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {s.completed}✓ {s.created}+ {s.events} events
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${(s.events / maxEvents) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusFlowTable({ flow }: { flow: { from: string; to: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold text-sm mb-4">Status Transitions</h3>
      {flow.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transitions recorded yet</p>
      ) : (
        <div className="space-y-2">
          {flow.slice(0, 10).map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize"
                style={{ backgroundColor: STATUS_COLORS[f.from] || '#6366f1' }}
              >
                {f.from}
              </span>
              <span className="text-muted-foreground">→</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize"
                style={{ backgroundColor: STATUS_COLORS[f.to] || '#6366f1' }}
              >
                {f.to}
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">×{f.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityBreakdown({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold text-sm mb-4">Priority Breakdown</h3>
      <div className="space-y-3">
        {entries.map(([priority, count]) => (
          <div key={priority}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="capitalize flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLORS[priority] || '#6366f1' }}
                />
                {priority}
              </span>
              <span className="text-muted-foreground">
                {count} ({((count / (total || 1)) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(count / (total || 1)) * 100}%`,
                  backgroundColor: PRIORITY_COLORS[priority] || '#6366f1',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
