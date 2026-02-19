'use client';

import { Badge } from '@/components/ui/badge';
import { formatCost } from '@/lib/costs';
import type { AgentSession } from '@/lib/agents';

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function SessionList({ sessions }: { sessions: AgentSession[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No sessions</p>
    );
  }

  const mainSessions = sessions.filter(s => !s.isSubAgent);
  const subAgentSessions = sessions.filter(s => s.isSubAgent);

  return (
    <div className="space-y-1">
      {mainSessions.map(session => (
        <SessionRow key={session.key} session={session} />
      ))}
      {subAgentSessions.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
            Sub-agents ({subAgentSessions.length})
          </p>
          {subAgentSessions.map(session => (
            <SessionRow key={session.key} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: AgentSession }) {
  const usagePercent = session.contextTokens > 0
    ? (session.totalTokens / session.contextTokens) * 100
    : 0;

  return (
    <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-muted/50">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-muted-foreground truncate max-w-[200px] font-mono text-xs">
          {session.key.split(':').pop()}
        </span>
        <Badge variant="secondary" className="text-xs shrink-0">
          {session.lastChannel}
        </Badge>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTokens(session.totalTokens)} / {formatTokens(session.contextTokens)}
        </span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent > 90 ? 'bg-red-500' :
              usagePercent > 70 ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        {session.cost.estimated > 0 && (
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {formatCost(session.cost.estimated)}
          </span>
        )}
        <span className="text-xs text-muted-foreground w-14 text-right">
          {session.updatedAt > 0 ? timeAgo(session.updatedAt) : '-'}
        </span>
      </div>
    </div>
  );
}
