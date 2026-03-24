import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="container-page flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>איפוס סיסמה</CardTitle>
          <CardDescription>
            הזינו סיסמה חדשה לאחר פתיחת הקישור שנשלח למייל.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
