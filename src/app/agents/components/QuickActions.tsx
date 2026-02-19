'use client';

import { useState, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  Terminal,
  Trash2,
  Gauge,
} from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  model: string;
  contextTokens: number;
  skills: string[];
}

interface QuickActionsProps {
  instanceId: string;
}

type ActionResult = {
  success: boolean;
  output: string;
} | null;

export function QuickActions({ instanceId }: QuickActionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult>(null);
  const [contextTokensInput, setContextTokensInput] = useState<Record<string, string>>({});

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/actions?instance=${instanceId}`);
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
        // Pre-populate context token inputs
        const inputs: Record<string, string> = {};
        data.agents.forEach((a: AgentConfig) => {
          inputs[a.id] = String(a.contextTokens || '');
        });
        setContextTokensInput(inputs);
      }
    } catch (e) {
      console.error('Failed to load config', e);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  const runAction = async (action: string, agentId?: string, value?: string) => {
    setActionLoading(action + (agentId || ''));
    setResult(null);
    try {
      const res = await fetch('/api/agents/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, instance: instanceId, agentId, value }),
      });
      const data = await res.json();
      setResult({ success: data.success ?? !data.error, output: data.output || data.error || 'Done' });
      if (action === 'update-context-tokens' && data.success) {
        await loadConfig(); // Refresh
      }
    } catch (e: any) {
      setResult({ success: false, output: e.message });
    } finally {
      setActionLoading(null);
      // Clear result after 5s
      setTimeout(() => setResult(null), 5000);
    }
  };

  const toggle = () => {
    if (!expanded) loadConfig();
    setExpanded(!expanded);
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
      >
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-medium">Quick Actions</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/50 p-3 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading config...
            </div>
          ) : (
            <>
              {/* Gateway actions */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Gateway</span>
                <div className="flex gap-2">
                  <ActionButton
                    icon={<Activity className="h-3 w-3" />}
                    label="Status"
                    loading={actionLoading === 'gateway-status'}
                    onClick={() => runAction('gateway-status')}
                  />
                  <ActionButton
                    icon={<RefreshCw className="h-3 w-3" />}
                    label="Restart"
                    loading={actionLoading === 'gateway-restart'}
                    onClick={() => runAction('gateway-restart')}
                    variant="warning"
                  />
                </div>
              </div>

              {/* Per-agent actions */}
              {agents.map((agent) => (
                <div key={agent.id} className="space-y-1.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {agent.name || agent.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-3 w-3 text-muted-foreground shrink-0" />
                    <input
                      type="number"
                      value={contextTokensInput[agent.id] || ''}
                      onChange={(e) =>
                        setContextTokensInput((prev) => ({ ...prev, [agent.id]: e.target.value }))
                      }
                      className="w-24 text-xs bg-background border border-border rounded px-2 py-1"
                      min={10000}
                      max={200000}
                      step={5000}
                      title="Context tokens"
                    />
                    <ActionButton
                      icon={<Settings className="h-3 w-3" />}
                      label="Set"
                      loading={actionLoading === `update-context-tokens${agent.id}`}
                      onClick={() =>
                        runAction('update-context-tokens', agent.id, contextTokensInput[agent.id])
                      }
                      small
                    />
                    <ActionButton
                      icon={<Terminal className="h-3 w-3" />}
                      label="Sessions"
                      loading={actionLoading === `clear-sessions${agent.id}`}
                      onClick={() => runAction('clear-sessions', agent.id)}
                      small
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Model: {agent.model} · Skills: {agent.skills.length}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Result display */}
          {result && (
            <div
              className={`flex items-start gap-2 text-xs px-2.5 py-2 rounded-md ${
                result.success
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {result.success ? (
                <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              <pre className="whitespace-pre-wrap break-all font-mono">{result.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  loading,
  onClick,
  variant,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
  variant?: 'warning' | 'danger';
  small?: boolean;
}) {
  const colorClass =
    variant === 'warning'
      ? 'hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30'
      : variant === 'danger'
        ? 'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
        : 'hover:bg-muted hover:border-border';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } border border-border/50 rounded-md text-muted-foreground transition-colors disabled:opacity-50 ${colorClass}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}
