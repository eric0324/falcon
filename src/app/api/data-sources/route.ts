import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/data-sources
 * Returns list of data sources accessible to the current user
 */
export async function GET() {
  // 1. Authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const department = session.user.department || "default";

  try {
    // 2. Get data sources with permissions for user's department
    const dataSources = await prisma.dataSource.findMany({
      where: {
        isActive: true,
        permissions: {
          some: {
            department: department,
          },
        },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        type: true,
        // Don't expose sensitive config
        permissions: {
          where: {
            department: department,
          },
          select: {
            readTables: true,
            writeTables: true,
            deleteTables: true,
          },
        },
      },
      orderBy: {
        displayName: "asc",
      },
    });

    // 3. Transform response
    const result = dataSources.map((ds) => {
      const permission = ds.permissions[0];
      return {
        id: ds.id,
        name: ds.name,
        displayName: ds.displayName,
        description: ds.description,
        type: ds.type,
        capabilities: {
          canRead: permission?.readTables?.length > 0,
          canWrite: permission?.writeTables?.length > 0,
          canDelete: permission?.deleteTables?.length > 0,
          readTables: permission?.readTables || [],
          writeTables: permission?.writeTables || [],
          deleteTables: permission?.deleteTables || [],
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch data sources" },
      { status: 500 }
    );
  }
}
