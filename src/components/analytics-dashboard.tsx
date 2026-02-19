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
  DollarSign,
  Trophy,
  Flame,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ActivityTimeline } from './activity-timeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface CostData {
  agents: { id: string; sessions: number; totalTokens: number; estimatedCost: number }[];
  totalCost: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HEATMAP_COLORS = [
  'bg-zinc-800/40 dark:bg-zinc-800/60',     // 0 — empty
  'bg-green-900/50 dark:bg-green-900/60',    // 1
  'bg-green-700/60 dark:bg-green-700/70',    // 2
  'bg-green-500/70 dark:bg-green-500/80',    // 3
  'bg-green-400/80 dark:bg-green-400',       // 4
  'bg-green-300 dark:bg-green-300',          // 5 — max
];

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}

function CardSkeleton() {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className={`w-full ${height}`} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [costLoading, setCostLoading] = useState(true);
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

  const fetchCosts = useCallback(async () => {
    setCostLoading(true);
    try {
      const res = await fetch('/api/analytics/costs');
      if (res.ok) {
        setCostData(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch costs', e);
    } finally {
      setCostLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Derived stats
  const totalDone = data
    ? Object.values(data.agentStats).reduce((s, a) => s + a.completed, 0)
    : 0;

  const recentVelocity = data ? data.velocity.slice(-7) : [];
  const weekDone = recentVelocity.reduce((s, v) => s + v.count, 0);

  const mostActiveAgent = data
    ? Object.entries(data.agentStats)
        .filter(([a]) => a !== 'unassigned')
        .sort((a, b) => b[1].completed - a[1].completed)[0]?.[0] ?? '—'
    : '—';

  const avgPerDay = data && data.velocity.length
    ? (data.velocity.reduce((s, v) => s + v.count, 0) / data.velocity.length)
    : 0;

  const prevWeek = data ? data.velocity.slice(-14, -7) : [];
  const prevWeekTotal = prevWeek.reduce((s, v) => s + v.count, 0);
  const weekTrend = prevWeekTotal ? ((weekDone - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Task velocity, agent costs & work patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm bg-card border border-border rounded-md px-3 py-1.5 dark:bg-zinc-900"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => { fetchData(); fetchCosts(); }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. SUMMARY CARDS ROW                                              */}
      {/* ----------------------------------------------------------------- */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Tasks Done"
            value={totalDone}
            icon={<BarChart3 className="h-4 w-4" />}
            subtitle="all time completed"
          />
          <SummaryCard
            title="Done This Week"
            value={weekDone}
            icon={<Flame className="h-4 w-4" />}
            trend={weekTrend}
            subtitle="vs previous 7 days"
          />
          <SummaryCard
            title="Most Active Agent"
            value={mostActiveAgent}
            icon={<Trophy className="h-4 w-4" />}
            subtitle="by tasks completed"
            small
          />
          <SummaryCard
            title="Avg Tasks / Day"
            value={avgPerDay.toFixed(1)}
            icon={<TrendingUp className="h-4 w-4" />}
            subtitle={`over ${days} day period`}
          />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. COST TRACKING                                                  */}
      {/* ----------------------------------------------------------------- */}
      {costLoading && !costData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><ChartSkeleton height="h-40" /></div>
          <CardSkeleton />
        </div>
      ) : costData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CostBars agents={costData.agents} />
          <CostSummaryCard data={costData} />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. VELOCITY CHART with 7-day rolling avg                          */}
      {/* ----------------------------------------------------------------- */}
      {loading && !data ? (
        <ChartSkeleton height="h-52" />
      ) : data && (
        <VelocityChart velocity={data.velocity} throughput={data.throughput} />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 4. AGENT LEADERBOARD TABLE                                        */}
      {/* ----------------------------------------------------------------- */}
      {loading && !data ? (
        <ChartSkeleton height="h-40" />
      ) : data && (
        <AgentLeaderboardTable stats={data.agentStats} />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. HEATMAP — GitHub-style                                         */}
      {/* ----------------------------------------------------------------- */}
      {loading && !data ? (
        <ChartSkeleton height="h-40" />
      ) : data && (
        <ActivityHeatmap heatmap={data.heatmap} />
      )}

      {/* Activity Timeline */}
      <ActivityTimeline hours={days * 24} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  small,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: number;
  small?: boolean;
}) {
  return (
    <Card className="py-4">
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={small ? 'text-lg font-bold truncate' : 'text-3xl font-bold tabular-nums'}>
            {value}
          </span>
          {trend !== undefined && trend !== 0 && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend > 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {trend > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Cost Tracking
// ---------------------------------------------------------------------------

function CostBars({
  agents,
}: {
  agents: CostData['agents'];
}) {
  const sorted = [...agents].sort((a, b) => b.estimatedCost - a.estimatedCost);
  const maxCost = Math.max(...sorted.map((a) => a.estimatedCost), 0.01);

  return (
    <Card className="lg:col-span-2 py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Cost per Agent
        </CardTitle>
        <CardDescription>Estimated from token usage</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cost data available</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((agent) => (
              <div key={agent.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium truncate max-w-[200px]">{agent.id}</span>
                  <span className="text-muted-foreground tabular-nums">
                    ${agent.estimatedCost.toFixed(2)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all"
                    style={{ width: `${(agent.estimatedCost / maxCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CostSummaryCard({ data }: { data: CostData }) {
  const tokenStr =
    data.totalTokens >= 1_000_000
      ? `${(data.totalTokens / 1_000_000).toFixed(1)}M`
      : data.totalTokens >= 1_000
        ? `${(data.totalTokens / 1_000).toFixed(0)}K`
        : String(data.totalTokens);

  return (
    <Card className="py-4">
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Estimated Cost
          </span>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-3xl font-bold tabular-nums">
          ${data.totalCost.toFixed(2)}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{tokenStr} tokens across {data.agents.length} agents</p>
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Agents tracked</span>
            <span className="font-medium text-foreground">{data.agents.length}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total sessions</span>
            <span className="font-medium text-foreground">
              {data.agents.reduce((s, a) => s + a.sessions, 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Velocity Chart with 7-day rolling average
// ---------------------------------------------------------------------------

function VelocityChart({
  velocity,
  throughput,
}: {
  velocity: AnalyticsData['velocity'];
  throughput: AnalyticsData['throughput'];
}) {
  const sliced = throughput.slice(-21);
  const velSliced = velocity.slice(-21);

  // Compute 7-day rolling average on the velocity data
  const rollingAvg = velSliced.map((_, i) => {
    const window = velSliced.slice(Math.max(0, i - 6), i + 1);
    return window.reduce((s, v) => s + v.count, 0) / window.length;
  });

  const maxBar = Math.max(...sliced.map((d) => Math.max(d.created, d.completed)), 1);
  const maxLine = Math.max(...rollingAvg, 1);
  const scaleMax = Math.max(maxBar, maxLine);

  const chartH = 160;
  const barAreaH = chartH - 20; // leave space for labels

  // SVG line path for rolling avg
  const stepW = sliced.length > 1 ? 100 / (sliced.length - 1) : 100;
  const linePts = rollingAvg
    .map((v, i) => {
      const x = sliced.length === 1 ? 50 : (i / (sliced.length - 1)) * 100;
      const y = 100 - (v / scaleMax) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Velocity &amp; Throughput
        </CardTitle>
        <CardDescription className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" /> Created
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" /> Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-0.5 rounded bg-orange-400" /> 7d avg
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: chartH }}>
          {/* Bar chart */}
          <div className="absolute inset-0 flex items-end gap-[2px] pb-5">
            {sliced.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full flex gap-[1px] items-end justify-center"
                  style={{ height: barAreaH }}
                >
                  <div
                    className="flex-1 max-w-3 bg-blue-500/70 dark:bg-blue-500/80 rounded-t-sm transition-all"
                    style={{
                      height: `${(d.created / scaleMax) * 100}%`,
                      minHeight: d.created ? 3 : 0,
                    }}
                    title={`Created: ${d.created}`}
                  />
                  <div
                    className="flex-1 max-w-3 bg-green-500/70 dark:bg-green-500/80 rounded-t-sm transition-all"
                    style={{
                      height: `${(d.completed / scaleMax) * 100}%`,
                      minHeight: d.completed ? 3 : 0,
                    }}
                    title={`Completed: ${d.completed}`}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-none">
                  {i % 3 === 0 ? d.date.slice(5) : ''}
                </span>
              </div>
            ))}
          </div>

          {/* SVG rolling avg line overlay */}
          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ paddingBottom: 20 }}
          >
            <polyline
              points={linePts}
              fill="none"
              stroke="rgb(251, 146, 60)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 4. Agent Leaderboard Table
// ---------------------------------------------------------------------------

function AgentLeaderboardTable({
  stats,
}: {
  stats: Record<string, { created: number; completed: number; events: number }>;
}) {
  const entries = Object.entries(stats).sort((a, b) => b[1].completed - a[1].completed);

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Agent Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agent activity yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4 font-medium">Agent</th>
                  <th className="text-right py-2 px-4 font-medium">Tasks Completed</th>
                  <th className="text-right py-2 px-4 font-medium">Events</th>
                  <th className="text-right py-2 pl-4 font-medium">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([agent, s], i) => {
                  const rate = s.created > 0
                    ? ((s.completed / s.created) * 100).toFixed(0)
                    : s.completed > 0 ? '100' : '0';
                  return (
                    <tr
                      key={agent}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-muted text-muted-foreground w-5 h-5 rounded flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-medium truncate max-w-[180px]">{agent}</span>
                        </div>
                      </td>
                      <td className="text-right py-2.5 px-4 tabular-nums font-medium">
                        {s.completed}
                      </td>
                      <td className="text-right py-2.5 px-4 tabular-nums text-muted-foreground">
                        {s.events}
                      </td>
                      <td className="text-right py-2.5 pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 dark:bg-green-400 transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-muted-foreground w-9 text-right">
                            {rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 5. Activity Heatmap — GitHub-style green scaling
// ---------------------------------------------------------------------------

function heatmapLevel(val: number, max: number): number {
  if (val === 0 || max === 0) return 0;
  const pct = val / max;
  if (pct <= 0.15) return 1;
  if (pct <= 0.35) return 2;
  if (pct <= 0.55) return 3;
  if (pct <= 0.8) return 4;
  return 5;
}

function ActivityHeatmap({ heatmap }: { heatmap: number[][] }) {
  const maxVal = Math.max(...heatmap.flat(), 1);
  const hourLabels = [0, 6, 12, 18];

  return (
    <Card className="py-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Activity Heatmap
          <span className="text-xs font-normal text-muted-foreground">(UTC)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels row */}
            <div className="flex mb-1">
              <div className="w-10 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[10px] text-muted-foreground font-mono"
                >
                  {hourLabels.includes(h) ? h : ''}
                </div>
              ))}
            </div>

            {/* Rows: one per day */}
            {heatmap.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-[3px] mb-[3px]">
                <div className="w-10 shrink-0 text-[11px] text-muted-foreground font-medium">
                  {DAY_LABELS[dayIdx]}
                </div>
                {row.map((val, h) => {
                  const level = heatmapLevel(val, maxVal);
                  return (
                    <div
                      key={h}
                      className={`flex-1 aspect-square rounded-sm ${HEATMAP_COLORS[level]} transition-colors`}
                      title={`${DAY_LABELS[dayIdx]} ${h}:00 — ${val} events`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
          <span>Less</span>
          {HEATMAP_COLORS.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
