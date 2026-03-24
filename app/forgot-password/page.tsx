import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="container-page flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>שכחתי סיסמה</CardTitle>
          <CardDescription>
            הזינו כתובת דוא״ל ונשלח קישור לאיפוס סיסמה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
