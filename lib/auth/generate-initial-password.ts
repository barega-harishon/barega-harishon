import { randomBytes } from "node:crypto";

/** סיסמה חד־פעמית לשיתוף מחוץ למערכת (לא לוגים). */
export function generateInitialPassword(): string {
  return randomBytes(18).toString("base64url").slice(0, 24);
}
