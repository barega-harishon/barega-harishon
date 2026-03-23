<!-- BEGIN:nextjs-agent-rules -->
# Project Guardrails (Gateway)

Use this file as the single entry point before implementing anything.

## Read Order (mandatory)
1. `docs/BUILT.md` (מפת מה קיים ואיפה בקוד)
2. `docs/CONVENTIONS.md` · לשיפורי UI: `docs/UI_NOTES.md`
3. `.cursor/rules/core-architecture.mdc`
4. `.cursor/rules/hebrew-rtl-ui.mdc`
5. `.cursor/rules/ui-consistency.mdc`
6. `.cursor/rules/security-data.mdc`
7. `.cursor/rules/next-supabase-serverless.mdc`

## Non-Negotiable Rules
- All UI text must be in Hebrew.
- Root layout must keep `<html lang="he" dir="rtl">`.
- Tailwind logical properties only: `ms/me`, `ps/pe` (never `ml/mr/pl/pr`).
- Reuse shared UI components from `components/ui`.
- Never hardcode secrets; use environment variables only.
- Validate and sanitize all user input before persistence.
- Show polite Hebrew client errors; keep internal details server-side.

## Next.js Version Safety
This Next.js version may include breaking changes. Validate APIs and conventions against `node_modules/next/dist/docs/` when uncertain, and heed deprecation notices.
<!-- END:nextjs-agent-rules -->
