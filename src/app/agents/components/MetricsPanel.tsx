'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import type { AgentStatus } from '@/lib/agents';

interface MetricsPanelProps {
  agents: AgentStatus[];
}

export function MetricsPanel({ agents }: MetricsPanelProps) {
  // Aggregate metrics across all agents
  const totalSessions = agents.reduce((sum, a) => sum + a.totalSessions, 0);
  const activeSessions = agents.reduce((sum, a) => sum + a.activeSessions, 0);
  const totalTokens = agents.reduce((sum, a) => 
    sum + a.sessions.reduce((s, sess) => s + sess.totalTokens, 0), 0
  );
  const totalCost = agents.reduce((sum, a) => 
    sum + a.sessions.reduce((s, sess) => s + sess.cost.estimated, 0), 0
  );

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const idleAgents = agents.filter(a => a.status === 'idle').length;

  // Calculate average context usage
  const avgContextUsage = agents.length > 0
    ? agents.reduce((sum, a) => {
        const tokens = a.sessions.reduce((s, sess) => s + sess.totalTokens, 0);
        const max = a.sessions.length > 0 
          ? Math.max(...a.sessions.map(s => s.contextTokens))
          : a.contextTokens;
        return sum + (max > 0 ? (tokens / max) * 100 : 0);
      }, 0) / agents.length
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Sessions */}
      <Card className="bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{activeSessions}</div>
            <div className="text-xs text-muted-foreground">/ {totalSessions} total</div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
              {activeAgents} active
            </Badge>
            {idleAgents > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-500 border-amber-500/30">
                {idleAgents} idle
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Token Usage */}
      <Card className="bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalTokens >= 1_000_000 
              ? `${(totalTokens / 1_000_000).toFixed(1)}M`
              : totalTokens >= 1_000
              ? `${(totalTokens / 1_000).toFixed(0)}k`
              : totalTokens}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg context: {Math.round(avgContextUsage)}%
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                avgContextUsage > 90 ? 'bg-red-500' :
                avgContextUsage > 70 ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(avgContextUsage, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card className="bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            ${totalCost.toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Estimated API costs
          </div>
          {totalCost > 1 && (
            <Badge variant="outline" className="mt-2 text-[10px] bg-amber-500/15 text-amber-500 border-amber-500/30">
              Monitor usage
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Agent Health */}
      <Card className="bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{agents.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total agents</div>
          <div className="flex gap-1 mt-2">
            {agents.map(agent => {
              const totalTokens = agent.sessions.reduce((s, sess) => s + sess.totalTokens, 0);
              const maxContext = agent.sessions.length > 0
                ? Math.max(...agent.sessions.map(s => s.contextTokens))
                : agent.contextTokens;
              const usage = maxContext > 0 ? (totalTokens / maxContext) * 100 : 0;
              
              const color = usage > 90 ? 'bg-red-500' : usage > 70 ? 'bg-amber-500' : 'bg-emerald-500';
              
              return (
                <div 
                  key={agent.id}
                  className={`h-2 flex-1 rounded ${color}`}
                  title={`${agent.name}: ${Math.round(usage)}% context`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
