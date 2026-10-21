-- Cover foreign keys introduced by the subscription and gym/trainer schemas.
CREATE INDEX IF NOT EXISTS gyms_owner_user_idx ON public.gyms(owner_user_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_idx ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS payment_transactions_subscription_idx ON public.payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS trainer_clients_gym_idx ON public.trainer_clients(gym_id);
CREATE INDEX IF NOT EXISTS trainer_assignments_gym_idx ON public.trainer_workout_assignments(gym_id);
CREATE INDEX IF NOT EXISTS trainer_assignments_plan_idx ON public.trainer_workout_assignments(workout_plan_id);
