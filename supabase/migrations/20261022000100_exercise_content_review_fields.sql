ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS content_source text,
  ADD COLUMN IF NOT EXISTS content_source_url text,
  ADD COLUMN IF NOT EXISTS content_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS content_review_notes text,
  ADD COLUMN IF NOT EXISTS content_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_reviewed_by uuid REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_content_review_status_check'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_content_review_status_check
      CHECK (content_review_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS exercises_content_review_status_idx
  ON public.exercises (content_review_status);

COMMENT ON COLUMN public.exercises.content_source IS
  'Name of the traceable reference used to review this exercise; not proof of expert approval by itself.';
COMMENT ON COLUMN public.exercises.content_source_url IS
  'URL to the specific reference used in the human content review.';
COMMENT ON COLUMN public.exercises.content_review_status IS
  'pending until an appropriately qualified reviewer validates the individual exercise; approved/rejected require a human review.';
COMMENT ON COLUMN public.exercises.content_review_notes IS
  'Human review notes including technique, contraindications, equipment and required corrections.';
