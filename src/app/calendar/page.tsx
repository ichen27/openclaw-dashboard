'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Clock,
  Briefcase, AlertTriangle, Trophy, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'task_deadline' | 'interview' | 'offer_deadline' | 'applied';
  title: string;
  subtitle?: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  href: string;
}

interface Application {
  id: string;
  company: string;
  role: string;
  stage: string;
  interviewDate: string | null;
  offerDeadline: string | null;
  appliedAt: string | null;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  category: { name: string; color: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86400000);
}

const SEVERITY_PILL: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const TYPE_DOT: Record<string, string> = {
  task_deadline: 'bg-orange-400',
  interview: 'bg-blue-400',
  offer_deadline: 'bg-violet-400',
  applied: 'bg-emerald-400',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  task_deadline: Clock,
  interview: Calendar,
  offer_deadline: Trophy,
  applied: Briefcase,
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(toYMD(today));

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, tasksRes] = await Promise.all([
        fetch('/api/applications'),
        fetch('/api/tasks'),
      ]);
      const apps: Application[] = await appsRes.json();
      const tasks: Task[] = await tasksRes.json();

      const ev: CalEvent[] = [];
      const now = new Date();

      // --- Application events ---
      for (const app of apps) {
        if (app.interviewDate) {
          const d = daysBetween(now, parseDate(app.interviewDate));
          ev.push({
            id: `int-${app.id}`,
            date: app.interviewDate.split('T')[0],
            type: 'interview',
            title: `Interview: ${app.company}`,
            subtitle: app.role,
            severity: d < 0 ? 'warning' : d <= 2 ? 'critical' : 'info',
            href: '/apply',
          });
        }
        if (app.offerDeadline) {
          const d = daysBetween(now, parseDate(app.offerDeadline));
          ev.push({
            id: `off-${app.id}`,
            date: app.offerDeadline.split('T')[0],
            type: 'offer_deadline',
            title: `Offer: ${app.company}`,
            subtitle: 'Deadline',
            severity: d < 0 ? 'warning' : d <= 3 ? 'critical' : 'warning',
            href: '/apply',
          });
        }
        if (app.appliedAt && app.stage !== 'not_applied') {
          ev.push({
            id: `app-${app.id}`,
            date: app.appliedAt.split('T')[0],
            type: 'applied',
            title: `Applied: ${app.company}`,
            subtitle: app.role,
            severity: 'success',
            href: '/apply',
          });
        }
      }

      // --- Task deadlines ---
      for (const task of tasks) {
        if (!task.dueDate) continue;
        if (task.status === 'done') continue;
        const d = daysBetween(now, parseDate(task.dueDate.split('T')[0]));
        ev.push({
          id: `task-${task.id}`,
          date: task.dueDate.split('T')[0],
          type: 'task_deadline',
          title: task.title.length > 40 ? task.title.slice(0, 37) + '…' : task.title,
          subtitle: task.category.name,
          severity: d < 0 ? 'critical' : d <= 3 ? 'critical' : 'warning',
          href: '/',
        });
      }

      setEvents(ev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const eventsForDay = (dateStr: string) => events.filter(e => e.date === dateStr);
  const upcomingEvents = events
    .filter(e => {
      const d = parseDate(e.date);
      return d >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12);

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground">Interview dates, deadlines & applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { type: 'interview', label: 'Interview' },
          { type: 'offer_deadline', label: 'Offer Deadline' },
          { type: 'applied', label: 'Applied' },
          { type: 'task_deadline', label: 'Task Deadline' },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('w-2 h-2 rounded-full', TYPE_DOT[type])} />
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {MONTHS[month]} {year}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                    setYear(today.getFullYear());
                    setMonth(today.getMonth());
                    setSelectedDay(toYMD(today));
                  }}>
                    Today
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] text-muted-foreground font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Offset cells */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`off-${i}`} className="h-16 rounded-md" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = eventsForDay(dateStr);
                  const isToday = dateStr === toYMD(today);
                  const isSelected = dateStr === selectedDay;
                  const hasCritical = dayEvents.some(e => e.severity === 'critical');

                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                      className={cn(
                        'h-16 p-1 rounded-md text-left transition-colors border',
                        isSelected
                          ? 'bg-primary/20 border-primary/50'
                          : isToday
                          ? 'bg-primary/10 border-primary/30'
                          : 'border-transparent hover:bg-muted/50 hover:border-border/40',
                        hasCritical && !isSelected && 'ring-1 ring-red-500/40'
                      )}
                    >
                      <div className={cn(
                        'text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full',
                        isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                      )}>
                        {dayNum}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 3).map(e => (
                          <span
                            key={e.id}
                            className={cn('w-1.5 h-1.5 rounded-full', TYPE_DOT[e.type])}
                            title={e.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5">
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">
                            {dayEvents[0].title.split(':').pop()?.trim()}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {selectedDay && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map(e => {
                      const Icon = TYPE_ICON[e.type];
                      return (
                        <Link key={e.id} href={e.href} className={cn(
                          'flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors',
                          SEVERITY_PILL[e.severity]
                        )}>
                          <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{e.title}</p>
                            {e.subtitle && <p className="text-xs opacity-70 mt-0.5">{e.subtitle}</p>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Upcoming */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                upcomingEvents.map(e => {
                  const Icon = TYPE_ICON[e.type];
                  const d = daysBetween(today, parseDate(e.date));
                  return (
                    <Link key={e.id} href={e.href} className={cn(
                      'flex items-start gap-2.5 p-2 rounded-lg border text-sm transition-colors cursor-pointer',
                      SEVERITY_PILL[e.severity]
                    )}>
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{e.title}</p>
                        {e.subtitle && <p className="text-[10px] opacity-70">{e.subtitle}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 px-1.5 border-current">
                        {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d}d`}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Stats card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[
                { label: 'Total events', val: events.length, color: 'text-foreground' },
                { label: 'Interviews scheduled', val: events.filter(e => e.type === 'interview').length, color: 'text-blue-400' },
                { label: 'Applied', val: events.filter(e => e.type === 'applied').length, color: 'text-emerald-400' },
                { label: 'Task deadlines', val: events.filter(e => e.type === 'task_deadline').length, color: 'text-orange-400' },
                { label: 'Critical alerts', val: events.filter(e => e.severity === 'critical').length, color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn('font-semibold', color)}>{val}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
