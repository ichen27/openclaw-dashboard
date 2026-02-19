'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { AgentStatus } from '@/lib/agents';
import { InstanceSection } from './components/InstanceSection';
import { SummaryHeader } from './components/SummaryHeader';
import { ActivityTimeline } from './components/ActivityTimeline';
import { CollaborationGraph } from './components/CollaborationGraph';
import { MetricsPanel } from './components/MetricsPanel';
import { ActiveTools } from './components/ActiveTools';
import { TaskAuction } from './components/TaskAuction';
import { AgentPing } from '@/components/agent-ping';
import { PingScheduler } from '@/components/ping-scheduler';
import { Loader2 } from 'lucide-react';

// Map workspace paths to instance names
const WORKSPACE_MAP: Record<string, string> = {
  '/Users/chenagent/.openclaw/workspace': 'agent-1',
  '/Users/chenagent/.openclaw-agent-2/workspace': 'agent-2',
  '/Users/chenagent/.openclaw-agent-3/workspace': 'agent-3',
  '/Users/chenagent/.openclaw/workspace-agent4': 'agent-4',
};

type InstanceGroup = {
  instanceId: string;
  workspace: string;
  agents: AgentStatus[];
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE connection
  useEffect(() => {
    // Initial fetch
    fetch('/api/agents')
      .then(r => r.json())
      .then((data: AgentStatus[]) => {
        setAgents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // SSE for live updates
    function connect() {
      const es = new EventSource('/api/agents/stream');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentStatus[];
          setAgents(data);
          setLoading(false);
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const instanceGroups = useMemo(() => {
    const groups: Record<string, InstanceGroup> = {};

    agents.forEach(agent => {
      const instanceId = WORKSPACE_MAP[agent.workspace] || 'unknown';
      
      if (!groups[instanceId]) {
        groups[instanceId] = {
          instanceId,
          workspace: agent.workspace,
          agents: [],
        };
      }
      
      groups[instanceId].agents.push(agent);
    });

    // Sort instances (agent-1, agent-2, agent-3)
    return Object.values(groups).sort((a, b) => 
      a.instanceId.localeCompare(b.instanceId)
    );
  }, [agents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Summary cards */}
      <SummaryHeader agents={agents} />

      {/* Performance metrics */}
      <MetricsPanel agents={agents} />

      {/* Collaboration graph */}
      <CollaborationGraph agents={agents} />

      {/* 2-column layout: agents + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent cards */}
        <div className="lg:col-span-2 space-y-4">
          {instanceGroups.map((group) => (
            <InstanceSection
              key={group.instanceId}
              instanceId={group.instanceId}
              workspace={group.workspace}
              agents={group.agents}
            />
          ))}

          {instanceGroups.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              No agents found.
            </div>
          )}
        </div>

        {/* Right: Ping + Task Auction + Activity timeline + Active tools */}
        <div className="lg:col-span-1 space-y-4">
          <AgentPing agents={agents} />
          <PingScheduler agents={agents} />
          <TaskAuction />
          <ActivityTimeline />
          <ActiveTools />
        </div>
      </div>
    </div>
  );
}
