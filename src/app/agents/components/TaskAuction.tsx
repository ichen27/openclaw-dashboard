'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, RefreshCw, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface AgentBid {
  agentId: string;
  agentName: string;
  score: number;
  reasons: string[];
  available: boolean;
}

interface AuctionTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  categoryName: string;
  categorySlug: string;
  assignedAgent: string | null;
  createdAt: string;
  score: number;
  agentBids: AgentBid[];
  suggestedAgent: string | null;
}

interface AgentInfo {
  id: string;
  name: string;
  status: string;
  activeSessions: number;
}

interface AuctionData {
  tasks: AuctionTask[];
  agents: AgentInfo[];
  generatedAt: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
};

const AGENT_STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  never: 'bg-gray-400',
};

function ScoreBar({ score, max = 20 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-6 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export function TaskAuction() {
  const [data, setData] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [result, setResult] = useState<{ taskId: string; ok: boolean; msg: string } | null>(null);
  // Track manual agent overrides per task
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const res = await fetch('/api/tasks/auction?limit=10');
      const json = await res.json() as AuctionData;
      setData(json);
    } finally {
      if (!quiet) setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const assign = async (taskId: string, agentId: string) => {
    setAssigning(taskId);
    setResult(null);
    try {
      const res = await fetch('/api/tasks/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, agentId }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) {
        setResult({ taskId, ok: true, msg: `Assigned to ${agentId}` });
        // Refresh after short delay
        setTimeout(() => fetchData(false), 800);
      } else {
        setResult({ taskId, ok: false, msg: json.error ?? 'Assignment failed' });
      }
    } catch {
      setResult({ taskId, ok: false, msg: 'Network error' });
    } finally {
      setAssigning(null);
    }
  };

  const autoAssignAll = async () => {
    if (!data?.tasks.length) return;
    const unassigned = data.tasks.filter(t => !t.assignedAgent && t.suggestedAgent);
    if (!unassigned.length) return;

    setResult(null);
    for (const task of unassigned) {
      const agentId = overrides[task.id] ?? task.suggestedAgent!;
      await assign(task.id, agentId);
      // Small delay between assignments
      await new Promise(r => setTimeout(r, 300));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            Task Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            Task Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            No backlog tasks available for auction.
          </p>
        </CardContent>
      </Card>
    );
  }

  const unassigned = data.tasks.filter(t => !t.assignedAgent);
  const hasAutoAssign = unassigned.some(t => t.suggestedAgent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            Task Auction
            {unassigned.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {unassigned.length} open
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {hasAutoAssign && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={autoAssignAll}
                disabled={!!assigning}
              >
                <Sparkles className="h-3 w-3" />
                Auto-assign all
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => fetchData(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {/* Agent availability bar */}
        <div className="flex items-center gap-2 mt-1">
          {data.agents.map(agent => (
            <div key={agent.id} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${AGENT_STATUS_COLOR[agent.status] ?? 'bg-gray-400'}`} />
              <span className="text-xs text-muted-foreground">{agent.id}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {data.tasks.map(task => {
          const topBid = task.agentBids[0];
          const selectedAgent = overrides[task.id] ?? task.suggestedAgent ?? topBid?.agentId ?? '';
          const isAssigning = assigning === task.id;
          const taskResult = result?.taskId === task.id ? result : null;

          return (
            <div
              key={task.id}
              className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2"
            >
              {/* Task header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 border ${PRIORITY_COLOR[task.priority] ?? ''}`}
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{task.categoryName}</span>
                  </div>
                  <p className="text-xs font-medium mt-0.5 leading-snug truncate" title={task.title}>
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">score</span>
                  <span className="text-[10px] font-mono font-bold text-primary">
                    {task.score.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Agent bids (top 3) */}
              <div className="space-y-1">
                {task.agentBids.slice(0, 3).map(bid => (
                  <div key={bid.agentId} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">{bid.agentId}</span>
                    <div className="flex-1">
                      <ScoreBar score={bid.score} max={25} />
                    </div>
                    {bid.reasons.length > 0 && (
                      <span className="text-[9px] text-muted-foreground/70 truncate max-w-[80px]">
                        {bid.reasons[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Assignment row */}
              {task.assignedAgent ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  Assigned to {task.assignedAgent}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedAgent}
                    onValueChange={v => setOverrides(o => ({ ...o, [task.id]: v }))}
                  >
                    <SelectTrigger className="h-6 text-xs flex-1">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.agents.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${AGENT_STATUS_COLOR[a.status] ?? 'bg-gray-400'}`} />
                            {a.id}
                            {task.suggestedAgent === a.id && (
                              <span className="text-[9px] text-primary">(suggested)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2"
                    disabled={!selectedAgent || isAssigning}
                    onClick={() => assign(task.id, selectedAgent)}
                  >
                    {isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                  </Button>
                </div>
              )}

              {/* Result feedback */}
              {taskResult && (
                <div className={`flex items-center gap-1 text-[10px] ${taskResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {taskResult.ok ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {taskResult.msg}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Updated {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}
