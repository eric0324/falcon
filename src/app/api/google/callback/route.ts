import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens, GoogleServiceType } from "@/lib/google/config";
import { saveGoogleToken, serviceTypeToEnum } from "@/lib/google/token-manager";

interface OAuthState {
  userId: string;
  service: GoogleServiceType;
  returnUrl: string;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle error from Google
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/chat?google_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/chat?google_error=missing_params", request.url)
    );
  }

  // Decode state
  let state: OAuthState;
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      new URL("/chat?google_error=invalid_state", request.url)
    );
  }

  // Verify user is still logged in and matches state
  if (!session?.user?.id || session.user.id !== state.userId) {
    return NextResponse.redirect(
      new URL("/auth/signin?error=SessionRequired", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      console.warn("No refresh token received. User may have previously authorized.");
    }

    // Save tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await saveGoogleToken(state.userId, serviceTypeToEnum(state.service), {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      expiresAt,
      scope: tokens.scope,
    });

    // Redirect back to original page with success indicator
    const returnUrl = new URL(state.returnUrl, request.url);
    returnUrl.searchParams.set("google_connected", state.service.toLowerCase());
    return NextResponse.redirect(returnUrl);
  } catch (err) {
    console.error("Failed to exchange Google code:", err);
    return NextResponse.redirect(
      new URL(`/chat?google_error=token_exchange_failed`, request.url)
    );
  }
}
