import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding data sources...");

  // Create sample data sources
  const postgresDS = await prisma.dataSource.upsert({
    where: { name: "demo_postgres" },
    update: {},
    create: {
      name: "demo_postgres",
      displayName: "Demo PostgreSQL",
      description: "示範用 PostgreSQL 資料庫",
      type: "POSTGRES",
      config: {
        host: "localhost",
        port: 5432,
        database: "demo",
        user: "demo_user",
        password: "demo_pass",
      },
      isActive: true,
    },
  });

  const restApiDS = await prisma.dataSource.upsert({
    where: { name: "demo_api" },
    update: {},
    create: {
      name: "demo_api",
      displayName: "Demo REST API",
      description: "示範用 REST API 端點",
      type: "REST_API",
      config: {
        baseUrl: "https://jsonplaceholder.typicode.com",
        headers: {},
      },
      allowedEndpoints: ["users", "posts", "comments"],
      isActive: true,
    },
  });

  console.log("Created data sources:", { postgresDS: postgresDS.id, restApiDS: restApiDS.id });

  // Create permissions for "default" department (for users without department)
  await prisma.dataSourcePermission.upsert({
    where: {
      dataSourceId_department: {
        dataSourceId: postgresDS.id,
        department: "default",
      },
    },
    update: {},
    create: {
      dataSourceId: postgresDS.id,
      department: "default",
      readTables: ["users", "orders", "products"],
      readBlockedColumns: ["password", "credit_card"],
      writeTables: [],
      writeBlockedColumns: [],
      deleteTables: [],
    },
  });

  await prisma.dataSourcePermission.upsert({
    where: {
      dataSourceId_department: {
        dataSourceId: restApiDS.id,
        department: "default",
      },
    },
    update: {},
    create: {
      dataSourceId: restApiDS.id,
      department: "default",
      readTables: ["users", "posts", "comments"],
      readBlockedColumns: [],
      writeTables: ["posts", "comments"],
      writeBlockedColumns: [],
      deleteTables: [],
    },
  });

  // Also create permissions for "engineering" department
  await prisma.dataSourcePermission.upsert({
    where: {
      dataSourceId_department: {
        dataSourceId: postgresDS.id,
        department: "engineering",
      },
    },
    update: {},
    create: {
      dataSourceId: postgresDS.id,
      department: "engineering",
      readTables: ["users", "orders", "products", "logs"],
      readBlockedColumns: ["password"],
      writeTables: ["logs"],
      writeBlockedColumns: [],
      deleteTables: [],
    },
  });

  await prisma.dataSourcePermission.upsert({
    where: {
      dataSourceId_department: {
        dataSourceId: restApiDS.id,
        department: "engineering",
      },
    },
    update: {},
    create: {
      dataSourceId: restApiDS.id,
      department: "engineering",
      readTables: ["users", "posts", "comments"],
      readBlockedColumns: [],
      writeTables: ["posts", "comments"],
      writeBlockedColumns: [],
      deleteTables: ["comments"],
    },
  });

  console.log("Created permissions for default and engineering departments");
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
