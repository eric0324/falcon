import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildGoogleAuthUrl, GoogleServiceType, GOOGLE_SCOPES } from "@/lib/google/config";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const service = searchParams.get("service")?.toUpperCase() as GoogleServiceType | null;
  const returnUrl = searchParams.get("returnUrl") || "/chat";

  if (!service || !(service in GOOGLE_SCOPES)) {
    return NextResponse.json(
      { error: "Invalid service. Valid services: sheets, drive, calendar" },
      { status: 400 }
    );
  }

  // Create state with user info and return URL
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      service,
      returnUrl,
    })
  ).toString("base64url");

  const authUrl = buildGoogleAuthUrl(service, state);

  return NextResponse.redirect(authUrl);
}
