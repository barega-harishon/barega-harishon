# Supabase – מיגרציות

## קבצי מיגרציה (לפי סדר)

1. [`migrations/20260323190000_initial_schema.sql`](migrations/20260323190000_initial_schema.sql) – סכמת MVP (טבלאות, enum-ים, RLS, טריגר `profiles`).
2. [`migrations/20260324120000_storage_buckets.sql`](migrations/20260324120000_storage_buckets.sql) – buckets לתמונות וסקיצות + מדיניות Storage.
3. [`migrations/20260324121000_project_equipment_delete_office.sql`](migrations/20260324121000_project_equipment_delete_office.sql) – מחיקת שורות ציוד גם ל־office/operations.
4. [`migrations/20260324130000_equipment_policies_office_ops.sql`](migrations/20260324130000_equipment_policies_office_ops.sql) – הוספה/עדכון פריטי `equipment` למשרד ותפעול.

## איך מריצים

### אופציה א׳: Supabase CLI

```bash
supabase link   # פעם אחת לפרויקט
supabase db push
```

### אופציה ב׳: SQL Editor בלוח הבקרה

העתק את תוכן קובץ המיגרציה והרץ ב־SQL Editor.

## אחרי המיגרציה

1. צור משתמש ראשון ב־Authentication; עדכן ב־`profiles` את השדה `role` ל־`admin` (הטריגר יוצר שורת `profiles` עם ברירת מחדל `field`).
2. לטופס הציבורי [`/pniha`](../app/pniha/page.tsx): הגדר ב־`.env.local` את `SUPABASE_SERVICE_ROLE_KEY` (רק בשרת; לעולם לא בקוד לקוח).
3. הגדר buckets ב־Storage לפי [`docs/TECH_DESIGN.md`](../docs/TECH_DESIGN.md) (`project-site-photos`, `project-sketches`) ומדיניות גישה.

## הערות

- אם כבר קיים טריגר על `auth.users` בפרויקט Supabase, יש למזג ידנית עם `handle_new_user` כדי למנוע כפילות.
