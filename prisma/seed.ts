import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default categories
  const coding = await prisma.category.upsert({
    where: { slug: "coding-tasks" },
    update: {},
    create: {
      name: "Coding Tasks",
      slug: "coding-tasks",
      color: "#6366f1",
      icon: "code",
    },
  });

  const devops = await prisma.category.upsert({
    where: { slug: "devops" },
    update: {},
    create: {
      name: "DevOps",
      slug: "devops",
      color: "#10b981",
      icon: "server",
    },
  });

  const general = await prisma.category.upsert({
    where: { slug: "general-tasks" },
    update: {},
    create: {
      name: "General Tasks",
      slug: "general-tasks",
      color: "#f59e0b",
      icon: "folder",
    },
  });

  // Create sample tasks
  const existingTasks = await prisma.task.count();
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          categoryId: coding.id,
          title: "Implement user authentication",
          description: "Add JWT-based authentication to the API endpoints",
          requirements:
            "- Set up JWT token generation\n- Add login/register endpoints\n- Implement middleware for protected routes\n- Add refresh token support",
          status: "backlog",
          priority: "high",
        },
        {
          categoryId: coding.id,
          title: "Write unit tests for task API",
          description:
            "Add comprehensive tests for all task CRUD operations",
          requirements:
            "- Test GET /api/tasks with filters\n- Test POST /api/tasks validation\n- Test PATCH /api/tasks/[id] status transitions\n- Test error cases",
          status: "queued",
          priority: "medium",
        },
        {
          categoryId: coding.id,
          title: "Add WebSocket support for real-time updates",
          description: "Enable live task board updates when tasks change",
          requirements:
            "- Set up WebSocket server\n- Broadcast task changes\n- Update client to subscribe",
          status: "backlog",
          priority: "low",
        },
        {
          categoryId: devops.id,
          title: "Set up CI/CD pipeline",
          description: "Configure GitHub Actions for automated testing and deployment",
          requirements:
            "- Create workflow file\n- Add test stage\n- Add build stage\n- Add deploy stage",
          status: "in-progress",
          priority: "high",
          assignedAgent: "devops-agent",
        },
        {
          categoryId: devops.id,
          title: "Configure monitoring and alerts",
          description: "Set up application monitoring with error tracking",
          requirements:
            "- Configure error tracking\n- Set up uptime monitoring\n- Add performance metrics",
          status: "backlog",
          priority: "medium",
        },
        {
          categoryId: general.id,
          title: "Write API documentation",
          description: "Document all REST API endpoints for agent integration",
          requirements:
            "- Document GET /api/tasks\n- Document POST /api/tasks\n- Document PATCH /api/tasks/[id]\n- Add example requests/responses",
          status: "review",
          priority: "medium",
          assignedAgent: "docs-agent",
        },
        {
          categoryId: general.id,
          title: "Design system architecture diagram",
          description: "Create a visual diagram showing system components and data flow",
          status: "done",
          priority: "low",
        },
      ],
    });
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
