alter table public.subscriptions
  add column if not exists grant_source text not null default 'purchase';

create index if not exists subscriptions_grant_source_created_at_idx
  on public.subscriptions (grant_source, created_at desc);

create index if not exists custom_nutrition_purchases_grant_source_created_at_idx
  on public.custom_nutrition_purchases (grant_source, created_at desc);
