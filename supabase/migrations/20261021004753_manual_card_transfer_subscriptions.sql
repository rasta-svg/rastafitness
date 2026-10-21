-- Manual card transfer subscriptions: private card settings and atomic approval.
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  card_number text NOT NULL DEFAULT '',
  cardholder_name text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT 'پس از کارت‌به‌کارت، شماره پیگیری را ثبت کنید. اشتراک پس از بررسی و تأیید مدیر فعال می‌شود.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_settings (id, card_number, cardholder_name)
VALUES (true, '', '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_settings TO service_role;

CREATE OR REPLACE FUNCTION public.review_manual_payment(
  p_transaction_id uuid,
  p_approve boolean,
  p_admin_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_payment public.payment_transactions%ROWTYPE;
  v_plan_id text;
  v_subscription_id uuid;
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
      SELECT 1 FROM public.subscription_plans
      WHERE id = v_plan_id AND is_active = true AND price_irr = v_payment.amount_irr
    ) THEN
      RAISE EXCEPTION 'پلن یا مبلغ پرداخت با تعرفه فعال مطابقت ندارد.';
    END IF;

    INSERT INTO public.subscriptions (user_id, plan_id, status, starts_at, ends_at)
    VALUES (v_payment.user_id, v_plan_id, 'active', v_now, v_now + interval '30 days')
    RETURNING id INTO v_subscription_id;

    UPDATE public.payment_transactions
    SET subscription_id = v_subscription_id
    WHERE id = p_transaction_id;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'status', CASE WHEN p_approve THEN 'succeeded' ELSE 'failed' END,
    'subscription_id', v_subscription_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_manual_payment(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(uuid, boolean, uuid) TO service_role;

UPDATE public.subscription_plans
SET price_irr = 1000000, updated_at = now()
WHERE id = 'premium';
