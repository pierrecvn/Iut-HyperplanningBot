import 'dotenv/config';

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Variable d'environnement manquante : ${key}`);
  return value;
}

export const config = {
  discord: {
    token: env('DISCORD_TOKEN'),
    clientId: env('DISCORD_CLIENT_ID'),
    guildId: env('GUILD_ID'),
    developerIds: env('DEVELOPER_IDS', '').split(',').filter(Boolean),
  },
  supabase: {
    url: env('SUPABASE_URL'),
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  },
} as const;

export const Colors = {
  success: 0x00d26a,
  warning: 0xffcc4d,
  error: 0xfb2f61,
  info: 0x0099ff,
  active: 0x00ff00,
  ended: 0xff0000,
} as const;

export const COOLDOWN_MS = 5000;
export const REMINDER_REFRESH_MS = 15 * 60 * 1000;
export const ICAL_CACHE_TTL = 1800; // 30 min
