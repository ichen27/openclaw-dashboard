'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Send, RefreshCw, Loader2, ChevronDown,
  Circle, Wifi, WifiOff, Bot, User, Monitor, Zap, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  agent: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  source?: 'gateway' | 'dashboard' | 'inter-agent';
}

interface AgentStatus {
  id: string;
  online: boolean;
  model?: string;
  channel?: string;
  tokens?: number;
}

const AGENT_STYLES: Record<string, { color: string; bg: string; ring: string; label: string; initials: string }> = {
  'agent-1': { color: 'text-blue-400', bg: 'bg-blue-500', ring: 'ring-blue-500/30', label: 'Agent 1', initials: 'A1' },
  'agent-2': { color: 'text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', label: 'Agent 2', initials: 'A2' },
  'agent-3': { color: 'text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-500/30', label: 'Agent 3', initials: 'A3' },
  'agent-4': { color: 'text-rose-400', bg: 'bg-rose-500', ring: 'ring-rose-500/30', label: 'Agent 4', initials: 'A4' },
};

function getAgentStyle(id: string) {
  return AGENT_STYLES[id] ?? { color: 'text-slate-400', bg: 'bg-slate-500', ring: 'ring-slate-500/30', label: id, initials: id.slice(0, 2).toUpperCase() };
}

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (d.toDateString() === now.toDateString()) return time;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
}

function shouldShowTimestamp(msgs: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const prev = msgs[index - 1];
  const curr = msgs[index];
  return curr.timestamp - prev.timestamp > 5 * 60 * 1000; // 5 min gap
}

function shouldShowAgent(msgs: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const prev = msgs[index - 1];
  const curr = msgs[index];
  return prev.agent !== curr.agent || prev.role !== curr.role || curr.timestamp - prev.timestamp > 2 * 60 * 1000;
}

/* ── Agent sidebar item ── */
function AgentItem({ agent, selected, onClick }: {
  agent: AgentStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const style = getAgentStyle(agent.id);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
        selected
          ? 'bg-muted/80 shadow-sm'
          : 'hover:bg-muted/40',
      )}
    >
      <div className="relative">
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2', style.bg, style.ring)}>
          {style.initials}
        </div>
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
          agent.online ? 'bg-emerald-500' : 'bg-muted-foreground/30',
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{style.label}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {agent.online ? (agent.model ?? 'online') : 'offline'}
        </div>
      </div>
    </button>
  );
}

/* ── Chat bubble ── */
function ChatBubble({ msg, showAgent, showTimestamp, messages, index }: {
  msg: ChatMessage;
  showAgent: boolean;
  showTimestamp: boolean;
  messages: ChatMessage[];
  index: number;
}) {
  const isUser = msg.role === 'user';
  const isInterAgent = msg.source === 'inter-agent';
  const style = getAgentStyle(msg.agent);

  // Filter out system/heartbeat noise from display
  const content = msg.content
    .replace(/^Read HEARTBEAT\.md.*$/m, '')
    .replace(/^Current time:.*$/m, '')
    .replace(/^System: \[\d{4}-\d{2}-\d{2}.*?\] Compacted.*$/m, '')
    .trim();

  if (!content) return null;

  return (
    <>
      {showTimestamp && (
        <div className="flex justify-center my-4">
          <span className="text-[10px] text-muted-foreground/50 bg-muted/30 px-3 py-1 rounded-full">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      )}
      <div className={cn('flex gap-2.5 max-w-[85%]', isUser && !isInterAgent ? 'ml-auto flex-row-reverse' : '')}>
        {/* Avatar */}
        {showAgent && !isUser ? (
          <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-1', style.bg)}>
            {style.initials}
          </div>
        ) : isInterAgent ? (
          <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 bg-violet-500/20 ring-2 ring-violet-500/30">
            <ArrowLeftRight className="h-3.5 w-3.5 text-violet-400" />
          </div>
        ) : !isUser ? (
          <div className="w-7 shrink-0" />
        ) : null}

        <div className="space-y-0.5">
          {/* Agent label / inter-agent badge */}
          {isInterAgent && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowLeftRight className="h-2.5 w-2.5" />
                Inter-agent
              </span>
              <span className="text-[10px] text-muted-foreground/40">to {style.label}</span>
            </div>
          )}
          {showAgent && !isUser && !isInterAgent && (
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn('text-xs font-semibold', style.color)}>{style.label}</span>
              {msg.model && <span className="text-[10px] text-muted-foreground/40">{msg.model}</span>}
            </div>
          )}

          {/* Bubble */}
          <div className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isInterAgent
              ? 'bg-violet-500/10 text-foreground rounded-bl-md border border-violet-500/20'
              : isUser
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/60 text-foreground rounded-bl-md',
          )}>
            {content}
          </div>

          {/* Timestamp */}
          <div className="text-[10px] text-muted-foreground/30 px-1">
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Chat Page ── */
export default function ChatPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottomRef.current) {
      const el = chatContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  // Refs to avoid re-creating callbacks
  const selectedAgentRef = useRef(selectedAgent);
  selectedAgentRef.current = selectedAgent;

  // Fetch agent statuses (only update if changed)
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/chat?status=true');
      const data = await res.json();
      const newAgents = data.agents ?? [];
      setAgents(prev => {
        const prevJson = JSON.stringify(prev);
        const newJson = JSON.stringify(newAgents);
        return prevJson === newJson ? prev : newAgents;
      });
    } catch {}
  }, []);

  // Fetch messages (only update if changed, no flicker)
  const fetchMessages = useCallback(async (agent?: string | null, isInitial = false) => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (agent) params.set('agent', agent);
      const res = await fetch(`/api/chat?${params}`);
      const data = await res.json();
      const newMsgs: ChatMessage[] = data.messages ?? [];
      setMessages(prev => {
        // Compare by IDs + length to avoid unnecessary re-renders
        if (prev.length === newMsgs.length && prev.every((m, i) => m.id === newMsgs[i]?.id)) {
          return prev; // No change — skip re-render entirely
        }
        // Only scroll if new messages arrived (not on initial load flicker)
        const hasNewMessages = newMsgs.length > prev.length;
        if (isInitial || hasNewMessages) {
          requestAnimationFrame(() => scrollToBottom());
        }
        return newMsgs;
      });
    } catch {}
  }, [scrollToBottom]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchStatuses();
      await fetchMessages(selectedAgent, true);
      setLoading(false);
    };
    load();
  }, [selectedAgent, fetchStatuses, fetchMessages]);

  // Auto-refresh — uses ref to avoid re-creating interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMessages(selectedAgentRef.current);
      fetchStatuses();
    }, 15000); // every 15s
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMessages, fetchStatuses]);

  // Broadcast targets (for "All Agents" view)
  const [broadcastTargets, setBroadcastTargets] = useState<Set<string>>(new Set());

  const toggleBroadcastTarget = (id: string) => {
    setBroadcastTargets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnline = () => {
    setBroadcastTargets(new Set(agents.filter(a => a.online).map(a => a.id)));
  };

  // Send message to one agent or broadcast to multiple
  const handleSend = async () => {
    if (!compose.trim()) return;

    const targets = selectedAgent
      ? [selectedAgent]
      : Array.from(broadcastTargets);

    if (targets.length === 0) return;

    setSending(true);
    try {
      await Promise.all(
        targets.map(agent =>
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent, message: compose.trim() }),
          })
        )
      );
      // Optimistically add user messages
      const now = Date.now();
      setMessages(prev => [
        ...prev,
        ...targets.map((agent, i) => ({
          id: `local-${now}-${i}`,
          agent,
          role: 'user' as const,
          content: compose.trim(),
          timestamp: now + i,
        })),
      ]);
      setCompose('');
      scrollToBottom(true);
      setTimeout(() => fetchMessages(selectedAgentRef.current), 2000);
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    // Extra content cleanup
    const c = m.content.trim();
    if (!c) return false;
    if (c === 'HEARTBEAT_OK' || c === 'NO_REPLY') return false;
    if (c.startsWith('Read HEARTBEAT.md')) return false;
    return true;
  });

  const onlineCount = agents.filter(a => a.online).length;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border/40 bg-card/30 flex flex-col shrink-0">
        {/* Sidebar header */}
        <div className="p-4 border-b border-border/30">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            Chat Mirror
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {onlineCount} of {agents.length} agents online
          </p>
        </div>

        {/* All chats button */}
        <div className="p-2">
          <button
            onClick={() => setSelectedAgent(null)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
              selectedAgent === null ? 'bg-muted/80 shadow-sm' : 'hover:bg-muted/40',
            )}
          >
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">All Agents</div>
              <div className="text-[10px] text-muted-foreground">Combined feed</div>
            </div>
          </button>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {agents.map(agent => (
            <AgentItem
              key={agent.id}
              agent={agent}
              selected={selectedAgent === agent.id}
              onClick={() => setSelectedAgent(agent.id)}
            />
          ))}
        </div>

        {/* Auto-refresh toggle */}
        <div className="p-3 border-t border-border/30">
          <button
            onClick={() => setAutoRefresh(r => !r)}
            className={cn(
              'flex items-center gap-2 text-xs w-full px-3 py-2 rounded-lg transition-all',
              autoRefresh
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-muted-foreground hover:bg-muted/40',
            )}
          >
            <Zap className={cn('h-3 w-3', autoRefresh && 'animate-pulse')} />
            Auto-refresh {autoRefresh ? 'on' : 'off'}
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-14 border-b border-border/40 px-4 flex items-center gap-3 shrink-0 bg-card/30">
          {selectedAgent ? (
            <>
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white', getAgentStyle(selectedAgent).bg)}>
                {getAgentStyle(selectedAgent).initials}
              </div>
              <div>
                <div className="text-sm font-semibold">{getAgentStyle(selectedAgent).label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {agents.find(a => a.id === selectedAgent)?.online ? (
                    <span className="text-emerald-400 flex items-center gap-1"><Circle className="h-1.5 w-1.5 fill-current" /> Online</span>
                  ) : (
                    <span className="text-muted-foreground/50">Offline</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">All Agents</div>
                <div className="text-[10px] text-muted-foreground">{filteredMessages.length} messages</div>
              </div>
            </>
          )}
          <button
            onClick={() => { fetchMessages(selectedAgent); fetchStatuses(); }}
            className="ml-auto p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full transition-all active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-muted-foreground/20" />
              </div>
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/40 mt-1">
                {selectedAgent ? 'Select an agent and send a message' : 'Messages from all agents will appear here'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg, i) => (
              <ChatBubble
                key={msg.id}
                msg={msg}
                showAgent={shouldShowAgent(filteredMessages, i)}
                showTimestamp={shouldShowTimestamp(filteredMessages, i)}
                messages={filteredMessages}
                index={i}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom indicator */}
        {!isAtBottom && filteredMessages.length > 0 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => scrollToBottom(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-card border border-border/60 rounded-full shadow-lg text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronDown className="h-3 w-3" />
              New messages
            </button>
          </div>
        )}

        {/* Compose */}
        {selectedAgent && (
          <div className="p-4 border-t border-border/40 bg-card/30">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
                    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${getAgentStyle(selectedAgent).label}...`}
                  className="w-full bg-muted/40 border border-border/40 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all pr-12"
                />
                <button
                  onClick={handleSend}
                  disabled={!compose.trim() || sending}
                  className={cn(
                    'absolute right-2 bottom-1.5 p-1.5 rounded-full transition-all',
                    compose.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                      : 'text-muted-foreground/30',
                  )}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-1.5 px-1">
              Enter to send · Shift+Enter for new line · Messages sent via system event
            </p>
          </div>
        )}

        {/* Broadcast compose (All Agents view) */}
        {!selectedAgent && (
          <div className="p-4 border-t border-border/40 bg-card/30 space-y-2">
            {/* Agent target chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground/60 mr-1">Send to:</span>
              {agents.map(agent => {
                const style = getAgentStyle(agent.id);
                const selected = broadcastTargets.has(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleBroadcastTarget(agent.id)}
                    disabled={!agent.online}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                      selected
                        ? `${style.bg} text-white border-transparent shadow-sm`
                        : agent.online
                          ? 'bg-muted/40 text-muted-foreground border-border/40 hover:border-border/60 hover:bg-muted/60'
                          : 'bg-muted/20 text-muted-foreground/30 border-border/20 cursor-not-allowed',
                    )}
                  >
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      selected ? 'bg-white/80' : agent.online ? style.bg : 'bg-muted-foreground/20',
                    )} />
                    {style.label}
                  </button>
                );
              })}
              <button
                onClick={selectAllOnline}
                className="text-[10px] text-primary/60 hover:text-primary ml-1 transition-colors"
              >
                All online
              </button>
            </div>
            {/* Compose bar */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder={
                    broadcastTargets.size === 0
                      ? 'Select agents above to message...'
                      : `Broadcast to ${broadcastTargets.size} agent${broadcastTargets.size > 1 ? 's' : ''}...`
                  }
                  disabled={broadcastTargets.size === 0}
                  className="w-full bg-muted/40 border border-border/40 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all pr-12 disabled:opacity-40"
                />
                <button
                  onClick={handleSend}
                  disabled={!compose.trim() || sending || broadcastTargets.size === 0}
                  className={cn(
                    'absolute right-2 bottom-1.5 p-1.5 rounded-full transition-all',
                    compose.trim() && broadcastTargets.size > 0
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                      : 'text-muted-foreground/30',
                  )}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/40 px-1">
              Enter to send · Select agents to broadcast · Messages sent as system events
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
