import Link from "next/link";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SettingsGearLink({ className }: { className?: string }) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={className}
      aria-label="הגדרות"
      title="הגדרות"
    >
      <Link href="/settings">
        <Settings className="h-5 w-5" />
      </Link>
    </Button>
  );
}
