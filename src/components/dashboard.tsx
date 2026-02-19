import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard-client";

export async function Dashboard() {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      tasks: {
        where: { archived: false },
        include: { category: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  // Serialize dates for client component
  const serialized = categories.map((cat) => ({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    tasks: cat.tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    })),
  }));

  return <DashboardClient categories={serialized} />;
}
