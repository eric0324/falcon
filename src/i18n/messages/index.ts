import type { Locale } from '../config';

const NAMESPACES = [
  'apiKeys',
  'categories',
  'codeScan',
  'common',
  'dataSource',
  'deploy',
  'emptyState',
  'fileUpload',
  'google',
  'integrations',
  'knowledge',
  'marketplace',
  'models',
  'myTools',
  'onboarding',
  'profile',
  'quota',
  'review',
  'search',
  'sidebar',
  'skills',
  'studio',
  'tokenBurners',
  'tool',
  'toolDatabase',
] as const;

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};
  await Promise.all(
    NAMESPACES.map(async (ns) => {
      merged[ns] = (await import(`./${locale}/${ns}.json`)).default;
    }),
  );
  return merged;
}
