import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

// In-memory cache with TTL
const cache = new Map<string, { value: string | undefined; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * All config keys that the system supports, grouped for the admin UI.
 */
export interface ConfigDef {
  key: string;
  description: string;
  sensitive: boolean;
  options?: string[];
}

export const CONFIG_DEFINITIONS: Record<string, ConfigDef[]> = {
  google_oauth: [
    { key: "GOOGLE_CLIENT_ID", description: "Client ID", sensitive: false },
    { key: "GOOGLE_CLIENT_SECRET", description: "Client Secret", sensitive: true },
    { key: "ALLOWED_EMAIL_DOMAIN", description: "Allowed email domain", sensitive: false },
  ],
  anthropic: [
    { key: "ANTHROPIC_API_KEY", description: "API Key", sensitive: true },
  ],
  openai: [
    { key: "OPENAI_API_KEY", description: "API Key", sensitive: true },
  ],
  google_ai: [
    { key: "GOOGLE_GENERATIVE_AI_API_KEY", description: "API Key", sensitive: true },
  ],
  voyage: [
    { key: "VOYAGE_API_KEY", description: "API Key", sensitive: true },
  ],
  notion: [
    { key: "NOTION_TOKEN", description: "Integration Token", sensitive: true },
  ],
  slack: [
    { key: "SLACK_BOT_TOKEN", description: "Bot Token", sensitive: true },
    { key: "SLACK_USER_TOKEN", description: "User Token", sensitive: true },
  ],
  asana: [
    { key: "ASANA_PAT", description: "Personal Access Token", sensitive: true },
  ],
  github: [
    { key: "GITHUB_TOKEN", description: "Personal Access Token", sensitive: true },
  ],
  vimeo: [
    { key: "VIMEO_ACCESS_TOKEN", description: "Access Token", sensitive: true },
  ],
  plausible: [
    { key: "PLAUSIBLE_API_KEY", description: "API Key", sensitive: true },
    { key: "PLAUSIBLE_SITE_ID", description: "Site ID", sensitive: false },
  ],
  ga4: [
    { key: "GA4_CLIENT_EMAIL", description: "Service Account Email", sensitive: false },
    { key: "GA4_PRIVATE_KEY", description: "Service Account Private Key", sensitive: true },
    { key: "GA4_PROPERTY_ID", description: "Property ID", sensitive: false },
  ],
  meta_ads: [
    { key: "META_ADS_ACCESS_TOKEN", description: "Access Token", sensitive: true },
    { key: "META_ADS_ACCOUNT_IDS", description: "Account IDs", sensitive: false },
  ],
  general: [
    { key: "DEFAULT_MONTHLY_QUOTA_USD", description: "Default monthly quota (USD)", sensitive: false },
    { key: "PG_TEXT_SEARCH_CONFIG", description: "PostgreSQL text search config", sensitive: false, options: ["simple", "english", "chinese"] },
  ],
};

/**
 * Get a config value from the database.
 * Results are cached in memory for 60 seconds.
 */
export async function getConfig(key: string): Promise<string | undefined> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let value: string | undefined;

  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (row) {
      value = row.encrypted ? decrypt(row.value) : row.value;
    }
  } catch {
    // DB not available
  }

  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

/**
 * Get a required config value. Throws if not found.
 */
export async function getConfigRequired(key: string): Promise<string> {
  const value = await getConfig(key);
  if (value === undefined) {
    throw new Error(`Missing required config: ${key}. Set it in admin settings or .env.`);
  }
  return value;
}

/**
 * Set a config value in the database (encrypted by default).
 * Immediately invalidates the cache for this key.
 */
export async function setConfig(
  key: string,
  value: string,
  options?: { userId?: string; group?: string; description?: string; encrypted?: boolean }
): Promise<void> {
  const shouldEncrypt = options?.encrypted ?? true;
  const storedValue = shouldEncrypt ? encrypt(value) : value;

  // Determine group from CONFIG_DEFINITIONS if not provided
  const group =
    options?.group ??
    Object.entries(CONFIG_DEFINITIONS).find(([, defs]) =>
      defs.some((d) => d.key === key)
    )?.[0] ??
    "general";

  await prisma.systemConfig.upsert({
    where: { key },
    create: {
      key,
      value: storedValue,
      encrypted: shouldEncrypt,
      description: options?.description,
      group,
      updatedBy: options?.userId,
    },
    update: {
      value: storedValue,
      encrypted: shouldEncrypt,
      description: options?.description,
      group,
      updatedBy: options?.userId,
    },
  });

  cache.delete(key);
}

/**
 * Delete a config value from the database.
 */
export async function deleteConfig(key: string): Promise<void> {
  await prisma.systemConfig.delete({ where: { key } }).catch(() => {});
  cache.delete(key);
}

/**
 * Invalidate the entire config cache.
 */
export function invalidateConfigCache(): void {
  cache.clear();
}
