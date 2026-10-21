-- Safe initial data model for gyms and trainer/client relationships.
-- Client-facing roles have read-only access to their own relationship records.
-- Writes will be performed by authenticated server-side functions after their workflows are implemented.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  slug text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gym_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','trainer','member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.trainer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (trainer_user_id <> client_user_id),
  UNIQUE (trainer_user_id,client_user_id,gym_id)
);
CREATE TABLE IF NOT EXISTS public.trainer_workout_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  workout_plan_id uuid REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  notes text,
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','assigned','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
  CHECK (trainer_user_id <> client_user_id)
);
CREATE INDEX IF NOT EXISTS gym_memberships_user_status_idx ON public.gym_memberships(user_id,status);
CREATE INDEX IF NOT EXISTS gym_memberships_gym_status_idx ON public.gym_memberships(gym_id,status);
CREATE INDEX IF NOT EXISTS trainer_clients_trainer_status_idx ON public.trainer_clients(trainer_user_id,status);
CREATE INDEX IF NOT EXISTS trainer_clients_client_status_idx ON public.trainer_clients(client_user_id,status);
CREATE INDEX IF NOT EXISTS trainer_assignments_client_idx ON public.trainer_workout_assignments(client_user_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS trainer_assignments_trainer_idx ON public.trainer_workout_assignments(trainer_user_id,status,created_at DESC);
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_workout_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gyms_read_owner_or_active_member ON public.gyms;
CREATE POLICY gyms_read_owner_or_active_member ON public.gyms FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.gym_memberships gm WHERE gm.gym_id = gyms.id
      AND gm.user_id = (SELECT auth.uid()) AND gm.status = 'active'
  ));
DROP POLICY IF EXISTS gym_memberships_read_own ON public.gym_memberships;
CREATE POLICY gym_memberships_read_own ON public.gym_memberships FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS trainer_clients_read_related ON public.trainer_clients;
CREATE POLICY trainer_clients_read_related ON public.trainer_clients FOR SELECT TO authenticated
  USING (trainer_user_id = (SELECT auth.uid()) OR client_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS trainer_assignments_read_related ON public.trainer_workout_assignments;
CREATE POLICY trainer_assignments_read_related ON public.trainer_workout_assignments FOR SELECT TO authenticated
  USING (trainer_user_id = (SELECT auth.uid()) OR client_user_id = (SELECT auth.uid()));
GRANT SELECT ON public.gyms, public.gym_memberships, public.trainer_clients, public.trainer_workout_assignments TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.gyms, public.gym_memberships, public.trainer_clients, public.trainer_workout_assignments
  FROM anon, authenticated;
COMMIT;
