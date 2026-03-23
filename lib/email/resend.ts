import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/lib/env";

export function getResendClient(): Resend {
  const serverEnv = getServerEnv();

  if (!serverEnv.success) {
    throw new Error("Missing RESEND_API_KEY in server environment.");
  }

  return new Resend(serverEnv.data.RESEND_API_KEY);
}
