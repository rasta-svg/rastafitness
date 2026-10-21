-- Improve nutrition-data provenance, allergen review, and plan feedback.
alter table public.foods
  add column if not exists ingredients_fa text,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists allergens_reviewed boolean not null default false,
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists data_source_url text,
  add column if not exists source_record_id text,
  add column if not exists verified_at timestamptz,
  add column if not exists portion_name_fa text,
  add column if not exists portion_grams numeric(8,2) check (portion_grams is null or portion_grams > 0),
  add column if not exists review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.recipes
  add column if not exists energy_kcal numeric(9,2),
  add column if not exists protein_g numeric(9,2),
  add column if not exists carbohydrate_g numeric(9,2),
  add column if not exists fat_g numeric(9,2),
  add column if not exists fiber_g numeric(9,2),
  add column if not exists sodium_mg numeric(10,2),
  add column if not exists allergens text[] not null default '{}',
  add column if not exists allergens_reviewed boolean not null default false,
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists data_source text,
  add column if not exists data_source_url text,
  add column if not exists verified_at timestamptz;

create table if not exists public.nutrition_plan_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_snapshot_id uuid references public.nutrition_plan_snapshots(id) on delete set null,
  feedback_date date not null default current_date,
  adherence_score smallint check (adherence_score between 1 and 5),
  satiety_score smallint check (satiety_score between 1 and 5),
  taste_score smallint check (taste_score between 1 and 5),
  energy_level_score smallint check (energy_level_score between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists nutrition_plan_feedback_owner_date_idx
  on public.nutrition_plan_feedback (owner_id, feedback_date desc);

alter table public.nutrition_plan_feedback enable row level security;
drop policy if exists nutrition_plan_feedback_select_own on public.nutrition_plan_feedback;
create policy nutrition_plan_feedback_select_own on public.nutrition_plan_feedback for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists nutrition_plan_feedback_insert_own on public.nutrition_plan_feedback;
create policy nutrition_plan_feedback_insert_own on public.nutrition_plan_feedback for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists nutrition_plan_feedback_update_own on public.nutrition_plan_feedback;
create policy nutrition_plan_feedback_update_own on public.nutrition_plan_feedback for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists nutrition_plan_feedback_delete_own on public.nutrition_plan_feedback;
create policy nutrition_plan_feedback_delete_own on public.nutrition_plan_feedback for delete to authenticated using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.nutrition_plan_feedback to authenticated;

create index if not exists nutrition_plan_feedback_snapshot_idx on public.nutrition_plan_feedback (plan_snapshot_id);

create index if not exists foods_reviewed_by_idx on public.foods (reviewed_by);
