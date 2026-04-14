export const locales = ['en', 'zh-TW'] as const;
export type Locale = (typeof locales)[number];

function resolveDefaultLocale(): Locale {
  const envLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  if (envLocale && (locales as readonly string[]).includes(envLocale)) {
    return envLocale as Locale;
  }
  return 'en';
}

export const defaultLocale: Locale = resolveDefaultLocale();
