-- Separate 30-day purchase for advanced AI nutrition consultation.
-- This is additive and does not alter existing user records.
BEGIN;
INSERT INTO public.subscription_plans
  (id, name_fa, description_fa, price_irr, billing_interval, features, sort_order, is_active)
VALUES
  ('nutrition_consultation', 'مشاوره هوشمند پیشرفته تغذیه',
   'دسترسی ۳۰ روزه به گفت‌وگوی هوشمند تغذیه؛ مستقل از پریمیوم و ساخت برنامه غذایی',
   1000000, 'none',
   '["گفت‌وگوی هوشمند تغذیه","ایده‌های وعده غذایی","جایگزینی غذا","بازبینی الگوی غذایی"]'::jsonb, 5, true)
ON CONFLICT (id) DO UPDATE SET
  name_fa = EXCLUDED.name_fa,
  description_fa = EXCLUDED.description_fa,
  billing_interval = 'none',
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
COMMIT;
