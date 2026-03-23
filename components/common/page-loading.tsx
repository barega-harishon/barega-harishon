type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = "טוען…" }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4">
      <div
        className="h-11 w-11 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label={label}
      />
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
