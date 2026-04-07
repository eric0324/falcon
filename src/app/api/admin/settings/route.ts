import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { CONFIG_DEFINITIONS, setConfig, invalidateConfigCache } from "@/lib/config";
import { decrypt } from "@/lib/encryption";

// GET /api/admin/settings — return all config values (sensitive ones masked)
export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const allConfigs = await prisma.systemConfig.findMany();
  const configMap = new Map(allConfigs.map((c) => [c.key, c]));

  const groups: Record<string, Array<{
    key: string;
    description: string;
    sensitive: boolean;
    hasValue: boolean;
    value: string | null;
  }>> = {};

  for (const [group, defs] of Object.entries(CONFIG_DEFINITIONS)) {
    groups[group] = defs.map((def) => {
      const row = configMap.get(def.key);
      const hasValue = !!row;

      let displayValue: string | null = null;
      if (row && !def.sensitive) {
        displayValue = row.encrypted ? decrypt(row.value) : row.value;
      }

      return {
        key: def.key,
        description: def.description,
        sensitive: def.sensitive,
        hasValue,
        value: displayValue,
      };
    });
  }

  return NextResponse.json(groups);
}

// PUT /api/admin/settings — update a config value
export async function PUT(req: Request) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { key, value } = await req.json();

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  // Find the definition
  const def = Object.values(CONFIG_DEFINITIONS)
    .flat()
    .find((d) => d.key === key);

  if (!def) {
    return NextResponse.json({ error: "Unknown config key" }, { status: 400 });
  }

  if (value === null || value === "") {
    // Delete the config
    await prisma.systemConfig.delete({ where: { key } }).catch(() => {});
    invalidateConfigCache();
    return NextResponse.json({ success: true });
  }

  await setConfig(key, value, {
    userId: result.user?.id,
    encrypted: def.sensitive,
  });

  return NextResponse.json({ success: true });
}
