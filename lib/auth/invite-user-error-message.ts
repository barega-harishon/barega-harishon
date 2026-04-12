import { isAuthApiError } from "@supabase/supabase-js";

import { getSafeClientErrorMessage } from "@/lib/errors";

/**
 * לוג שרת מפורט + הודעת משתמש בטוחה בעברית לכשל inviteUserByEmail.
 */
export function logInviteUserByEmailFailure(error: unknown): void {
  if (isAuthApiError(error)) {
    console.error("inviteUserByEmail failed", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return;
  }
  console.error("inviteUserByEmail failed (non-AuthApiError)", error);
}

export function clientMessageForInviteUserFailure(error: unknown): string {
  logInviteUserByEmailFailure(error);
  if (!isAuthApiError(error)) {
    return getSafeClientErrorMessage();
  }
  const { code, status } = error;
  switch (code) {
    case "email_exists":
    case "user_already_exists":
      return "כתובת הדוא״ל כבר רשומה במערכת. אפשר לעדכן תפקיד מהטבלה או לבקש מהמשתמש להתחבר.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "נשלחו יותר מדי הזמנות בזמן קצר. נסו שוב בעוד כמה דקות.";
    case "email_address_invalid":
    case "validation_failed":
      return "כתובת הדוא״ל נדחתה על ידי שירות האימות. בדקו את הניסוח או את הגדרות Supabase.";
    case "email_provider_disabled":
    case "provider_disabled":
      return "שליחת דוא״ל מושבתת בהגדרות האימות. בדקו בלוח Supabase (Auth → Providers / SMTP).";
    case "signup_disabled":
      return "יצירת משתמשים חדשים מושבתת בהגדרות האימות (Supabase).";
    case "email_address_not_authorized":
      return "כתובת הדוא״ל אינה ברשימת המורשים לשליחה (אם הוגדרה רשימה ב־Supabase).";
    default:
      if (status === 422) {
        return "הבקשה לא עברה אימות. בדקו את כתובת הדוא״ל, את כתובת ההפניה המאושרת ב־Supabase ואת הגדרות SMTP.";
      }
      if (status >= 500) {
        return "שירות האימות לא זמין כרגע. נסו שוב מאוחר יותר.";
      }
      return "שליחת ההזמנה נכשלה. אם הבעיה נמשכת, בדקו את לוג השרת ואת הגדרות Supabase Auth.";
  }
}
