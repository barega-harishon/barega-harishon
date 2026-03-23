interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <p className="rounded-[var(--radius)] border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
