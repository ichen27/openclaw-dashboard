import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") ?? "csv";
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (cat) where.categoryId = cat.id;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      category: true,
      _count: { select: { comments: true, events: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
  });

  if (format === "json") {
    const data = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      requirements: t.requirements,
      status: t.status,
      priority: t.priority,
      category: t.category.name,
      categorySlug: t.category.slug,
      assignedAgent: t.assignedAgent,
      dueDate: t.dueDate?.toISOString() ?? null,
      comments: t._count.comments,
      events: t._count.events,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tasks-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  }

  // Default: CSV
  const headers = [
    "ID", "Title", "Description", "Requirements",
    "Status", "Priority", "Category", "Assigned Agent",
    "Due Date", "Comments", "Events", "Created At", "Updated At",
  ];

  const rows = tasks.map(t => [
    t.id,
    t.title,
    t.description,
    t.requirements,
    t.status,
    t.priority,
    t.category.name,
    t.assignedAgent ?? "",
    t.dueDate?.toISOString().split("T")[0] ?? "",
    String(t._count.comments),
    String(t._count.events),
    t.createdAt.toISOString(),
    t.updatedAt.toISOString(),
  ].map(escapeCsv).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="tasks-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
