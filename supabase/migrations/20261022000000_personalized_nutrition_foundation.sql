-- Personalized nutrition foundation for Rasta Fitness.
-- All rows are user-owned and protected by row-level security.
create table if not exists public.nutrition_assessments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_years smallint check (age_years between 18 and 100),
  sex text not null default 'unspecified' check (sex in ('female','male','unspecified')),
  height_cm numeric(5,2) check (height_cm between 100 and 250),
  current_weight_kg numeric(6,2) check (current_weight_kg between 25 and 350),
  target_weight_kg numeric(6,2) check (target_weight_kg between 25 and 350),
  goal text not null default 'general_health' check (goal in ('fat_loss','muscle_gain','maintain','general_health','performance')),
  activity_level text not null default 'moderate' check (activity_level in ('sedentary','light','moderate','active','very_active')),
  diet_style text not null default 'iranian_mixed' check (diet_style in ('iranian_mixed','vegetarian','vegan','pescatarian','low_lactose','other')),
  liked_foods text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  allergies text[] not null default '{}',
  intolerances text[] not null default '{}',
  health_conditions text[] not null default '{}',
  budget_level text not null default 'moderate' check (budget_level in ('economical','moderate','flexible')),
  meals_per_day smallint not null default 4 check (meals_per_day between 3 and 6),
  pregnant_or_breastfeeding boolean not null default false,
  consent_to_store_health_data boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.nutrition_plan_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft','active','needs_professional_review')),
  algorithm_version text not null default 'rasta-nutrition-0.1',
  target_energy_kcal integer check (target_energy_kcal between 1000 and 6000),
  target_protein_g numeric(6,2) check (target_protein_g between 0 and 400),
  target_carbohydrate_g numeric(6,2) check (target_carbohydrate_g between 0 and 800),
  target_fat_g numeric(6,2) check (target_fat_g between 0 and 250),
  plan jsonb not null default '{}'::jsonb check (jsonb_typeof(plan) = 'object'),
  safety_flags text[] not null default '{}',
  assessment_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(assessment_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nutrition_plan_snapshots_owner_date_idx on public.nutrition_plan_snapshots (owner_id, plan_date desc);
alter table public.nutrition_assessments enable row level security;
alter table public.nutrition_plan_snapshots enable row level security;
drop policy if exists nutrition_assessments_select_own on public.nutrition_assessments;
create policy nutrition_assessments_select_own on public.nutrition_assessments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists nutrition_assessments_insert_own on public.nutrition_assessments;
create policy nutrition_assessments_insert_own on public.nutrition_assessments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists nutrition_assessments_update_own on public.nutrition_assessments;
create policy nutrition_assessments_update_own on public.nutrition_assessments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists nutrition_assessments_delete_own on public.nutrition_assessments;
create policy nutrition_assessments_delete_own on public.nutrition_assessments for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists nutrition_plan_snapshots_select_own on public.nutrition_plan_snapshots;
create policy nutrition_plan_snapshots_select_own on public.nutrition_plan_snapshots for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists nutrition_plan_snapshots_insert_own on public.nutrition_plan_snapshots;
create policy nutrition_plan_snapshots_insert_own on public.nutrition_plan_snapshots for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists nutrition_plan_snapshots_update_own on public.nutrition_plan_snapshots;
create policy nutrition_plan_snapshots_update_own on public.nutrition_plan_snapshots for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists nutrition_plan_snapshots_delete_own on public.nutrition_plan_snapshots;
create policy nutrition_plan_snapshots_delete_own on public.nutrition_plan_snapshots for delete to authenticated using ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.nutrition_assessments to authenticated;
grant select, insert, update, delete on public.nutrition_plan_snapshots to authenticated;
