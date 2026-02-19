'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sun, Loader2, ChevronDown, ChevronUp, Trophy, Code2, Briefcase, ListTodo, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Brief {
  date: string;
  summary: { tasksTotal: number; tasksDone: number; tasksThisWeek: number; inProgress: number; backlogCount: number };
  upcomingDeadlines: { title: string; daysUntil: number; category: string }[];
  applications: {
    total: number; notApplied: number; applied: number; inInterview: number;
    upcomingInterviews: { company: string; daysUntil: number }[];
    urgentCompanies: string[];
  };
  lc: { solvedThisWeek: number; weekGoal: number; weekProgress: number; totalSolved: number };
  todayGoals: { total: number; done: number; items: { text: string; done: boolean }[] };
  pinnedNotes: { title: string; preview: string }[];
  highPriorityBacklog: { title: string; category: string; dueDate: string | null }[];
}

export function MorningBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/brief');
      setBrief(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return (
    <Card>
      <CardContent className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );

  if (!brief) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            {greeting}, Ivan
          </CardTitle>
          <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">{brief.date}</p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card/80 rounded-lg p-2.5 border border-border/30">
              <div className="flex items-center gap-1.5 mb-1">
                <ListTodo className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Tasks</span>
              </div>
              <p className="text-sm font-bold">{brief.summary.tasksDone} <span className="text-muted-foreground font-normal text-xs">/ {brief.summary.tasksTotal} done</span></p>
              <p className="text-[10px] text-emerald-500">+{brief.summary.tasksThisWeek} this week</p>
            </div>
            <div className="bg-card/80 rounded-lg p-2.5 border border-border/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Code2 className="h-3 w-3 text-violet-500" />
                <span className="text-[10px] text-muted-foreground">LeetCode</span>
              </div>
              <p className="text-sm font-bold">{brief.lc.solvedThisWeek} <span className="text-muted-foreground font-normal text-xs">/ {brief.lc.weekGoal} this week</span></p>
              <div className="w-full bg-muted/50 rounded-full h-1 mt-1">
                <div
                  className="bg-violet-500 h-1 rounded-full transition-all"
                  style={{ width: `${Math.min(brief.lc.weekProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Applications urgent */}
          {brief.applications.urgentCompanies.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Briefcase className="h-3 w-3 text-red-400" />
                <span className="text-[11px] font-medium text-red-400">Haven&apos;t applied yet ({brief.applications.urgentCompanies.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {brief.applications.urgentCompanies.slice(0, 6).map(c => (
                  <Badge key={c} variant="outline" className="text-[10px] border-red-500/30 text-red-400 px-1.5 py-0">
                    {c}
                  </Badge>
                ))}
                {brief.applications.urgentCompanies.length > 6 && (
                  <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 px-1.5 py-0">
                    +{brief.applications.urgentCompanies.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Upcoming interviews */}
          {brief.applications.upcomingInterviews.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy className="h-3 w-3 text-blue-400" />
                <span className="text-[11px] font-medium text-blue-400">Upcoming interviews</span>
              </div>
              {brief.applications.upcomingInterviews.map(i => (
                <div key={i.company} className="flex justify-between text-xs">
                  <span className="text-foreground">{i.company}</span>
                  <span className="text-blue-400">{i.daysUntil === 0 ? 'Today!' : `in ${i.daysUntil}d`}</span>
                </div>
              ))}
            </div>
          )}

          {/* Today's goals */}
          {brief.todayGoals.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="text-[11px] text-muted-foreground">Today&apos;s goals</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{brief.todayGoals.done}/{brief.todayGoals.total}</span>
              </div>
              {brief.todayGoals.items.slice(0, 3).map((g, i) => (
                <div key={i} className={cn('flex items-center gap-1.5 text-xs', g.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', g.done ? 'bg-emerald-500' : 'bg-primary/50')} />
                  {g.text}
                </div>
              ))}
            </div>
          )}

          {/* Upcoming deadlines (compact) */}
          {brief.upcomingDeadlines.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Deadlines</p>
              {brief.upcomingDeadlines.slice(0, 3).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate max-w-44" title={d.title}>{d.title}</span>
                  <Badge variant="outline" className={cn(
                    'text-[9px] px-1 py-0 ml-1 shrink-0',
                    d.daysUntil <= 3 ? 'border-red-500/40 text-red-400' :
                    d.daysUntil <= 7 ? 'border-yellow-500/40 text-yellow-400' : 'border-border/50'
                  )}>
                    {d.daysUntil === 0 ? 'Today' : `${d.daysUntil}d`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
