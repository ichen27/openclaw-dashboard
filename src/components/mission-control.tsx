'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Code2, StickyNote, AlertTriangle,
  ChevronRight, Flame, Target, Clock
} from 'lucide-react';

interface MissionData {
  applications: {
    total: number;
    applied: number;
    inProgress: number;
    offers: number;
    urgentDeadlines: { company: string; daysLeft: number }[];
  };
  lc: {
    totalSolved: number;
    thisWeek: number;
    today: number;
  };
  tasks: {
    urgentDue: { title: string; daysLeft: number }[];
  };
  notes: number;
}

export function MissionControl() {
  const [data, setData] = useState<MissionData | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [appsRes, lcRes, tasksRes, notesRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/lc'),
        fetch('/api/tasks?limit=100'),
        fetch('/api/notes'),
      ]);

      const [apps, lcData, tasks, notes] = await Promise.all([
        appsRes.json(),
        lcRes.json(),
        tasksRes.json(),
        notesRes.json(),
      ]);

      const now = Date.now();

      // Application stats
      const applied = apps.filter((a: { stage: string }) =>
        !['not_applied', 'rejected', 'withdrawn'].includes(a.stage)
      );
      const inProgress = apps.filter((a: { stage: string }) =>
        ['phone_screen', 'technical', 'final_round'].includes(a.stage)
      );
      const offers = apps.filter((a: { stage: string }) => a.stage === 'offer');

      // Urgent task deadlines
      const urgentTasks = tasks
        .filter((t: { dueDate: string | null; status: string }) =>
          t.dueDate && t.status !== 'done' && t.status !== 'failed'
        )
        .map((t: { title: string; dueDate: string }) => ({
          title: t.title,
          daysLeft: Math.ceil((new Date(t.dueDate).getTime() - now) / 86400000),
        }))
        .filter((t: { daysLeft: number }) => t.daysLeft <= 14)
        .sort((a: { daysLeft: number }, b: { daysLeft: number }) => a.daysLeft - b.daysLeft)
        .slice(0, 3);

      // Upcoming application deadlines (by task due dates for Apply tasks)
      const applyTasks = tasks
        .filter((t: { title: string; dueDate: string | null; status: string }) =>
          t.title.startsWith('Apply —') && t.dueDate && t.status !== 'done'
        )
        .map((t: { title: string; dueDate: string }) => ({
          company: t.title.replace('Apply — ', '').replace(/ \(.*\)$/, ''),
          daysLeft: Math.ceil((new Date(t.dueDate).getTime() - now) / 86400000),
        }))
        .filter((t: { daysLeft: number }) => t.daysLeft <= 14)
        .sort((a: { daysLeft: number }, b: { daysLeft: number }) => a.daysLeft - b.daysLeft)
        .slice(0, 3);

      setData({
        applications: {
          total: apps.length,
          applied: applied.length,
          inProgress: inProgress.length,
          offers: offers.length,
          urgentDeadlines: applyTasks,
        },
        lc: {
          totalSolved: lcData.stats?.totalSolved ?? 0,
          thisWeek: lcData.stats?.thisWeek ?? 0,
          today: lcData.stats?.today ?? 0,
        },
        tasks: { urgentDue: urgentTasks },
        notes: Array.isArray(notes) ? notes.length : 0,
      });
    }

    load();
  }, []);

  if (!data) return null;

  const WEEK_GOAL = 15;
  const lcPct = Math.min((data.lc.thisWeek / WEEK_GOAL) * 100, 100);
  const allUrgent = [
    ...data.applications.urgentDeadlines,
    ...data.tasks.urgentDue
      .filter(t => !t.title.startsWith('Apply'))
      .map(t => ({ company: t.title.slice(0, 25), daysLeft: t.daysLeft })),
  ].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        Mission Control
      </h3>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2">
        {/* Applications */}
        <button
          onClick={() => router.push('/apply')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
        >
          <Briefcase className="h-4 w-4 text-amber-500" />
          <span className="text-lg font-bold">{data.applications.applied}</span>
          <span className="text-[10px] text-muted-foreground">applied</span>
          {data.applications.inProgress > 0 && (
            <span className="text-[10px] text-blue-400">{data.applications.inProgress} active</span>
          )}
        </button>

        {/* LC */}
        <button
          onClick={() => router.push('/lc')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
        >
          <Code2 className="h-4 w-4 text-violet-500" />
          <span className="text-lg font-bold">{data.lc.thisWeek}</span>
          <span className="text-[10px] text-muted-foreground">this week</span>
          <span className="text-[10px] text-violet-400">{WEEK_GOAL - data.lc.thisWeek} to go</span>
        </button>

        {/* Notes */}
        <button
          onClick={() => router.push('/notes')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
        >
          <StickyNote className="h-4 w-4 text-amber-400" />
          <span className="text-lg font-bold">{data.notes}</span>
          <span className="text-[10px] text-muted-foreground">notes</span>
          <span className="text-[10px] text-muted-foreground/50">scratchpad</span>
        </button>
      </div>

      {/* LC week progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flame className="h-2.5 w-2.5 text-orange-500" />
            LC Week Goal
          </span>
          <span className="font-mono">{data.lc.thisWeek}/{WEEK_GOAL}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${lcPct}%` }}
          />
        </div>
      </div>

      {/* Urgent deadlines */}
      {allUrgent.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
            Upcoming deadlines
          </p>
          {allUrgent.map((item, i) => {
            const urgent = item.daysLeft <= 3;
            const soon = item.daysLeft <= 7;
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground truncate flex-1">
                  {item.company}
                </p>
                <span className={`text-[10px] font-mono font-semibold shrink-0 ${
                  urgent ? 'text-red-500' : soon ? 'text-yellow-500' : 'text-muted-foreground'
                }`}>
                  {item.daysLeft <= 0 ? 'TODAY' : `${item.daysLeft}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="border-t border-border/30 pt-3 space-y-1">
        {[
          { href: '/apply', label: 'Application Pipeline', icon: Briefcase },
          { href: '/lc', label: 'Log a Problem', icon: Code2 },
        ].map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="w-full flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5 group"
          >
            <Icon className="h-2.5 w-2.5 shrink-0" />
            {label}
            <ChevronRight className="h-2.5 w-2.5 ml-auto opacity-0 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}
