'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Loader2 } from 'lucide-react';

interface ActiveTool {
  type: 'exec' | 'browser' | 'other';
  sessionId: string;
  pid?: number;
  command?: string;
  status: 'running' | 'waiting';
  startTime?: number;
}

export function ActiveTools() {
  const [tools, setTools] = useState<ActiveTool[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTools = () => {
    fetch('/api/tools/active')
      .then(r => r.json())
      .then((data: ActiveTool[]) => {
        setTools(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTools();
    const interval = setInterval(fetchTools, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (startTime?: number) => {
    if (!startTime) return '?';
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <Card className="bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            Active Tool Calls
            {tools.length > 0 && (
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
                {tools.length} running
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[200px]">
          {loading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Loading...
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No active tool calls
            </div>
          ) : (
            <div className="space-y-2">
              {tools.map((tool, i) => (
                <div 
                  key={i}
                  className="p-2 bg-muted/50 rounded border border-border/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/15 text-blue-400 border-blue-500/30">
                        {tool.type}
                      </Badge>
                      {tool.pid && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          PID {tool.pid}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDuration(tool.startTime)}
                    </span>
                  </div>
                  {tool.command && (
                    <div className="text-[11px] font-mono text-foreground/70 truncate">
                      {tool.command}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
