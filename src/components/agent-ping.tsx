'use client';

import { useState, useCallback } from 'react';
import { Send, Clock, Zap, CheckCircle2, XCircle, Loader2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  status: string;
  sessions: { key: string; updatedAt?: number }[];
}

interface PingResult {
  success: boolean;
  output?: string;
  error?: string;
  sessionKey?: string;
}

const QUICK_MESSAGES = [
  '👋 Hey, what are you working on?',
  '📋 Please give me a status update on your current tasks.',
  '🔍 Review the dashboard and pick a high-priority task to work on.',
  '⚡ What can I help you with right now?',
  '📊 Run a quick check — any blockers or issues to report?',
];

export function AgentPing({ agents }: { agents: Agent[] }) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [message, setMessage] = useState('');
  const [delay, setDelay] = useState(0); // seconds
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);
  const [scheduled, setScheduled] = useState<{ label: string; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

  const activeAgents = agents.filter(a => a.sessions.length > 0);

  const getLatestSession = (agent: Agent) => {
    return [...agent.sessions].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]?.key ?? null;
  };

  const doSend = useCallback(async (agent: Agent, msg: string) => {
    const sessionKey = getLatestSession(agent);
    if (!sessionKey) {
      setResult({ success: false, error: 'No active session for this agent' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/agents/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey, message: msg }),
      });
      const data = await res.json();
      setResult(data.success
        ? { success: true, output: data.output, sessionKey }
        : { success: false, error: data.error }
      );
    } catch (e) {
      setResult({ success: false, error: String(e) });
    } finally {
      setSending(false);
    }
  }, []);

  const sendNow = useCallback(() => {
    if (!selectedAgent || !message.trim()) return;
    doSend(selectedAgent, message.trim());
  }, [selectedAgent, message, doSend]);

  const schedulePin = useCallback(() => {
    if (!selectedAgent || !message.trim() || delay <= 0) return;
    const agent = selectedAgent;
    const msg = message.trim();
    const label = delay < 60
      ? `${delay}s`
      : delay < 3600
      ? `${Math.round(delay / 60)}m`
      : `${Math.round(delay / 3600)}h`;

    const timeoutId = setTimeout(() => {
      doSend(agent, msg);
      setScheduled(null);
    }, delay * 1000);

    setScheduled({ label, timeoutId });
  }, [selectedAgent, message, delay, doSend]);

  const cancelScheduled = useCallback(() => {
    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      setScheduled(null);
    }
  }, [scheduled]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Ping Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Agent selector */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Select agent</p>
          <div className="flex flex-wrap gap-1.5">
            {activeAgents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No agents with active sessions</p>
            ) : (
              activeAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => { setSelectedAgent(agent); setResult(null); }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                    selectedAgent?.id === agent.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5',
                    agent.status === 'active' ? 'bg-emerald-500' : 'bg-yellow-500'
                  )} />
                  {agent.id}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Quick messages */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Quick messages</p>
          <div className="flex flex-wrap gap-1">
            {QUICK_MESSAGES.map((qm, i) => (
              <button
                key={i}
                onClick={() => setMessage(qm)}
                className="text-[10px] px-2 py-1 rounded border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors text-left"
              >
                {qm.slice(0, 30)}…
              </button>
            ))}
          </div>
        </div>

        {/* Message textarea */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Message</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Type a message to send to the agent..."
            className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none transition-colors"
          />
        </div>

        {/* Delay / timer */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Delay (optional)</p>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Now', val: 0 },
              { label: '5m', val: 300 },
              { label: '15m', val: 900 },
              { label: '30m', val: 1800 },
              { label: '1h', val: 3600 },
              { label: '2h', val: 7200 },
            ].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setDelay(val)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                  delay === val
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduled indicator */}
        {scheduled && (
          <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Ping scheduled in {scheduled.label}</span>
            </div>
            <button onClick={cancelScheduled} className="text-xs text-yellow-400 hover:text-yellow-300 underline">
              Cancel
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={cn(
            'flex items-start gap-2 rounded-lg px-3 py-2 text-xs',
            result.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          )}>
            {result.success
              ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              : <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            }
            <span>{result.success ? `Sent to session ${result.sessionKey?.slice(-8)}` : result.error}</span>
          </div>
        )}

        {/* Send button */}
        <div className="flex gap-2">
          {delay === 0 ? (
            <Button
              onClick={sendNow}
              disabled={!selectedAgent || !message.trim() || sending}
              className="flex-1 gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send Now'}
            </Button>
          ) : (
            <Button
              onClick={schedulePin}
              disabled={!selectedAgent || !message.trim() || !!scheduled}
              className="flex-1 gap-2"
            >
              <Clock className="h-4 w-4" />
              {scheduled ? 'Scheduled' : `Schedule (${['5m','15m','30m','1h','2h'][([300,900,1800,3600,7200].indexOf(delay))] ?? delay + 's'})`}
            </Button>
          )}
          {delay > 0 && (
            <Button variant="outline" onClick={sendNow} disabled={!selectedAgent || !message.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
