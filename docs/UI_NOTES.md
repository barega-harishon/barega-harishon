# נראות, נגישות והמשך עיצוב

מסמך זה מסכם **מה כבר כוונן** במערכת ומשאיר מקום **להערות ותיקונים** שלכם לפני/אחרי בדיקות משתמשים.

## מה כבר יושם (סיכום)

| אזור | מה נעשה |
| --- | --- |
| **מיתוג ופלטה** | צבעי שמפניה / נחושת / ברונז ב־`globals.css`; כפתורי ברירת־מחדל עם גרדיאנט מתכתי |
| **גופן** | **Heebo** (עברית + לטינית) דרך `next/font`, משתנה `--font-heebo` |
| **ניווט ראשי** | סרגל צד **קבוע** בדסקטופ (`lg+`) ב־`inline-start` (ב־RTL **ימין**), רוחב `16rem`; **מובייל:** שורת לוגו + המבורגר + **מגירה** מאותו צד (`start-0`) |
| **אזור שטח** | אותו דפוס: סרגל צד דסקטופ + מובייל עם מגירה; קישור «מערכת מלאה» בתחתית הסרגל / במגירה |
| **כותרות עמוד** | בתוך `.app-authenticated-main` — `h1` ממורכז |
| **התחברות** | לוגו מעל הכרטיס, כותרת הכרטיס ממורכזת |
| **טעינה** | `app/loading.tsx` + `PageLoading` — ספינר ממורכז |
| **מיכל עמוד** | `container-page` עם `safe-area-inset` |
| **קישורים** | מיקוד מקלדת ב־`globals.css` לקישורים בלי טבעות Tailwind |

קבצים מרכזיים: `app/globals.css`, `app/layout.tsx`, `app/loading.tsx`, `lib/nav/build-main-nav-items.ts`, `components/common/authenticated-shell.tsx`, `components/common/site-sidebar.tsx`, `components/common/mobile-top-bar.tsx`, `components/common/nav-side-drawer.tsx`, `components/field/field-app-shell.tsx`, `components/field/field-sidebar.tsx`, `components/field/field-mobile-top-bar.tsx`, `public/brand/logo.png`.

**שם המוצר במטא־דאטה:** «ברגע הראשון»; הלוגו מייצג את המותג הגרפי («אלוף הבמה והציוד»).

## המלצות להמשך (לא חובה)

- **טבלאות רחבות:** כותרות דביקות בטבלאות ארוכות.
- **מצב כהה:** לבדוק ניגודיות בגרדיאנט כפתורים וב־`muted-foreground`.
- **מסלולי משנה:** אם טעינה לא מופיעה בניווט פנימי, אפשר להוסיף `loading.tsx` בתיקיות layout ספציפיות.

---

## רשימת הערות שלכם (למלא אחרי סבב ביקורת)

- 

## בדיקות תפעול לפני שחרור

- [ ] לוודא ש־`/brand/logo.png` זמין גם ב־Production.
- [ ] לוודא שהמיגרציות החדשות עלו ל־Supabase (צוות + Storage policies).
- [ ] לבדוק `/api/cron` עם `Authorization: Bearer <CRON_SECRET>`.
- [ ] להריץ `npm run build` ו־`npm run lint` לפני דיפלוי.
