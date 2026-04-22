import "server-only";

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

type GoogleCalendarEnv = {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
};

function getGoogleCalendarEnv(): GoogleCalendarEnv | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ?? "";
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() ?? "";

  if (!clientEmail || !rawPrivateKey || !calendarId) {
    return null;
  }

  return {
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
    calendarId,
  };
}

export function hasGoogleCalendarConfig(): boolean {
  return getGoogleCalendarEnv() !== null;
}

export function createGoogleCalendarClient():
  | { calendar: calendar_v3.Calendar; calendarId: string }
  | null {
  const env = getGoogleCalendarEnv();
  if (!env) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: env.clientEmail,
    key: env.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return {
    calendar: google.calendar({ version: "v3", auth }),
    calendarId: env.calendarId,
  };
}
