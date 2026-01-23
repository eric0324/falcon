import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      department: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    session: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      department: session.user.department,
    },
    database: user,
  });
}
