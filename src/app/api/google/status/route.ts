import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleConnectionStatus } from "@/lib/google/token-manager";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getGoogleConnectionStatus(session.user.id);

    // Debug: fetch actual token records
    const tokens = await prisma.googleServiceToken.findMany({
      where: { userId: session.user.id },
      select: {
        service: true,
        isValid: true,
        expiresAt: true,
        scope: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      userId: session.user.id,
      connected: {
        sheets: status.SHEETS,
        drive: status.DRIVE,
        calendar: status.CALENDAR,
        gmail: status.GMAIL,
      },
      tokens: tokens.map((t) => ({
        service: t.service,
        isValid: t.isValid,
        expiresAt: t.expiresAt,
        scope: t.scope,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to get Google status:", error);
    return NextResponse.json(
      { error: "Failed to get connection status" },
      { status: 500 }
    );
  }
}
