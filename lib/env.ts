import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
});

export function getClientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}

export function getCronSecret(): string | null {
  const parsed = z.string().min(1).safeParse(process.env.CRON_SECRET);
  return parsed.success ? parsed.data : null;
}

export function isVercelEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}
