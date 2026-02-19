import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface Alert {
  id: string;
  type: 'deadline' | 'interview' | 'overdue' | 'application_deadline';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  subtitle: string;
  daysUntil: number | null;
  href: string;
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const alerts: Alert[] = [];

  // --- Task deadlines ---
  const tasksWithDeadlines = await prisma.task.findMany({
    where: {
      dueDate: { not: null, lte: in14Days },
      status: { in: ['backlog', 'in_progress', 'review'] },
    },
    include: { category: true },
    orderBy: { dueDate: 'asc' },
  });

  for (const task of tasksWithDeadlines) {
    if (!task.dueDate) continue;
    const days = daysBetween(now, new Date(task.dueDate));
    const isOverdue = days < 0;
    alerts.push({
      id: `task-${task.id}`,
      type: isOverdue ? 'overdue' : 'deadline',
      severity: isOverdue ? 'critical' : days <= 3 ? 'critical' : 'warning',
      title: task.title.length > 50 ? task.title.slice(0, 47) + '…' : task.title,
      subtitle: isOverdue
        ? `Overdue by ${Math.abs(days)}d · ${task.category.name}`
        : `Due in ${days}d · ${task.category.name}`,
      daysUntil: days,
      href: '/',
    });
  }

  // --- Application deadlines (interviewDate / offerDeadline) ---
  const apps = await prisma.application.findMany({
    where: {
      OR: [
        { interviewDate: { not: null, lte: in14Days } },
        { offerDeadline: { not: null, lte: in14Days } },
      ],
    },
    orderBy: { company: 'asc' },
  });

  for (const app of apps) {
    if (app.interviewDate) {
      const days = daysBetween(now, new Date(app.interviewDate));
      if (days >= 0) {
        alerts.push({
          id: `interview-${app.id}`,
          type: 'interview',
          severity: days <= 2 ? 'critical' : days <= 7 ? 'warning' : 'info',
          title: `Interview: ${app.company}`,
          subtitle: `${app.role} · in ${days}d`,
          daysUntil: days,
          href: '/apply',
        });
      }
    }
    if (app.offerDeadline) {
      const days = daysBetween(now, new Date(app.offerDeadline));
      if (days >= 0 && days <= 14) {
        alerts.push({
          id: `offer-${app.id}`,
          type: 'application_deadline',
          severity: days <= 3 ? 'critical' : 'warning',
          title: `Offer Deadline: ${app.company}`,
          subtitle: `Expires in ${days}d`,
          daysUntil: days,
          href: '/apply',
        });
      }
    }
  }

  // Sort: critical first, then by daysUntil
  alerts.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
    return (a.daysUntil ?? 99) - (b.daysUntil ?? 99);
  });

  return NextResponse.json({ alerts, total: alerts.length });
}
