"use client";

import { useMemo, useState } from "react";

import type { DateStylePreference } from "@/lib/date-style";
import { formatDateTimeByPreference } from "@/utils/date";

type EmployeeFileEvent = {
  id: string;
  event_type: string;
  file_path: string;
  actor_user_id: string | null;
  actor_name: string | null;
  created_at: string;
};

function displayFileNameFromPath(path: string): string {
  const fileWithStamp = path.split("/").pop() ?? path;
  const firstUnderscore = fileWithStamp.indexOf("_");
  if (firstUnderscore <= 0) {
    return fileWithStamp;
  }
  return fileWithStamp.slice(firstUnderscore + 1);
}

const EVENT_LABELS: Record<string, string> = {
  upload_documents: "העלאת מסמכים",
  upload_licenses: "העלאת רשיונות",
  delete_documents: "מחיקת מסמכים",
  delete_licenses: "מחיקת רשיונות",
};

type Props = {
  events: EmployeeFileEvent[];
  dateStyle: DateStylePreference;
};

export function EmployeeFileEventsList({ events, dateStyle }: Props) {
  const [filter, setFilter] = useState<"all" | "upload" | "delete">("all");

  const filtered = useMemo(() => {
    if (filter === "all") {
      return events;
    }
    if (filter === "upload") {
      return events.filter((e) => e.event_type.startsWith("upload_"));
    }
    return events.filter((e) => e.event_type.startsWith("delete_"));
  }, [events, filter]);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">אין עדיין פעולות מתועדות.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="events-filter" className="text-xs text-muted-foreground">
          סינון:
        </label>
        <select
          id="events-filter"
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "upload" | "delete")}
        >
          <option value="all">הכל</option>
          <option value="upload">העלאות</option>
          <option value="delete">מחיקות</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין פעולות התואמות לסינון.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li key={e.id} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              <span className="font-medium">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-muted-foreground">{displayFileNameFromPath(e.file_path)}</span>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-muted-foreground">{e.actor_name ?? e.actor_user_id ?? "מערכת"}</span>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatDateTimeByPreference(e.created_at, dateStyle)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
