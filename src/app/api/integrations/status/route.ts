import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isNotionConfigured } from "@/lib/integrations/notion";
import { isSlackConfigured } from "@/lib/integrations/slack";
import { isAsanaConfigured } from "@/lib/integrations/asana";
import { isPlausibleConfigured } from "@/lib/integrations/plausible";
import { isGA4Configured } from "@/lib/integrations/ga4";
import { isMetaAdsConfigured } from "@/lib/integrations/meta-ads";
import { isGitHubConfigured } from "@/lib/integrations/github";
import { isVimeoConfigured } from "@/lib/integrations/vimeo";

// GET /api/integrations/status - Check which integrations are configured
export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notion, slack, asana, plausible, ga4, meta_ads, github, vimeo] =
    await Promise.all([
      isNotionConfigured(),
      isSlackConfigured(),
      isAsanaConfigured(),
      isPlausibleConfigured(),
      isGA4Configured(),
      isMetaAdsConfigured(),
      isGitHubConfigured(),
      isVimeoConfigured(),
    ]);

  return NextResponse.json({
    notion, slack, asana, plausible, ga4, meta_ads, github, vimeo,
  });
}
