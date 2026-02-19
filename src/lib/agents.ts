import fs from 'fs';
import path from 'path';
import { estimateCost, type SessionCost } from './costs';

const CONFIG_PATHS = [
  '/Users/chenagent/.openclaw/openclaw.json',
  '/Users/chenagent/.openclaw-agent-2/openclaw.json',
  '/Users/chenagent/.openclaw-agent-3/openclaw.json',
  '/Users/chenagent/.openclaw-agent-4/openclaw.json',
];

const SESSION_PATHS = [
  '/Users/chenagent/.openclaw/agents/{agentId}/sessions/sessions.json',
  '/Users/chenagent/.openclaw-agent-2/agents/{agentId}/sessions/sessions.json',
  '/Users/chenagent/.openclaw-agent-3/agents/{agentId}/sessions/sessions.json',
  '/Users/chenagent/.openclaw-agent-4/agents/{agentId}/sessions/sessions.json',
];

const THIRTY_MINUTES = 30 * 60 * 1000;

export interface AgentSession {
  key: string;
  totalTokens: number;
  contextTokens: number;
  model: string;
  updatedAt: number;
  lastChannel: string;
  isSubAgent: boolean;
  cost: SessionCost;
}

export interface AgentStatus {
  id: string;
  name: string;
  model: string;
  workspace: string;
  skills: string[];
  contextTokens: number;
  isDefault: boolean;
  subagentConfig?: { allowAgents?: string[]; model?: string; maxConcurrent?: number };
  sessions: AgentSession[];
  totalSessions: number;
  activeSessions: number;
  lastActive: number | null;
  status: 'active' | 'idle' | 'never';
}

interface RawAgentConfig {
  id: string;
  name: string;
  default?: boolean;
  model?: string | { primary: string };
  workspace?: string;
  skills?: string[];
  contextTokens?: number;
  subagents?: {
    allowAgents?: string[];
    model?: string;
    maxConcurrent?: number;
  };
}

interface RawDefaults {
  model?: { primary: string };
  workspace?: string;
  contextTokens?: number;
  subagents?: { maxConcurrent?: number; model?: string };
}

interface RawSessionEntry {
  totalTokens?: number;
  contextTokens?: number;
  model?: string;
  modelOverride?: string;
  updatedAt?: number;
  lastChannel?: string;
  inputTokens?: number;
  outputTokens?: number;
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function resolveModel(agentModel: string | { primary: string } | undefined, defaults: RawDefaults): string {
  if (!agentModel) {
    return defaults.model?.primary ?? 'unknown';
  }
  if (typeof agentModel === 'string') return agentModel;
  return agentModel.primary;
}

function getSessionsForAgent(agentId: string): Record<string, RawSessionEntry> {
  const allSessions: Record<string, RawSessionEntry> = {};

  for (const pattern of SESSION_PATHS) {
    const filePath = pattern.replace('{agentId}', agentId);
    const data = readJsonSafe<Record<string, RawSessionEntry>>(filePath);
    if (data) {
      Object.assign(allSessions, data);
    }
  }

  return allSessions;
}

export function getAllAgents(): AgentStatus[] {
  const allAgents: AgentStatus[] = [];
  const now = Date.now();

  // Read agents from all OpenClaw instances
  for (const configPath of CONFIG_PATHS) {
    const config = readJsonSafe<{
      agents: { defaults: RawDefaults; list: RawAgentConfig[] };
    }>(configPath);

    if (!config?.agents?.list) continue;

    const defaults = config.agents.defaults;

    const instanceAgents = config.agents.list.map((agent): AgentStatus => {
      const model = resolveModel(agent.model, defaults);
      const contextTokens = agent.contextTokens ?? defaults.contextTokens ?? 75000;
      const skills = agent.skills ?? [];

      // Get sessions for this agent
      const rawSessions = getSessionsForAgent(agent.id);

      const sessions: AgentSession[] = Object.entries(rawSessions).map(([key, session]) => {
        const sessionModel = session.modelOverride ?? session.model ?? model;
        const totalTokens = session.totalTokens ?? ((session.inputTokens ?? 0) + (session.outputTokens ?? 0));
        const sessionContextTokens = session.contextTokens ?? contextTokens;

        return {
          key,
          totalTokens,
          contextTokens: sessionContextTokens,
          model: sessionModel,
          updatedAt: session.updatedAt ?? 0,
          lastChannel: session.lastChannel ?? 'unknown',
          isSubAgent: key.includes(':subagent:'),
          cost: estimateCost(sessionModel, totalTokens),
        };
      });

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => (now - s.updatedAt) < THIRTY_MINUTES).length;
      const lastActive = sessions.length > 0
        ? Math.max(...sessions.map(s => s.updatedAt))
        : null;

      let status: 'active' | 'idle' | 'never' = 'never';
      if (activeSessions > 0) status = 'active';
      else if (totalSessions > 0) status = 'idle';

      return {
        id: agent.id,
        name: agent.name,
        model,
        workspace: agent.workspace ?? defaults.workspace ?? '',
        skills,
        contextTokens,
        isDefault: agent.default ?? false,
        subagentConfig: agent.subagents,
        sessions,
        totalSessions,
        activeSessions,
        lastActive,
        status,
      };
    });

    allAgents.push(...instanceAgents);
  }

  // Deduplicate by agent ID — keep the one with most sessions (most active)
  const byId = new Map<string, AgentStatus>();
  for (const agent of allAgents) {
    const existing = byId.get(agent.id);
    if (!existing || agent.totalSessions > existing.totalSessions) {
      byId.set(agent.id, agent);
    }
  }

  return Array.from(byId.values());
}

export function getWatchPaths(): string[] {
  const paths: string[] = [...CONFIG_PATHS];

  // Add all possible session file directories from all configs
  for (const configPath of CONFIG_PATHS) {
    const config = readJsonSafe<{
      agents: { list: { id: string }[] };
    }>(configPath);

    if (config?.agents?.list) {
      for (const agent of config.agents.list) {
        for (const pattern of SESSION_PATHS) {
          const filePath = pattern.replace('{agentId}', agent.id);
          // Watch the directory, not the file
          const dir = path.dirname(filePath);
          if (fs.existsSync(dir)) {
            paths.push(filePath);
          }
        }
      }
    }
  }

  return paths;
}
