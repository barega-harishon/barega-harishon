-- פרטי צוות נוספים: קשר, בנק, הערות מסמכים ורשיונות (אחסון קבצים — שלב עתידי)
alter table public.employees
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists national_id text,
  add column if not exists bank_name text,
  add column if not exists bank_branch text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_holder text,
  add column if not exists documents_notes text,
  add column if not exists licenses_notes text;

comment on column public.employees.phone is 'טלפון';
comment on column public.employees.email is 'דוא״ל';
comment on column public.employees.national_id is 'תעודת זהות / מזהה';
comment on column public.employees.bank_name is 'שם בנק';
comment on column public.employees.bank_branch is 'סניף';
comment on column public.employees.bank_account_number is 'מספר חשבון';
comment on column public.employees.bank_account_holder is 'שם בעל החשבון';
comment on column public.employees.documents_notes is 'מסמכים / קישורים / הערות';
comment on column public.employees.licenses_notes is 'רשיונות / הערות';
