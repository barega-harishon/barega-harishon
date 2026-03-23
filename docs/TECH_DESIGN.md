# תכנון טכני – MVP (Supabase + Next.js)

מסמך זה מתרגם את [`SPEC.md`](SPEC.md) להחלטות יישום: סכמה, RLS, אחסון קבצים ופעולות שרת. יש לעדכן מסמך זה כשהמימוש מתקדם.

---

## עקרונות

- **טננט יחיד** – ללא `tenant_id`; כל השורות שייכות לארגון אחד.
- **אימות**: Supabase Auth (`auth.users`). פרופיל אפליקציה עם **תפקיד (role)** לצורך RLS.
- **מוטציות**: העדפה ל־**Next.js Server Actions** + לקוח Supabase בצד שרת עם הרשאות המשתמש המחובר.
- **שירות רק כשצריך**: `service_role` רק לפעולות מערכת (למשל יצירת משתמש, מיגרציות) – לא לזרימות UI רגילות.
- **מלאי ב־MVP**: ללא Realtime; לאחר שמירת ליקוט/פרויקט הלקוח מרענן או מנווט מחדש.

---

## תפקידים (מיפוי ל־DB)

 enum אפליקטיבי מומלץ, למשל `app_role`:

| ערך | תיאור קצר |
| --- | --- |
| `admin` | מנהל מערכת |
| `office` | משרד / שיווק |
| `operations` | מנהל תפעול / פרויקטים |
| `warehouse` | מנהל מחסן |
| `field` | צוות שטח |

טבלת `profiles` (דוגמה):

| עמודה | סוג | הערות |
| --- | --- | --- |
| `id` | `uuid` PK, FK ל־`auth.users.id` | |
| `full_name` | `text` | |
| `role` | `app_role` | ברירת מחדל לפי מדיניות onboarding |
| `created_at` | `timestamptz` | |

---

## סכמת טבלאות (PostgreSQL) – טיוטה ל־MVP

שמות ב־`snake_case`. כל הטבלאות עם `id uuid default gen_random_uuid() primary key` אלא אם צוין אחרת.

### `clients`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `name` | `text` | |
| `phone` | `text` | |
| `email` | `text` | |
| `address` | `text` | כתובת ראשית לקוח |
| `created_at` | `timestamptz` | |

### `equipment`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `name` | `text` | |
| `category` | `text` | או FK ל־`equipment_categories` בשלב 2 |
| `total_qty` | `int` | כמות פיזית במחסן (או כללית) |
| `rent_price` | `numeric` | מחיר השכרה יחידה |
| `warehouse_location` | `text` | |
| `created_at` | `timestamptz` | |

**חישוב זמינות**: `total_qty - sum(allocated_qty לפרויקטים פעילים)` – יש לממש ב־view או בשאילתה; ב־MVP אפשר טבלת `equipment_reservations` או שדה מחושב בפרויקט.

### `projects`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `client_id` | `uuid` FK | |
| `status` | `text` או enum | `quote`, `approved`, `prep`, `setup`, `teardown`, `closed` (לפי SPEC) |
| `location_address` | `text` | כתובת אירוע (יכול לשקף מ־`project_site_details`) |
| `total_price` | `numeric` | סכום הצעה/פרויקט |
| `setup_starts_at` | `timestamptz` | אופציונלי – איחוד תאריך+שעה |
| `event_starts_at` | `timestamptz` | |
| `event_ends_at` | `timestamptz` | |
| `teardown_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |
| `created_by` | `uuid` | FK ל־`profiles` – משרד שפתח |
| `public_tracking_token` | `uuid` unique, not null, default `gen_random_uuid()` | דף מעקב ציבורי ללקוח — `/track/[token]` דרך service role |

### `project_equipment`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `project_id` | `uuid` FK | |
| `equipment_id` | `uuid` FK | |
| `quantity` | `int` | |
| unique | (`project_id`, `equipment_id`) | |

### `project_site_details` (טופס לקוח / פרטי אתר)

שדות טקסט/זמן לפי SPEC; קבצים ב־Storage עם נתיבים כאן.

| עמודה | סוג | הערות |
| --- | --- | --- |
| `project_id` | `uuid` FK unique | פרויקט אחד לפרטי אתר |
| `access_notes` | `text` | דרכי גישה |
| `cladding_color` | `text` | צבע חיפוי |
| `notes` | `text` | הערות |
| `site_photo_paths` | `text[]` או טבלת `project_site_files` | מומלץ טבלת קבצים בשלב 2 |
| `sketch_path` | `text` | נתיב אובייקט ב־Storage |
| `submitted_by_client` | `boolean` | האם נשלח ע״י לקוח |
| `updated_at` | `timestamptz` | |

ניתן לאחד חלק מהשדות לתוך `projects` אם רוצים פחות טבלאות; ההפרדה מקלה על RLS לטופס ציבורי.

### `employees`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `auth_user_id` | `uuid` FK ל־`auth.users`, ייחודי, nullable | קישור עובד שטח למשתמש מחובר; נדרש ל־RLS של תפקיד `field` |
| `name` | `text` | |
| `type` | `text` או enum | `fixed`, `hourly`, `agency` |
| `hourly_rate` | `numeric` | nullable לקבוע |
| `availability_note` | `text` | ב־MVP טקסט; לוח זמינות מלא – שלב 2 |

### `assignments`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `project_id` | `uuid` FK | |
| `employee_id` | `uuid` FK | |
| `role` | `text` או enum | `team_lead`, `driver`, `worker` |

### `trucks`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `license_plate` | `text` unique | |
| `driver_id` | `uuid` FK nullable | קישור ל־`employees` אם הנהג רשום |
| `status` | `text` | זמין / בשימוש / תחזוקה |

**ממשק:** `/trucks` — רשימה, יצירה ועריכה (תפעול/מחסן/אדמין); משרד רואה בלבד; מחיקה אדמין בלבד (`trucks_delete_admin`).

### `project_trucks`

| עמודה | סוג | הערות |
| --- | --- | --- |
| `project_id` | `uuid` FK | חלק מ־PK |
| `truck_id` | `uuid` FK | חלק מ־PK |
| `created_at` | `timestamptz` | |

**RLS:** בחירה כמו `project_equipment` (כולל שטח לפי שיבוץ); הוספה/מחיקה — `admin`, `office`, `operations` בלבד. אכיפת &quot;משאית אחת לפרויקט פעיל אחד&quot; בלוגיקת שרת.

**סנכרון סטטוס משאית:** הפונקציה `refresh_truck_status_from_projects(truck_id)` (`SECURITY DEFINER`) מעדכנת `trucks.status` ל־`in_use` אם יש שיוך לפרויקט שאינו `closed`, ול־`available` אם אין — בלי לגעת ב־`maintenance`. **טריגרים** (`20260324170000_truck_status_triggers.sql`): אחרי `INSERT`/`UPDATE`/`DELETE` על `project_trucks`, ואחרי שינוי `projects.status` — קריאה לפונקציה לכל משאית רלוונטית (גיבוי לעריכה ב־SQL). מהאפליקציה נשאר RPC (`lib/trucks/refresh-status.ts`) בעיקר **אחרי `updateTruck`** בטופס (שינוי סטטוס ידני בלי נגיעה ב־`project_trucks`).

### `time_entries` (דיווח שעות – MVP)

| עמודה | סוג | הערות |
| --- | --- | --- |
| `employee_id` | `uuid` FK → `employees` | |
| `project_id` | `uuid` FK → `projects` | |
| `work_date` | `date` | יום ביצוע העבודה |
| `hours` | `numeric(6,2)` | בין 0 ל־24 (בפועל מקסימום 24 לשורה) |
| `note` | `text` | אופציונלי |

**פונקציה:** `current_user_employee_id()` — `SECURITY DEFINER`, מחזירה `employees.id` לפי `auth.uid()`.

**RLS (מיגרציה `20260325120000_time_entries.sql`):**  
- `SELECT`: `admin` / `office` / `operations` — הכול; `field` — רק שורות שבהן `employee_id` שווה ל־`current_user_employee_id()`.  
- `INSERT`: חובה שקיים `assignments` לאותו `project_id` + `employee_id`; שטח רק לעצמו; משרד/תפעול/אדמין — לכל עובד משובץ.  
- `UPDATE` / `DELETE`: משרד/תפעול/אדמין — הכול; שטח — רק שורות שלו.

**ממשק:** [`/field/time`](../app/field/time/page.tsx), [`actions/time-entries.ts`](../actions/time-entries.ts); דף פרויקט — טבלה + טופס הוספה לצוות משרד.

### `payments` (גבייה פנימית ב־MVP)

| עמודה | סוג | הערות |
| --- | --- | --- |
| `project_id` | `uuid` FK | |
| `amount` | `numeric` | |
| `type` | `text` | למשל `deposit`, `balance` |
| `paid_at` | `timestamptz` | |
| `note` | `text` | |

אופציונלי: `project_financials` view – סכום תשלומים מול `total_price`.

### `warehouse_pick_status` (אופציונלי – אם רוצים לעקוב אחר ליקוט)

או שדות על `project_equipment`: `picked_qty`, `returned_qty`, `damaged_qty`.

---

## Row Level Security (RLS) – כיוון מדיניות

כל הטבלאות למעלה: **RLS מופעל**. מדיניות לדוגמה (לדייק במימוש):

| תפקיד | גישה טיפוסית |
| --- | --- |
| `admin` | מלאה לכל הטבלאות |
| `office` | קריאה/כתיבה ל־`clients`, `projects`, הצעות, `payments`, `project_site_details`; **הוספה/עדכון** ל־`equipment` (מיגרציה `20260324130000`) |
| `operations` | פרויקטים, שיבוצים, משאיות, קריאת לקוחות; עדכון סטטוס פרויקט; **הוספה/עדכון** ל־`equipment` (אותה מיגרציה) |
| `warehouse` | קריאה לפרויקטים רלוונטיים; **כתיבה** ל־`equipment` (כולל עדכון שדות ליקוט/החזרה אם יתווספו); ללא גישה לרווחיות אם לא נדרש |
| `field` | **קריאה** ל־`projects` רק אם קיים `assignments` למשתמש הנוכחי; **דיווח שעות** ב־`time_entries` (שורות שלו בלבד; `INSERT` רק עם שיבוץ לפרויקט) |

**טופס לקוח ציבורי (מומש)**  
- דף [`/pniha`](../app/pniha/page.tsx): **Server Action** [`submitPublicInquiryFromForm`](../actions/public-inquiry.ts) עם [`createServiceRoleSupabaseClient`](../lib/supabase/service-role.ts) — יוצר `clients`, `projects` (סטטוס `quote`, `created_by` null), `project_site_details` (`submitted_by_client: true`), ומעלה קבצים ל־`project-site-photos` / `project-sketches` אחרי ולידציה (גודל, MIME).  
- אין `INSERT` ציבורי דרך `anon` לטבלאות. **אל** לחשוף `SUPABASE_SERVICE_ROLE_KEY` לדפדפן.  
- **Rate limit:** חלון בזיכרון לפי IP (`lib/rate-limit/ip-window.ts` + `getRequestClientIpKey`) בתוך ה־action — ~6 פניות ל־15 דקות; בפריסה מרובת מופעים מומלץ Redis בשלב 2.  
- **מעקב ללקוח:** עמודה `projects.public_tracking_token`; דף [`/track/[token]`](../app/track/%5Btoken%5D/page.tsx) טוען סיכום (סטטוס, תאריכים, יתרה) ב־[`getPublicProjectByTrackingToken`](../lib/public-project-tracking.ts) עם **service role** (ללא פתיחת RLS ל־anon). קישור מלא מדף פרויקט (`getPreferredSiteOrigin` + אופציונלי `NEXT_PUBLIC_SITE_URL`).  
- שיפורים אפשריים: Turnstile/hCaptcha, Signed URL לקבצים.

**מיגרציות SQL** (סכמה + RLS + טריגר פרופיל): [`20260323190000_initial_schema.sql`](../supabase/migrations/20260323190000_initial_schema.sql) ואילך; הרחבות למדיניות ציוד: [`20260324121000_project_equipment_delete_office.sql`](../supabase/migrations/20260324121000_project_equipment_delete_office.sql), [`20260324130000_equipment_policies_office_ops.sql`](../supabase/migrations/20260324130000_equipment_policies_office_ops.sql); **דיווח שעות:** [`20260325120000_time_entries.sql`](../supabase/migrations/20260325120000_time_entries.sql); **עדכון `projects` לשטח:** [`20260325130000_projects_update_field_assigned.sql`](../supabase/migrations/20260325130000_projects_update_field_assigned.sql) — `field` משובץ, מצב נוכחי `approved`…`teardown`, מעבר ל־`prep`/`setup`/`teardown` בלבד. הוראות הרצה: [`supabase/README.md`](../supabase/README.md).

---

## Supabase Storage

| Bucket | תוכן | הערות |
| --- | --- | --- |
| `project-site-photos` | תמונות שטח | גודל מקסימלי, MIME מותר; נתיב לפי `project_id` |
| `project-sketches` | סקיצות | |

מדיניות: קריאה לתפקידים `admin`, `office`, `operations`, `warehouse` (לפי צורך); כתיבה ללקוח רק עם טוקן/נתיב מוגבל.

---

## דוחות עסקיים (משרד / אדמין)

- דף [`/reports`](../app/reports/page.tsx): סיכומי **צינור** (סכום `total_price` לפי סטטוס, הפרדה פעילים מול סגורים), **יתרות פתוחות** (מספר פרויקטים וסכום), **תשלומים** לפי חודש ולפי סוג בשנה נבחרת (`?year=`), **פרויקטים חדשים** לפי חודש יצירה.
- לוגיקת שאילתות: [`lib/reports/business-queries.ts`](../lib/reports/business-queries.ts); אגרגציה בשרת (ללא טבלאות דוח נפרדות ב־DB ב־MVP).
- ייצוא: `GET /api/reports/export?year=YYYY&kind=full` — CSV עם BOM (עברית), אותן הרשאות כמו דף הדוחות (רק `office` / `admin` — תואם ל־RLS על `payments`).

---

## Server Actions / זרימות API (רשימת עבודה ל־MVP)

- `createOrUpdateClient` – משרד
- `createProjectDraftFromInquiry` – לקוח ציבורי / משרד
- `updateProjectSiteDetails` + העלאת קבצים (חתימה מאובטחת / URL זמני)
- `addProjectEquipment` / `updateProjectEquipment` – עם בדיקת זמינות
- `createEquipment` / `updateEquipment` (קטלוג `/equipment`) – לפי RLS
- `transitionProjectStatus` – לפי מכונת מצבים
- **PDF הצעה**: `GET /api/projects/[id]/quote-pdf` – HTML עברית (Noto Sans Hebrew) + **Puppeteer**; ב־Vercel: `@sparticuz/chromium` + `puppeteer-core`.  
- `sendQuotePdfByEmail` (Resend, מצורף PDF) – אם מוגדרים `RESEND_API_KEY` ו־`RESEND_FROM` (או ברירת מחדל לפיתוח).
- `addProjectAssignment` / `removeProjectAssignment` (ממשק: דף פרויקט + `/employees`) — `remove` לפי RLS **אדמין בלבד**; הוספה למשרד/תפעול/אדמין.
- `createEmployee` / רשימת עובדים — `/employees`
- `assignTruckToProject` (משאיות — טרם בממשק)
- `recordWarehousePick`, `recordReturnAndDamage`
- `recordPayment` / `listPaymentsForProject` – משרד ואדמין (RLS על `payments`)
- `updateProjectTotalPrice` – עדכון `projects.total_price` (תפקידים עם `UPDATE` לפרויקטים)
- נתוני דשבורד: `actions/dashboard.ts` (אגרגציה בשרת; תשלומים חודשיים רק ל־`admin`/`office`)

כל הפעולות: **Zod** בצד שרת, הודעות שגיאה בעברית ללא דליפת פנים.

---

## אינדקסים מומלצים

- `projects(client_id)`, `projects(status)`, `projects(event_starts_at)`
- `project_equipment(project_id)`
- `assignments(employee_id)`, `assignments(project_id)`
- `payments(project_id)`

---

## שלב 2 (תזכורת)

- Supabase Realtime למלאי / לוח פרויקטים
- חיבור חיצוני לחשבוניות
- גאנט עם תלויות משימות
- טבלת קבצים נורמלית במקום מערכים
