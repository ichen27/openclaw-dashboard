'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bell, X, AlertTriangle, Clock, Calendar, Trophy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'deadline' | 'interview' | 'overdue' | 'application_deadline';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  subtitle: string;
  daysUntil: number | null;
  href: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'text-red-500 dark:text-red-400',
  warning: 'text-yellow-500 dark:text-yellow-400',
  info: 'text-blue-500 dark:text-blue-400',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15',
  warning: 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15',
  info: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  deadline: Clock,
  overdue: AlertTriangle,
  interview: Calendar,
  application_deadline: Trophy,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('dismissed_alerts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const dismiss = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('dismissed_alerts', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const ids = visible.map(a => a.id);
    setDismissed(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try { localStorage.setItem('dismissed_alerts', JSON.stringify([...next])); } catch {}
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, dismissed]);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const criticalCount = visible.filter(a => a.severity === 'critical').length;
  const badgeCount = visible.length;

  const badgeColor = criticalCount > 0
    ? 'bg-red-500'
    : badgeCount > 0
    ? 'bg-yellow-500'
    : 'bg-emerald-500';

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          open && 'bg-muted text-foreground'
        )}
        aria-label={`${badgeCount} alerts`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {!loading && badgeCount > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center',
            'w-4 h-4 rounded-full text-[10px] font-bold text-white',
            badgeColor
          )}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
        {!loading && badgeCount === 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute right-0 top-10 z-50 w-80 rounded-lg border border-border',
          'bg-card shadow-lg overflow-hidden'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/80">
            <span className="text-sm font-semibold">Alerts</span>
            <div className="flex items-center gap-2">
              {visible.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dismiss all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">All clear — no alerts!</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {visible.map(alert => {
                  const Icon = TYPE_ICON[alert.type] ?? Clock;
                  return (
                    <Link
                      key={alert.id}
                      href={alert.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-md border transition-colors cursor-pointer',
                        SEVERITY_BG[alert.severity]
                      )}
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', SEVERITY_STYLE[alert.severity])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{alert.subtitle}</p>
                      </div>
                      <button
                        onClick={(e) => dismiss(alert.id, e)}
                        className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground mt-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              {visible.length} alert{visible.length !== 1 ? 's' : ''} · refreshes every 5 min
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
