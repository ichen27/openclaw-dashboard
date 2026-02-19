'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, CheckCircle, AlertCircle, FileText, RefreshCw, Radio, Heart, Cpu } from 'lucide-react';

interface ActivityEntry {
  agent: string;
  timestamp: string;
  text: string;
  type: 'task' | 'event' | 'session' | 'heartbeat' | 'note';
  source: 'memory' | 'session' | 'heartbeat';
}

const AGENT_COLORS: Record<string, string> = {
  'agent-1': 'bg-emerald-500',
  'agent-2': 'bg-blue-500',
  'agent-3': 'bg-violet-500',
  'agent-4': 'bg-amber-500',
};

const AGENT_BADGE: Record<string, string> = {
  'agent-1': 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  'agent-2': 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  'agent-3': 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  'agent-4': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
};

const TYPE_ICONS = {
  task: CheckCircle,
  event: AlertCircle,
  session: Cpu,
  heartbeat: Heart,
  note: FileText,
};

const SOURCE_LABEL: Record<string, { text: string; class: string }> = {
  session: { text: 'LIVE', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  heartbeat: { text: 'FOCUS', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  memory: { text: '', class: '' },
};

export function ActivityTimeline() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = () => {
    fetch('/api/agents/activity')
      .then(r => r.json())
      .then((data: ActivityEntry[]) => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const liveCount = entries.filter(e => e.source === 'session').length;

  return (
    <Card className="bg-card/60 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Activity Feed
            {liveCount > 0 && (
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 gap-1">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                {liveCount} live
              </Badge>
            )}
          </CardTitle>
          <button
            onClick={fetchActivity}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Loading activity...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No recent activity found.
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => {
                const Icon = TYPE_ICONS[entry.type] || FileText;
                const sourceLabel = SOURCE_LABEL[entry.source];
                return (
                  <div key={i} className={`flex gap-3 group ${entry.source === 'session' ? 'bg-emerald-500/5 rounded-lg p-2 -mx-2' : ''}`}>
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-2 ${AGENT_COLORS[entry.agent] || 'bg-neutral-500'} ${entry.source === 'session' ? 'animate-pulse' : ''}`} />
                      {i < entries.length - 1 && (
                        <div className="w-px flex-1 bg-border/50 mt-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${AGENT_BADGE[entry.agent] || ''}`}
                        >
                          {entry.agent}
                        </Badge>
                        {sourceLabel?.text && (
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${sourceLabel.class}`}>
                            {sourceLabel.text}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {entry.timestamp}
                        </span>
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {entry.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
