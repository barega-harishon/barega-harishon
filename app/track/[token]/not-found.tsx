import Link from "next/link";

export default function TrackNotFound() {
  return (
    <main className="container-page flex min-h-[40vh] flex-col items-center justify-center py-12 text-center">
      <h1 className="text-xl font-semibold">הקישור לא נמצא</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        ייתכן שהקישור שגוי או שפג תוקפו. אם קיבלתם קישור מהמשרד — בקשו קישור מעודכן.
      </p>
      <Link className="mt-6 text-sm underline-offset-4 hover:underline" href="/pniha">
        פנייה חדשה
      </Link>
    </main>
  );
}
