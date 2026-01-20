import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccessibleDataSources } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const department = session.user.department;
    const accessibleSources = await getAccessibleDataSources(department);

    const result = accessibleSources.map((s) => ({
      name: s.dataSource.name,
      displayName: s.dataSource.displayName,
      type: s.dataSource.type,
      description: s.dataSource.description,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
