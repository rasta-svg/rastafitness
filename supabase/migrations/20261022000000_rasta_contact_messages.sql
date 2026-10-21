create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'پیام به مدیر' check (char_length(subject) between 1 and 120),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new','read','replied','closed')),
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_messages_user_created_idx on public.contact_messages(user_id, created_at desc);
create index if not exists contact_messages_status_created_idx on public.contact_messages(status, created_at desc);
alter table public.contact_messages enable row level security;
grant select, insert, update on public.contact_messages to authenticated;
drop policy if exists "Users can read their own contact messages" on public.contact_messages;
create policy "Users can read their own contact messages"
on public.contact_messages for select to authenticated
using ((select auth.uid()) = user_id or (select auth.jwt()->>'email') = 'elida600000@gmail.com');
drop policy if exists "Users can send contact messages" on public.contact_messages;
create policy "Users can send contact messages"
on public.contact_messages for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'new' and admin_reply is null and replied_at is null);
drop policy if exists "Only admin can update contact messages" on public.contact_messages;
create policy "Only admin can update contact messages"
on public.contact_messages for update to authenticated
using ((select auth.jwt()->>'email') = 'elida600000@gmail.com')
with check ((select auth.jwt()->>'email') = 'elida600000@gmail.com');
