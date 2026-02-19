'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from 'lucide-react';
import type { AgentStatus } from '@/lib/agents';

interface CollaborationGraphProps {
  agents: AgentStatus[];
}

const AGENT_COLORS: Record<string, { bg: string; ring: string; text: string; stroke: string }> = {
  'agent-1': { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', text: 'text-emerald-400', stroke: 'stroke-emerald-500/40' },
  'agent-2': { bg: 'bg-blue-500', ring: 'ring-blue-500/30', text: 'text-blue-400', stroke: 'stroke-blue-500/40' },
  'agent-3': { bg: 'bg-violet-500', ring: 'ring-violet-500/30', text: 'text-violet-400', stroke: 'stroke-violet-500/40' },
  'agent-4': { bg: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-400', stroke: 'stroke-amber-500/40' },
};

const DEFAULT_COLOR = { bg: 'bg-neutral-500', ring: 'ring-neutral-500/30', text: 'text-neutral-400', stroke: 'stroke-neutral-500/40' };

function getInstanceId(workspace: string): string {
  if (workspace.includes('workspace-agent4')) return 'agent-4';
  if (workspace.includes('agent-4')) return 'agent-4';
  if (workspace.includes('agent-3')) return 'agent-3';
  if (workspace.includes('agent-2')) return 'agent-2';
  return 'agent-1';
}

// Position agents in a circle
function getPositions(count: number): { x: number; y: number }[] {
  if (count <= 1) return [{ x: 50, y: 50 }];
  if (count === 2) return [{ x: 30, y: 50 }, { x: 70, y: 50 }];
  if (count === 3) return [{ x: 50, y: 18 }, { x: 18, y: 75 }, { x: 82, y: 75 }];
  // 4 agents: diamond layout
  return [
    { x: 50, y: 12 },  // top
    { x: 12, y: 50 },  // left
    { x: 88, y: 50 },  // right
    { x: 50, y: 88 },  // bottom
  ];
}

function getLastActivity(agent: AgentStatus): string {
  if (agent.status === 'never') return 'No activity';
  if (agent.activeSessions === 0 && agent.lastActive) {
    const mins = Math.floor((Date.now() - agent.lastActive) / 60000);
    if (mins < 60) return `Idle ${mins}m`;
    return `Idle ${Math.floor(mins / 60)}h`;
  }
  // Find the most recent session's channel
  const recentSession = agent.sessions
    .filter(s => s.updatedAt > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (recentSession) {
    const channel = recentSession.lastChannel;
    if (channel.includes('telegram')) return '💬 Telegram active';
    if (channel.includes('discord')) return '💬 Discord active';
    if (recentSession.isSubAgent) return '⚙️ Sub-agent running';
    return `🟢 Active (${channel})`;
  }
  return '🟢 Active';
}

export function CollaborationGraph({ agents }: CollaborationGraphProps) {
  const instanceData = useMemo(() => {
    const map: Record<string, { id: string; agents: AgentStatus[]; isActive: boolean; activeSessions: number; lastActivity: string }> = {};
    
    agents.forEach(a => {
      const id = getInstanceId(a.workspace);
      if (!map[id]) {
        map[id] = { id, agents: [], isActive: false, activeSessions: 0, lastActivity: '' };
      }
      map[id].agents.push(a);
      if (a.status === 'active') map[id].isActive = true;
      map[id].activeSessions += a.activeSessions;
    });

    // Set last activity
    Object.values(map).forEach(inst => {
      const mainAgent = inst.agents.find(a => a.isDefault) || inst.agents[0];
      if (mainAgent) inst.lastActivity = getLastActivity(mainAgent);
    });

    return Object.values(map).sort((a, b) => a.id.localeCompare(b.id));
  }, [agents]);

  const positions = getPositions(instanceData.length);

  return (
    <Card className="bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Network className="h-4 w-4 text-muted-foreground" />
          Agent Network
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative w-full h-64">
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {instanceData.map((instA, i) =>
              instanceData.slice(i + 1).map((instB, j) => {
                const posA = positions[i];
                const posB = positions[i + j + 1];
                const bothActive = instA.isActive && instB.isActive;
                return (
                  <line
                    key={`${instA.id}-${instB.id}`}
                    x1={posA.x} y1={posA.y + 5}
                    x2={posB.x} y2={posB.y + 5}
                    className={`stroke-[0.5] ${bothActive ? 'stroke-foreground/20' : 'stroke-border/20'}`}
                    strokeDasharray={bothActive ? '3 2' : '2 4'}
                  >
                    {bothActive && (
                      <animate attributeName="stroke-dashoffset" values="5;0" dur="1s" repeatCount="indefinite" />
                    )}
                  </line>
                );
              })
            )}
          </svg>

          {/* Agent nodes */}
          {instanceData.map((inst, i) => {
            const pos = positions[i];
            const colors = AGENT_COLORS[inst.id] || DEFAULT_COLOR;

            return (
              <div
                key={inst.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                {/* Node circle */}
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-500 ring-4 ${
                      inst.isActive
                        ? `${colors.bg} ${colors.ring} shadow-lg`
                        : 'bg-muted text-muted-foreground ring-border/20'
                    }`}
                  >
                    {inst.id.replace('agent-', '')}
                  </div>
                  {/* Pulse ring for active */}
                  {inst.isActive && (
                    <div className={`absolute inset-0 rounded-full ${colors.bg} opacity-30 animate-ping`} />
                  )}
                </div>
                {/* Label */}
                <span className="text-[11px] font-semibold text-foreground">{inst.id}</span>
                {/* Live status */}
                <span className={`text-[9px] max-w-[100px] text-center leading-tight ${inst.isActive ? colors.text : 'text-muted-foreground'}`}>
                  {inst.lastActivity}
                </span>
                {/* Session count */}
                {inst.activeSessions > 0 && (
                  <span className="text-[9px] text-muted-foreground tabular-nums">
                    {inst.activeSessions} session{inst.activeSessions !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
