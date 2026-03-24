# ברגע הראשון

מערכת ניהול השכרת ציוד לאירועים (עברית + RTL) עם Next.js ו-Supabase.

- מפת מסכים ויכולות: [`docs/BUILT.md`](docs/BUILT.md)
- הערות UI/נראות: [`docs/UI_NOTES.md`](docs/UI_NOTES.md)

## דרישות

- Node.js 20+
- חשבון Supabase פעיל
- (אופציונלי) Vercel לפרודקשן

## משתני סביבה

העתיקו מ־`.env.example` ל־`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
RESEND_API_KEY=
RESEND_FROM=
```

הערות:

- `SUPABASE_SERVICE_ROLE_KEY` נדרש לפעולות שרת כמו פנייה ציבורית/מעקב.
- `CRON_SECRET` נדרש ל־`/api/cron`.
- נתמכים אימותי cron דרך:
  - `Authorization: Bearer <CRON_SECRET>`
  - `x-cron-secret: <CRON_SECRET>`
  - `?secret=<CRON_SECRET>`

## פיתוח מקומי

```bash
npm install
npm run dev
```

פתחו `http://localhost:3000`.

## מיגרציות Supabase

יש לוודא שכל המיגרציות בתיקיית `supabase/migrations` מיושמות לפני בדיקות מלאות/פרודקשן.

דגש על מיגרציות פיצ'רים:

- `20260325090000_project_public_tracking_token.sql`
- `20260325120000_time_entries.sql`
- `20260324150000_project_trucks.sql`
- `20260326120000_employees_team_fields.sql`
- `20260326123000_storage_policies_harden.sql`

## בדיקות לפני פריסה

```bash
npm run lint
npm run build
```

## פריסה ל-Vercel

- אפשר חיבור GitHub אוטומטי, או פריסה ישירה מה-CLI:

```bash
npx vercel@latest deploy --prod --yes
```

## Go-live Checklist

- [ ] כל משתני הסביבה מוגדרים ב-Vercel
- [ ] כל מיגרציות Supabase הורצו על סביבת היעד
- [ ] `NEXT_PUBLIC_SITE_URL` מצביע לדומיין הפרודקשן
- [ ] `CRON_SECRET` מוגדר ותזמון cron נבדק
- [ ] Smoke: `/`, `/login`, `/dashboard`, `/employees`, `/reports`, `/api/cron`
- [ ] לוגו נטען מ־`/brand/logo.png` (כולל manifest/icons)
