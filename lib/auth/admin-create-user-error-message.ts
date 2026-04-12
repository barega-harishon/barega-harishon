import { isAuthApiError } from "@supabase/supabase-js";

import { getSafeClientErrorMessage } from "@/lib/errors";

export function logAdminCreateUserFailure(error: unknown): void {
  if (isAuthApiError(error)) {
    console.error("admin createUser failed", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return;
  }
  console.error("admin createUser failed (non-AuthApiError)", error);
}

export function clientMessageForAdminCreateUserFailure(error: unknown): string {
  logAdminCreateUserFailure(error);
  if (!isAuthApiError(error)) {
    return getSafeClientErrorMessage();
  }
  const { code, status } = error;
  switch (code) {
    case "email_exists":
    case "user_already_exists":
      return "כתובת הדוא״ל כבר רשומה במערכת.";
    case "over_request_rate_limit":
      return "בוצעו יותר מדי פעולות בזמן קצר. נסו שוב בעוד כמה דקות.";
    case "email_address_invalid":
    case "validation_failed":
      return "נתונים לא תקינים. בדקו דוא״ל וסיסמה לפי דרישות האימות.";
    case "signup_disabled":
      return "יצירת משתמשים חדשים מושבתת בהגדרות האימות (Supabase).";
    case "weak_password":
      return "הסיסמה חלשה מדי לפי מדיניות האימות. נסו סיסמה ארוכה ומגוונת יותר.";
    default:
      if (status === 422) {
        return "הבקשה לא עברה אימות. בדקו את השדות ואת הגדרות Supabase Auth.";
      }
      if (status >= 500) {
        return "שירות האימות לא זמין כרגע. נסו שוב מאוחר יותר.";
      }
      return "יצירת המשתמש נכשלה. אם הבעיה נמשכת, בדקו את לוג השרת.";
  }
}
