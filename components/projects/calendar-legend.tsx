export function ProjectCalendarLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <span>
        <strong className="text-foreground">עיגון תאריך:</strong> אירוע (ברירת מחדל) → הקמה → פירוק
        (רק אם חסרים תאריכים קודמים).
      </span>
      <span>
        <strong className="text-foreground">שעה בכרטיס:</strong> לפי נקודת העיגון באותו יום.
      </span>
    </div>
  );
}
