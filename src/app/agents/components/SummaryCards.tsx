'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCost } from '@/lib/costs';
import type { AgentStatus } from '@/lib/agents';
import { Bot, Activity, MessageSquare, DollarSign, ListTodo } from 'lucide-react';

interface SummaryCardsProps {
  agents: AgentStatus[];
}

export function SummaryCards({ agents }: SummaryCardsProps) {
  const [tasksInProgress, setTasksInProgress] = useState(0);

  useEffect(() => {
    fetch('/api/tasks?status=in-progress')
      .then(r => r.json())
      .then((tasks: unknown[]) => setTasksInProgress(Array.isArray(tasks) ? tasks.length : 0))
      .catch(() => setTasksInProgress(0));
  }, []);

  const totalAgents = agents.length;
  const activeNow = agents.filter(a => a.status === 'active').length;
  const totalSessions = agents.reduce((sum, a) => sum + a.totalSessions, 0);
  const totalCost = agents.reduce(
    (sum, a) => sum + a.sessions.reduce((s, sess) => s + sess.cost.estimated, 0),
    0
  );

  const stats = [
    { label: 'Active Agents', value: activeNow, total: totalAgents, icon: Bot },
    { label: 'Total Sessions', value: totalSessions, icon: MessageSquare },
    { label: 'Est. Cost', value: formatCost(totalCost), icon: DollarSign },
    { label: 'Tasks Active', value: tasksInProgress, icon: ListTodo },
    { label: 'Status', value: activeNow > 0 ? 'Running' : 'Idle', icon: Activity },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map(({ label, value, icon: Icon, ...rest }) => (
        <Card key={label} className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              {'total' in rest && (
                <span className="text-sm text-muted-foreground">/ {(rest as { total: number }).total}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
