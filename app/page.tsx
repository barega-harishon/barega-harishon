import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="container-page flex flex-1 flex-col items-center py-10 lg:px-6">
      <section className="mx-auto w-full max-w-2xl space-y-6 text-center lg:max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl">מערכת ניהול השכרת ציוד לאירועים</CardTitle>
            <CardDescription>
              ממשק בעברית מלאה, RTL, ופרויקטים מחוברים ל־Supabase עם RLS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              מהמסך הבא ניתן לנהל פרויקטים (הצעה, אישור, הכנה, הקמה, פירוק וסגירה),
              לשייך לקוחות ולעדכן סטטוסים. נדרשת התחברות עם משתמש שמוגדר ב־Supabase
              Auth ותפקיד מתאים בטבלת <code className="rounded bg-muted px-1">profiles</code>
              .
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <Link className="font-medium text-primary hover:underline" href="/pniha">
                  פנייה לאירוע (ללא התחברות)
                </Link>{" "}
                – טופס לקוח עם תאריכים, כתובת וקבצים
              </li>
              <li>יצירת פרויקט טיוטה ושיוך ללקוח</li>
              <li>רשימת פרויקטים ומעבר לפרטים</li>
              <li>עדכון סטטוס פרויקט מתוך כרטיס הפרויקט</li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/pniha">פנייה לאירוע</Link>
            </Button>
            <Button asChild>
              <Link href="/login">התחברות</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects">פרויקטים</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/equipment">מלאי ציוד</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">דשבורד</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/clients">לקוחות</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
