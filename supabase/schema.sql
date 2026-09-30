-- รันไฟล์นี้ใน Supabase Dashboard > SQL Editor (รันซ้ำได้ ไม่เป็นไร)
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  description text not null default '' check (char_length(description) <= 5000),
  category text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  reporter text not null,
  reported_at date not null default current_date,
  status text not null default 'open' check (status in ('open','in_progress','solved')),
  solution text not null default '' check (char_length(solution) <= 5000),
  solver text not null default '',
  solved_at date,
  created_at timestamptz not null default now()
);

-- ไฟล์แนบ: [{ "name": "...", "path": "...", "type": "image/png", "size": 123 }]
alter table public.problems add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.problems enable row level security;

-- ยังไม่มีระบบล็อกอิน: อนุญาตให้ทุกคนที่มี anon key อ่าน/เพิ่ม/แก้/ลบได้
-- ควรเปลี่ยนเป็น "to authenticated" เมื่อเพิ่มระบบล็อกอิน
drop policy if exists "anon all" on public.problems;
create policy "anon all" on public.problems
  for all to anon using (true) with check (true);

-- ที่เก็บไฟล์แนบ: จำกัด 10MB, เฉพาะรูปภาพและ PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', true, 10485760,
        array['image/png','image/jpeg','image/gif','image/webp','application/pdf'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "attachments anon read" on storage.objects;
drop policy if exists "attachments anon insert" on storage.objects;
drop policy if exists "attachments anon delete" on storage.objects;
create policy "attachments anon read" on storage.objects
  for select to anon using (bucket_id = 'attachments');
create policy "attachments anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'attachments');
create policy "attachments anon delete" on storage.objects
  for delete to anon using (bucket_id = 'attachments');
