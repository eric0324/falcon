import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleService } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { revokeGoogleToken } from "@/lib/google/token-manager";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const service = body.service?.toUpperCase() as GoogleService;

    if (!service || !["SHEETS", "DRIVE", "CALENDAR"].includes(service)) {
      return NextResponse.json(
        { error: "Invalid service. Valid services: sheets, drive, calendar" },
        { status: 400 }
      );
    }

    await revokeGoogleToken(session.user.id, service);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect Google service:", error);
    return NextResponse.json(
      { error: "Failed to disconnect service" },
      { status: 500 }
    );
  }
}
