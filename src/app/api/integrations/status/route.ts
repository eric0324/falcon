import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isNotionConfigured } from "@/lib/integrations/notion";
import { isSlackConfigured } from "@/lib/integrations/slack";
import { isAsanaConfigured } from "@/lib/integrations/asana";
import { isPlausibleConfigured } from "@/lib/integrations/plausible";
import { isGA4Configured } from "@/lib/integrations/ga4";

// GET /api/integrations/status - Check which integrations are configured
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    notion: isNotionConfigured(),
    slack: isSlackConfigured(),
    asana: isAsanaConfigured(),
    plausible: isPlausibleConfigured(),
    ga4: isGA4Configured(),
  });
}
