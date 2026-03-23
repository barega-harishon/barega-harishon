export function getSafeClientErrorMessage(): string {
  return "אירעה שגיאה בלתי צפויה. נסה/י שוב בעוד מספר דקות.";
}

export function toServerError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown server error");
}
