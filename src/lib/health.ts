import type { AgentStatus } from './agents';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface HealthCheck {
  status: HealthStatus;
  issues: string[];
  score: number; // 0-100
}

export function checkAgentHealth(agent: AgentStatus): HealthCheck {
  const issues: string[] = [];
  let score = 100;

  // Check token usage
  const totalTokens = agent.sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const maxContext = agent.sessions.length > 0
    ? Math.max(...agent.sessions.map(s => s.contextTokens))
    : agent.contextTokens;
  const usagePercent = maxContext > 0 ? (totalTokens / maxContext) * 100 : 0;

  if (usagePercent > 90) {
    issues.push('Context nearly full (>90%)');
    score -= 30;
  } else if (usagePercent > 70) {
    issues.push('High context usage (>70%)');
    score -= 15;
  }

  // Check last activity
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const FOUR_HOURS = 4 * 60 * 60 * 1000;

  if (agent.status === 'never') {
    issues.push('Never been active');
    score -= 20;
  } else if (agent.lastActive) {
    const timeSinceActive = now - agent.lastActive;
    if (timeSinceActive > FOUR_HOURS && agent.status !== 'active') {
      issues.push(`Idle for ${Math.floor(timeSinceActive / (60 * 60 * 1000))}h`);
      score -= 10;
    }
  }

  // Check for no active sessions (if agent should be active)
  if (agent.totalSessions > 0 && agent.activeSessions === 0 && agent.status !== 'never') {
    issues.push('No active sessions');
    score -= 10;
  }

  // Determine overall status
  let status: HealthStatus = 'healthy';
  if (score < 50) {
    status = 'critical';
  } else if (score < 75) {
    status = 'warning';
  }

  return {
    status,
    issues,
    score: Math.max(0, score),
  };
}

export function getHealthColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-emerald-500';
    case 'warning':
      return 'text-amber-500';
    case 'critical':
      return 'text-red-500';
  }
}

export function getHealthBadgeClass(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    case 'warning':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'critical':
      return 'bg-red-500/15 text-red-500 border-red-500/30';
  }
}

export function getHealthLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
  }
}
