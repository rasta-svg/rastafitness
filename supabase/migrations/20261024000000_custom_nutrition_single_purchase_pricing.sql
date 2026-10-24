-- Separate one-time purchase for each custom 7-day nutrition plan.
CREATE TABLE IF NOT EXISTS public.custom_nutrition_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','used')),
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
ALTER TABLE public.custom_nutrition_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custom_nutrition_purchases_read_own ON public.custom_nutrition_purchases;
CREATE POLICY custom_nutrition_purchases_read_own ON public.custom_nutrition_purchases
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
GRANT SELECT ON public.custom_nutrition_purchases TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.custom_nutrition_purchases FROM anon, authenticated;
GRANT ALL ON public.custom_nutrition_purchases TO service_role;

INSERT INTO public.subscription_plans
  (id, name_fa, description_fa, price_irr, billing_interval, features, sort_order, is_active)
VALUES
  ('custom_nutrition', 'ساخت اختصاصی برنامه غذایی', 'پرداخت مستقل به‌ازای ساخت هر برنامه غذایی اختصاصی؛ جدا از اشتراک پریمیوم', 1000000, 'none',
   '["ساخت یک برنامه غذایی اختصاصی ۷ روزه","شخصی‌سازی بر اساس هدف و ترجیحات غذایی"]'::jsonb, 4, true)
ON CONFLICT (id) DO UPDATE SET
  name_fa = EXCLUDED.name_fa,
  description_fa = EXCLUDED.description_fa,
  billing_interval = 'none',
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

CREATE OR REPLACE FUNCTION public.review_manual_payment(p_transaction_id uuid, p_approve boolean, p_admin_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_payment public.payment_transactions%ROWTYPE;
  v_plan_id text;
  v_subscription_id uuid;
  v_purchase_id uuid;
  v_quoted_price bigint;
  v_now timestamptz := now();
BEGIN
  UPDATE public.payment_transactions
  SET status = CASE WHEN p_approve THEN 'succeeded' ELSE 'failed' END,
      verified_at = CASE WHEN p_approve THEN v_now ELSE NULL END,
      provider_response = COALESCE(provider_response, '{}'::jsonb) ||
        jsonb_build_object(
          'reviewed_by', p_admin_user_id,
          'reviewed_at', v_now,
          'review_result', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END
        )
  WHERE id = p_transaction_id AND status = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'درخواست پرداخت پیدا نشد یا قبلاً بررسی شده است.';
  END IF;

  IF p_approve THEN
    v_plan_id := v_payment.provider_response ->> 'plan_id';
    IF v_plan_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.subscription_plans WHERE id = v_plan_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'پلن پرداخت فعال نیست یا پیدا نشد.';
    END IF;

    v_quoted_price := NULLIF(v_payment.provider_response ->> 'quoted_price_irr', '')::bigint;
    IF v_quoted_price IS NULL THEN
      SELECT price_irr INTO v_quoted_price FROM public.subscription_plans WHERE id = v_plan_id;
    END IF;
    IF v_quoted_price IS DISTINCT FROM v_payment.amount_irr THEN
      RAISE EXCEPTION 'مبلغ ثبت‌شدهٔ درخواست با مبلغ پرداخت مطابقت ندارد.';
    END IF;

    IF v_plan_id = 'custom_nutrition' THEN
      INSERT INTO public.custom_nutrition_purchases (user_id, transaction_id, status)
      VALUES (v_payment.user_id, v_payment.id, 'paid')
      RETURNING id INTO v_purchase_id;
    ELSE
      INSERT INTO public.subscriptions (user_id, plan_id, status, starts_at, ends_at)
      VALUES (v_payment.user_id, v_plan_id, 'active', v_now, v_now + interval '30 days')
      RETURNING id INTO v_subscription_id;

      UPDATE public.payment_transactions
      SET subscription_id = v_subscription_id
      WHERE id = p_transaction_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'status', CASE WHEN p_approve THEN 'succeeded' ELSE 'failed' END,
    'subscription_id', v_subscription_id,
    'custom_nutrition_purchase_id', v_purchase_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_custom_nutrition_purchase(p_purchase_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_rows integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ابتدا وارد حساب رستا شوید.';
  END IF;
  UPDATE public.custom_nutrition_purchases
  SET status = 'used', used_at = now()
  WHERE id = p_purchase_id AND user_id = v_user_id AND status = 'paid';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;
REVOKE ALL ON FUNCTION public.consume_custom_nutrition_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_custom_nutrition_purchase(uuid) TO authenticated;
