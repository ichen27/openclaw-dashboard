import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CronExpressionParser } from "cron-parser";

export async function POST() {
  try {
    const schedules = await prisma.pingSchedule.findMany({
      where: { enabled: true },
    });

    const now = new Date();
    const results: { id: string; target: string; sent: boolean; error?: string }[] = [];

    for (const schedule of schedules) {
      try {
        // Parse cron expression to determine if it's due
        const interval = CronExpressionParser.parse(schedule.cronExpr, { currentDate: now });
        const prev = interval.prev(); // Last time it should have run

        // Check if the schedule is due: lastRunAt is null or before the previous fire time
        const isDue =
          !schedule.lastRunAt ||
          new Date(schedule.lastRunAt) < prev.toDate();

        if (!isDue) {
          results.push({ id: schedule.id, target: schedule.target, sent: false });
          continue;
        }

        // Fetch agents to find the session key
        let sent = false;
        let errorMsg: string | undefined;

        try {
          const agentsRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/agents`
          );
          const agents = (await agentsRes.json()) as {
            id: string;
            sessions: { key: string; updatedAt?: number }[];
          }[];

          const targets =
            schedule.target === "all"
              ? agents
              : agents.filter((a) => a.id === schedule.target);

          for (const agent of targets) {
            if (!agent.sessions.length) continue;
            const sessionKey = [...agent.sessions].sort(
              (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
            )[0]?.key;

            if (sessionKey) {
              const sendRes = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/agents/send`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionKey, message: schedule.message }),
                }
              );
              if (sendRes.ok) sent = true;
            }
          }
        } catch (e) {
          errorMsg = String(e);
        }

        // Update lastRunAt
        await prisma.pingSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now },
        });

        results.push({ id: schedule.id, target: schedule.target, sent, error: errorMsg });
      } catch (e) {
        results.push({ id: schedule.id, target: schedule.target, sent: false, error: String(e) });
      }
    }

    return NextResponse.json({ checked: schedules.length, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
