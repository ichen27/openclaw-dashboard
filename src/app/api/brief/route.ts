import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [tasks, apps, lcProblems, goals, notes] = await Promise.all([
    prisma.task.findMany({ include: { category: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.application.findMany({ orderBy: { company: 'asc' } }),
    prisma.lCProblem.findMany({ orderBy: { solvedAt: 'desc' } }),
    prisma.dailyGoal.findMany({ where: { date: today() }, orderBy: { order: 'asc' } }),
    prisma.note.findMany({ where: { pinned: true }, orderBy: { updatedAt: 'desc' }, take: 3 }),
  ]);

  // ─── Task stats ───────────────────────────────────────────────────────────
  const done = tasks.filter(t => t.status === 'done');
  const backlog = tasks.filter(t => t.status === 'backlog');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const doneThisWeek = done.filter(t => new Date(t.updatedAt) >= weekAgo);
  const highPriorityBacklog = backlog
    .filter(t => t.priority === 'high')
    .sort((a, b) => (a.dueDate ? 1 : 0) - (b.dueDate ? 1 : 0))
    .slice(0, 5);

  // ─── Upcoming deadlines ───────────────────────────────────────────────────
  const upcomingDeadlines = tasks
    .filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) <= in14)
    .map(t => ({
      title: t.title,
      daysUntil: daysBetween(now, new Date(t.dueDate!)),
      category: t.category.name,
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // ─── Application pipeline ─────────────────────────────────────────────────
  const notApplied = apps.filter(a => a.stage === 'not_applied');
  const applied = apps.filter(a => a.stage === 'applied');
  const inInterview = apps.filter(a => ['phone_screen', 'technical', 'final_round'].includes(a.stage));
  const upcomingInterviews = apps
    .filter(a => a.interviewDate && new Date(a.interviewDate) >= now)
    .map(a => ({ company: a.company, daysUntil: daysBetween(now, new Date(a.interviewDate!)) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // ─── LC stats ─────────────────────────────────────────────────────────────
  const lcThisWeek = lcProblems.filter(p =>
    p.solvedAt && new Date(p.solvedAt) >= weekAgo && p.status === 'solved'
  );
  const lcTotal = lcProblems.filter(p => p.status === 'solved').length;
  const weekGoal = 15;

  // ─── Goals ────────────────────────────────────────────────────────────────
  const goalsToday = goals;
  const goalsDone = goals.filter(g => g.done).length;

  // ─── Build brief ──────────────────────────────────────────────────────────
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const brief = {
    date: dateStr,
    generatedAt: now.toISOString(),
    summary: {
      tasksTotal: tasks.length,
      tasksDone: done.length,
      tasksThisWeek: doneThisWeek.length,
      inProgress: inProgress.length,
      backlogCount: backlog.length,
    },
    upcomingDeadlines: upcomingDeadlines.slice(0, 6),
    applications: {
      total: apps.length,
      notApplied: notApplied.length,
      applied: applied.length,
      inInterview: inInterview.length,
      upcomingInterviews,
      urgentCompanies: notApplied
        .filter(a => a.priority === 'high')
        .map(a => a.company),
    },
    lc: {
      solvedThisWeek: lcThisWeek.length,
      weekGoal,
      weekProgress: Math.round((lcThisWeek.length / weekGoal) * 100),
      totalSolved: lcTotal,
    },
    todayGoals: {
      total: goalsToday.length,
      done: goalsDone,
      items: goalsToday.map(g => ({ text: g.text, done: g.done })),
    },
    pinnedNotes: notes.map(n => ({ title: n.title, preview: n.content.slice(0, 80) })),
    highPriorityBacklog: highPriorityBacklog.map(t => ({
      title: t.title,
      category: t.category.name,
      dueDate: t.dueDate,
    })),
  };

  return NextResponse.json(brief);
}
