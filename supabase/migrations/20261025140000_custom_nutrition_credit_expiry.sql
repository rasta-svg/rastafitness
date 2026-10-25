alter table public.custom_nutrition_purchases
  add column if not exists expires_at timestamptz;

create index if not exists custom_nutrition_purchases_expires_at_idx
  on public.custom_nutrition_purchases (expires_at)
  where expires_at is not null;

comment on column public.custom_nutrition_purchases.expires_at is
  'Optional expiry timestamp for purchase credits; admin complimentary credits require an explicit expiry.';
