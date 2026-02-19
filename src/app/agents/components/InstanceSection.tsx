'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { QuickActions } from './QuickActions';
import type { AgentStatus } from '@/lib/agents';

type InstanceSectionProps = {
  instanceId: string;
  workspace: string;
  agents: AgentStatus[];
};

export function InstanceSection({ instanceId, workspace, agents }: InstanceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = agents.filter(a => a.status === 'active').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;
  const totalSessions = agents.reduce((sum, a) => sum + a.totalSessions, 0);
  const totalCost = agents.reduce((sum, a) => 
    sum + a.sessions.reduce((s, sess) => s + sess.cost.estimated, 0), 0
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-6 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-2xl font-bold capitalize">
                {instanceId}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {agents.length} agent{agents.length !== 1 ? 's' : ''}
              </Badge>
              
              {activeCount > 0 && (
                <Badge className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  {activeCount} active
                </Badge>
              )}
              
              {idleCount > 0 && (
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                  {idleCount} idle
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Sessions</span>
              <span className="font-semibold">{totalSessions}</span>
            </div>
            {totalCost > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground">Cost</span>
                <span className="font-mono font-semibold">${totalCost.toFixed(4)}</span>
              </div>
            )}
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Workspace</span>
              <span className="text-xs font-mono">{workspace.split('/').pop()}</span>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/50 p-6 bg-muted/20 space-y-4">
            <QuickActions instanceId={instanceId} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
