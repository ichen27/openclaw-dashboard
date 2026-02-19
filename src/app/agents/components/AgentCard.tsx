'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCost } from '@/lib/costs';
import { checkAgentHealth, getHealthBadgeClass, getHealthLabel } from '@/lib/health';
import { SessionList } from './SessionList';
import { CostBadge } from './CostBadge';
import { MessageAgent } from './MessageAgent';
import type { AgentStatus } from '@/lib/agents';

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

const STATUS_INDICATOR: Record<string, string> = {
  active: 'bg-emerald-500 shadow-emerald-500/50 shadow-[0_0_6px]',
  idle: 'bg-amber-500',
  never: 'bg-neutral-600',
};

const MODEL_BADGE_CLASS: Record<string, string> = {
  cloud: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  local: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export function AgentCard({ agent }: { agent: AgentStatus }) {
  const [isOpen, setIsOpen] = useState(false);

  const isLocal = agent.model.startsWith('ollama/');
  const modelLabel = agent.model.includes('/') ? agent.model.split('/')[1] : agent.model;
  const modelType = isLocal ? 'local' : 'cloud';

  const totalTokens = agent.sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const maxContext = agent.sessions.length > 0
    ? Math.max(...agent.sessions.map(s => s.contextTokens))
    : agent.contextTokens;
  const usagePercent = maxContext > 0 ? (totalTokens / maxContext) * 100 : 0;

  const totalCost = agent.sessions.reduce((sum, s) => sum + s.cost.estimated, 0);
  
  const health = checkAgentHealth(agent);

  return (
    <Card className="bg-card/60 hover:bg-card/80 transition-colors">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_INDICATOR[agent.status]}`} />
              <CardTitle className="text-sm font-semibold">
                {agent.name}
              </CardTitle>
              {agent.isDefault && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">default</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${getHealthBadgeClass(health.status)}`}
                title={health.issues.join(', ') || 'All systems operational'}
              >
                {getHealthLabel(health.status)}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[11px] font-mono ${MODEL_BADGE_CLASS[modelType]}`}
              >
                {modelLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {agent.totalSessions > 0 ? (
            <>
              {/* Context usage bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span className="tabular-nums">{formatTokens(totalTokens)} / {formatTokens(maxContext)} tokens</span>
                  <span className="tabular-nums">{Math.round(usagePercent)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent > 90 ? 'bg-red-500' :
                      usagePercent > 70 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">{agent.totalSessions} session{agent.totalSessions !== 1 ? 's' : ''}</span>
                {agent.lastActive && <span>{timeAgo(agent.lastActive)}</span>}
                <CostBadge cost={totalCost} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No sessions</p>
          )}

          {/* Skills */}
          {agent.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.skills.slice(0, 5).map(skill => (
                <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  {skill}
                </Badge>
              ))}
              {agent.skills.length > 5 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  +{agent.skills.length - 5}
                </Badge>
              )}
            </div>
          )}

          {/* Expandable sessions */}
          {agent.totalSessions > 0 && (
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Sessions &amp; Sub-agents</span>
            </CollapsibleTrigger>
          )}

          <CollapsibleContent>
            <div className="border-t border-border/50 pt-2 mt-1 space-y-3">
              {health.issues.length > 0 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
                  <div className="font-semibold text-amber-400 mb-1">Health Issues</div>
                  <ul className="space-y-0.5 text-amber-300/80">
                    {health.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <SessionList sessions={agent.sessions} />
              
              {totalCost > 0 && (
                <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground flex justify-between">
                  <span>Total estimated cost</span>
                  <span className="font-mono tabular-nums">{formatCost(totalCost)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-border/30">
                <div className="text-xs text-muted-foreground mb-2">Send Message</div>
                <MessageAgent 
                  sessionKey={`agent:${agent.id}:main`}
                  agentName={agent.name}
                />
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
