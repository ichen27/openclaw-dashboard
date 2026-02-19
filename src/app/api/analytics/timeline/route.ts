import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const hours = parseInt(searchParams.get("hours") || "24", 10);
  const since = new Date(Date.now() - hours * 3600000);

  const events = await prisma.taskEvent.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      task: {
        select: {
          title: true,
          priority: true,
          category: { select: { name: true, color: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json(events);
}
