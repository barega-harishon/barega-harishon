function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export interface QuoteLineInput {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface QuotePdfContext {
  projectId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  locationAddress: string | null;
  totalPriceSystem: number;
  lines: QuoteLineInput[];
  equipmentSubtotal: number;
  setupStartsAt: string | null;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  teardownAt: string | null;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDateLabel(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function buildQuotePdfHtml(ctx: QuotePdfContext): string {
  const rows = ctx.lines
    .map(
      (line) => `
    <tr>
      <td>${escapeHtml(line.name)}</td>
      <td class="num">${line.quantity}</td>
      <td class="num">${formatMoney(line.unitPrice)}</td>
      <td class="num">${formatMoney(line.lineTotal)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Sans Hebrew", "Segoe UI", Tahoma, sans-serif;
      font-size: 12px;
      color: #111;
      margin: 24px;
      direction: rtl;
    }
    h1 { font-size: 20px; margin: 0 0 8px; font-weight: 600; }
    .muted { color: #555; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
    th { background: #f4f4f4; font-weight: 600; }
    td.num { text-align: left; direction: ltr; unicode-bidi: plaintext; }
    .summary { margin-top: 16px; max-width: 320px; margin-right: 0; margin-left: auto; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
    .dates { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .dates div { padding: 6px; background: #fafafa; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>הצעת מחיר</h1>
  <p class="muted">מזהה פרויקט: ${escapeHtml(ctx.projectId)}</p>
  <section>
    <h2 style="font-size:14px;margin:16px 0 8px;">לקוח</h2>
    <p><strong>${escapeHtml(ctx.clientName)}</strong></p>
    ${ctx.clientPhone ? `<p>טלפון: ${escapeHtml(ctx.clientPhone)}</p>` : ""}
    ${ctx.clientEmail ? `<p>דוא״ל: ${escapeHtml(ctx.clientEmail)}</p>` : ""}
    ${ctx.clientAddress ? `<p>כתובת: ${escapeHtml(ctx.clientAddress)}</p>` : ""}
    ${ctx.locationAddress ? `<p>כתובת אירוע: ${escapeHtml(ctx.locationAddress)}</p>` : ""}
  </section>
  <div class="dates">
    <div>הקמה: ${escapeHtml(formatDateLabel(ctx.setupStartsAt))}</div>
    <div>תחילת אירוע: ${escapeHtml(formatDateLabel(ctx.eventStartsAt))}</div>
    <div>סיום אירוע: ${escapeHtml(formatDateLabel(ctx.eventEndsAt))}</div>
    <div>פירוק: ${escapeHtml(formatDateLabel(ctx.teardownAt))}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>פריט</th>
        <th>כמות</th>
        <th>מחיר יחידה</th>
        <th>סה״כ שורה</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="4" style="text-align:center;">אין שורות ציוד בפרויקט</td></tr>`}
    </tbody>
  </table>
  <div class="summary">
    <div class="summary-row"><span>סיכום ציוד (לפי מחירון)</span><span>${formatMoney(ctx.equipmentSubtotal)}</span></div>
    <div class="summary-row"><span>סכום בהצעה במערכת</span><span>${formatMoney(ctx.totalPriceSystem)}</span></div>
  </div>
  <p class="muted" style="margin-top:24px;">מסמך זה הופק מהמערכת ואינו חתום דיגיטלית.</p>
</body>
</html>`;
}
