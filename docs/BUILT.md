# מה נבנה בפרויקט – מפת דרכים

מסמך זה מרכז **איפה לראות בממשק** ו**איפה הקוד בקוד־בייס**, כדי שתוכלו לנווט במהירות.

## בממשק (דפדפן)

| מה | כתובת | הערות |
| --- | --- | --- |
| דף בית | `/` | אורחים: לוגו + התחברות / פנייה; **משתמש מחובר — מופנה ל־`/dashboard`** |
| פנייה לאירוע | `/pniha` | טופס לקוח ללא התחברות (דורש `SUPABASE_SERVICE_ROLE_KEY` בשרת); **הגבלת קצב** בסיסית לפי IP; אחרי שליחה — קישור לדף מעקב |
| מעקב אירוע (לקוח) | `/track/[token]` | ציבורי ללא התחברות; סטטוס, תאריכים, סכום/שולם/יתרה (דורש מיגרציה `public_tracking_token` + מפתח שרת) |
| התחברות | `/login` | דוא״ל + סיסמה (Supabase Auth); **התקנת PWA** (כפתור / הנחיות iOS) |
| רשימת פרויקטים | `/projects` | דורש התחברות; סינון `?status=`, `?client=`, חיפוש `?q=` (לקוח / כתובת); מוגן ב־middleware |
| לקוחות | `/clients` | רשימת לקוחות + חיפוש `?q=` (שם / טלפון / דוא״ל); קישור לפרויקטים לפי לקוח |
| לקוח חדש | `/clients/new` | יצירת לקוח (משרד/אדמין); הפניה ל־`/clients/[id]` |
| פרטי לקוח | `/clients/[id]` | פרטי קשר, עריכה (משרד/אדמין), טבלת פרויקטים |
| קנבן פרויקטים | `/projects/kanban` | עמודות לפי סטטוס; עדכון סטטוס מהכרטיס (משרד/תפעול/אדמין) |
| יומן פרויקטים | `/projects/calendar` | אירוע → הקמה → פירוק; סינון סטטוס `?st=` (מופרד בפסיקים); שעה בכרטיס; `?y=` / `?m=` |
| אזור שטח (PWA) | `/field` | בית, **פרויקטים משובצים**, **יומן אישי**, **דיווח שעות**; סרגל צד בדסקטופ והמבורגר במובייל; קישור מהניווט לתפקיד `field` |
| פרויקט בשטח | `/field/projects/[id]` | תצוגה מהירה: תאריכים, צוות, **עדכון סטטוס** (שטח בלבד), דיווח שעות עם `?project=`; קישור לפרויקט המלא |
| פרויקט חדש | `/projects/new` | לקוח קיים או לקוח מהיר + תאריכים |
| פרטי פרויקט | `/projects/[id]` | סטטוס, פרטים, **דיווח שעות** (טבלה + הוספה משרד/תפעול), **שיבוץ עובדים**, **משאיות**, **PDF**, **גבייה** (משרד), סכום, אתר, מדיה, ציוד |
| דשבורד | `/dashboard` | ספירות סטטוס, אירועים קרובים, התראות מלאי, תשלומים לפי חודש (משרד/אדמין) |
| גבייה | `/collections` | יתרות פתוחות לפי פרויקט (משרד/אדמין); **ייצוא CSV** (`/api/collections/export`) |
| דוחות עסקיים | `/reports` | צינור, תשלומים לפי חודש/סוג, פרויקטים חדשים לפי חודש, KPI; `?year=`; **ייצוא CSV** (`/api/reports/export`) — משרד/אדמין |
| מלאי ציוד | `/equipment` | קטלוג + סינון לפי קטגוריה (`?cat=`), עמודות במחסן / משובץ / פנוי + טופס הוספה |
| עריכת ציוד | `/equipment/[id]` | עדכון שדות; **מחיקה** (אדמין בלבד, אם אין שיבוץ לפרויקט) |
| צוות | `/employees` | טבלת `employees` ב־Supabase: רשימה + הוספה עם פרטי קשר, בנק, מסמכים/רשיונות (משרד/תפעול/אדמין); שיבוץ מדף פרויקט; **קישור חשבון התחברות** (`auth_user_id`) מכרטיס עובד (משרד/אדמין) |
| משתמשים ותפקידים | `/admin/users` | **אדמין בלבד**: רשימת פרופילים, עדכון `app_role`, הזמנת משתמש במייל עם תפקיד (דורש `SUPABASE_SERVICE_ROLE_KEY` לשליחה ולהצגת דוא״ל) |
| משאיות | `/trucks` | רשימה + עמודת **פרויקט פעיל**; הוספה/עריכה (תפעול/מחסן/אדמין); משרד צפייה בלבד; **מחיקה** אדמין בלבד |

**להרצה מקומית:** `npm run dev` ואז פתיחת `http://localhost:3000`.

---

## במסמכים

| מסמך | תוכן |
| --- | --- |
| [`SPEC.md`](SPEC.md) | אפיון מוצר MVP |
| [`TECH_DESIGN.md`](TECH_DESIGN.md) | סכמה, RLS, Storage, פעולות שרת |
| [`CONVENTIONS.md`](CONVENTIONS.md) | עברית, RTL, Tailwind לוגי |
| [`UI_NOTES.md`](UI_NOTES.md) | נראות, נגישות, רשימת המשך לביקורת |
| [`BUILT.md`](BUILT.md) | המסמך הזה – מפת מה נבנה |

---

## בקוד (תיקיות עיקריות)

| אזור | נתיב | תיאור |
| --- | --- | --- |
| עמודי App Router | `app/` | `/`, `/pniha`, `/field`, `/login`, `/dashboard`, `/reports`, `/collections`, `/projects`, … |
| API routes | `app/api/` | `quote-pdf`, `collections/export`, **`reports/export`** — CSV דוח עסקי (משרד/אדמין) |
| פעולות שרת | `actions/` | `assignments`, `clients`, `reports`, `dashboard`, `payments`, … |
| רכיבי UI | `components/ui/` | כפתור, קלט, טקסט־ארה, כרטיס, מודאל |
| התקנת PWA | `components/common/install-pwa-panel.tsx` | `beforeinstallprompt` + הנחיות Safari |
| רכיבי פרויקטים | `components/projects/` | טפסים, תג סטטוס, מדיה, ציוד, **משאיות לפרויקט**, **יומן חודשי**, **דיווח שעות (משרד)** |
| אזור שטח | `components/field/` | מעטפת אפליקציה, סרגל צד + מגירת המבורגר, טופס דיווח שעות |
| טופס ציבורי | `components/inquiry/` | `PublicInquiryForm` |
| רכיבי מלאי | `components/equipment/` | טפסי קטלוג ציוד |
| רכיבי דשבורד | `components/dashboard/` | גרף תשלומים (`PaymentBars`) |
| דוחות (לוגיקה) | `lib/reports/business-queries.ts` | שאילתות אגרגציה לפי פרויקטים/תשלומים |
| PDF | `lib/pdf/` | `runtime.ts`, `quote-html.ts`, `generate-quote-pdf.ts` |
| Rate limit (IP) | `lib/rate-limit/`, `lib/http/client-ip.ts` | חלון זמן בזיכרון לטופס `/pniha` |
| מעקב ציבורי | `lib/public-project-tracking.ts`, `lib/site-origin.ts` | טעינת פרויקט לפי טוקן (service role); מקור לקישור מלא |
| פרופיל / תפקיד | `lib/auth/current-profile.ts`, `current-employee.ts` | `getCurrentAppRole`; `getCurrentUserEmployeeId` לשטח ודיווח שעות |
| Supabase (דפדפן/שרת) | `lib/supabase/` | `client.ts`, `server.ts`, `middleware.ts`, `service-role.ts` (מפתח service בלבד בשרת) |
| Middleware | `middleware.ts` | סשן + הגנה על `/projects`, `/field`, `/clients`, … `/dashboard`, **`/reports`**, `/collections`, **`/admin`** |
| טיפוסים | `types/` | פרויקטים, תשלומים, תפקיד אפליקציה |
| מיגרציות DB | `supabase/migrations/` | סכמה, Storage, `project_trucks`, RPC משאיות, **טריגרים**, **`time_entries`**, **עדכון סטטוס פרויקט לשטח משובץ** |
| כללי Cursor | `.cursor/rules/` | עקביות פיתוח |

---

## מה הושלם עד כה (תמצית)

- שלד **Next.js** (App Router) + **TypeScript** + **Tailwind** + רכיבי UI אחידים.
- **עברית + RTL** ב־root layout.
- **התחברות** ל־Supabase + **רשימת פרויקטים**, **קנבן** (`/projects/kanban`), **יצירה**, **דף פרטים**, **עדכון סטטוס**.
- **לקוחות**: רשימה לבחירה + טופס "לקוח חדש" בעמוד יצירת פרויקט; מסכי `/clients`, `/clients/new`, `/clients/[id]` (עריכה משרד/אדמין); סינון פרויקטים לפי `?client=`; **חיפוש** פרויקטים ב־`/projects?q=`.
- **PWA בסיסי**: `app/manifest.ts` (כולל `icons` מ־`/brand/logo.png`), `metadata.icons` ב־`app/layout.tsx`, `viewport.themeColor`, `appleWebApp`; בדף **התחברות** — `InstallPwaPanel` (התקנה ב־Chrome/Edge או הנחיות ל־iOS).
- **טופס ציבורי**: הגבלת קצב בסיסית לפי IP ב־`submitPublicInquiryFromForm` (זיכרון מקומי למופע).
- **פרטי אתר** (`project_site_details`): טופס טקסט + **העלאת תמונות** ל־`project-site-photos` ו**סקיצה** ל־`project-sketches` (חתימת URL לתצוגה).
- **שיבוץ עובדים** (`assignments` + `employees`): מסך `/employees`, שיבוץ מדף פרויקט (הוספה למשרד/תפעול/אדמין; הסרה אדמין בלבד לפי RLS).
- **משאיות** (`trucks` + `project_trucks`): מסך `/trucks`; שיבוץ לפרויקט מדף `/projects/[id]` (משרד/תפעול/אדמין); משאית לא על שני פרויקטים פעילים במקביל (אכיפה בשרת); **סנכרון סטטוס** `available`/`in_use` מול שיבוצים פעילים (RPC ב־Postgres, לא משנה `maintenance`).
- **ציוד בפרויקט** (`project_equipment`): הוספה/עדכון כמות ומחיקה, עם בדיקת זמינות מול פרויקטים שאינם `closed`.
- **קטלוג מלאי** (`equipment`): מסכי `/equipment` להוספה ועריכת פריטים.
- **דשבורד** (`/dashboard`): סיכומי פרויקטים, אירועים קרובים, התראות מלאי, גרף תשלומים חודשי (משרד/אדמין).
- **הצעת מחיר PDF**: הורדה מ־`/api/projects/[id]/quote-pdf`; שליחה במייל (Resend + `RESEND_API_KEY`, אופציונלי `RESEND_FROM`).
- **גבייה**: תשלומים בדף פרויקט + מסך `/collections` ליתרות פתוחות (משרד/אדמין); **ייצוא CSV** מ־`/api/collections/export` (UTF‑8 עם BOM).
- **יומן פרויקטים**: `/projects/calendar` — עיגון פירוק אם חסרים אירוע והקמה; סינון סטטוס; `listMyAssignedProjectsCalendarMonth` לשטח; `utils/calendar-query.ts`.
- **דיווח שעות** (`time_entries`): שטח דרך `/field/time`; משרד/תפעול מוסיפים מדף פרויקט; RLS לפי תפקיד + שיבוץ.
- **אזור שטח** `/field`: מסכים מותאמים מגע, `InstallPwaPanel`, קישור **שטח** בהדר ל־`field`; **`/field/projects/[id]`** עם עדכון סטטוס (RLS); דיווח שעות עם פרמטר `project`.
- **דוחות עסקיים** `/reports` + `actions/reports.ts` + `lib/reports/business-queries.ts` — משרד/אדמין; ייצוא CSV משולב.
- **פנייה ציבורית** (`/pniha`): יצירת לקוח + פרויקט (`quote`) + `project_site_details` עם `submitted_by_client`, והעלאות ל־Storage דרך **service role** (המפתח רק בשרת); הצגת קישור **מעקב** אחרי שליחה.
- **קישור מעקב ללקוח**: `/track/[token]` + `public_tracking_token` ב־DB; בדף פרויקט — העתקת קישור מלא (`NEXT_PUBLIC_SITE_URL` או כותרות בקשה).
- **RLS** וסכמה ב־SQL (ראו `supabase/migrations/...`).
- **Google Calendar Sync**: סנכרון חד־כיווני של אבני דרך לפרויקטים (הקמה/אירוע/פירוק) ליומן משותף באמצעות Service Account; Backfill מאובטח דרך `GET /api/cron/google-calendar-backfill`.

---

## סטטוס MVP (לטווח המוסכם)

המודולים המרכזיים באפיון ה־MVP (פרויקטים, לקוחות, מלאי, שיבוצים, משאיות, גבייה, דוחות, שטח, פנייה ציבורית, PWA בסיסי) **ממומשים במערכת**.  
שיפורי נראות ורשימת הערות אחרי בדיקות: [`UI_NOTES.md`](UI_NOTES.md).

## מה עדיין לא (שלב 2 / לא חלק מ־MVP נוכחי)

- אימות מתקדם לטופס ציבורי (Captcha וכו׳); rate limit מבוזר (Redis) בפרודקשן מרובת מופעים; רענון/ביטול טוקן מעקב (אופציונלי).
- חיבור/ייצוא **חשבונית** חיצונית, Realtime מלאי, גאנט מתקדם.

עדכנו מסמך זה כשמוסיפים מודולים חדשים.

## Checklist פרודקשן קצר

- [ ] כל מיגרציות Supabase רצות בפרודקשן (כולל `20260326120000_employees_team_fields` ו־`20260326123000_storage_policies_harden`).
- [ ] `CRON_SECRET` מוגדר ונתיב `/api/cron` מאומת עם `Authorization: Bearer <secret>`.
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` מוגדרים (אם סנכרון יומן פעיל).
- [ ] היומן המשותף שותף ל־Service Account בהרשאת שינוי אירועים.
- [ ] נבדק Backfill: `GET /api/cron/google-calendar-backfill` עם `CRON_SECRET`.
- [ ] `NEXT_PUBLIC_SITE_URL` תואם לדומיין הפעיל.
- [ ] smoke בדפים: `/`, `/login`, `/dashboard`, `/employees`, `/reports`.
- [ ] לוגו נטען מ־`/brand/logo.png` גם בממשק וגם ב־manifest.
