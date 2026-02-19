'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Cpu, DollarSign, ListTodo } from 'lucide-react';
import type { AgentStatus } from '@/lib/agents';

interface SummaryHeaderProps {
  agents: AgentStatus[];
}

export function SummaryHeader({ agents }: SummaryHeaderProps) {
  const [tasksInProgress, setTasksInProgress] = useState(0);

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then((tasks: { status: string }[]) => {
        if (Array.isArray(tasks)) {
          setTasksInProgress(tasks.filter(t => t.status === 'in-progress').length);
        }
      })
      .catch(() => {});
  }, []);

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalSessions = agents.reduce((sum, a) => sum + a.totalSessions, 0);
  const totalCost = agents.reduce((sum, a) =>
    sum + a.sessions.reduce((s, sess) => s + sess.cost.estimated, 0), 0
  );

  const stats = [
    {
      label: 'Active Agents',
      value: `${activeAgents}/${agents.length}`,
      icon: Bot,
      color: activeAgents > 0 ? 'text-emerald-500' : 'text-muted-foreground',
    },
    {
      label: 'Total Sessions',
      value: String(totalSessions),
      icon: Cpu,
      color: 'text-blue-500',
    },
    {
      label: 'Est. Cost',
      value: `$${totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-amber-500',
    },
    {
      label: 'In Progress',
      value: String(tasksInProgress),
      icon: ListTodo,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(stat => (
        <Card key={stat.label} className="bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
