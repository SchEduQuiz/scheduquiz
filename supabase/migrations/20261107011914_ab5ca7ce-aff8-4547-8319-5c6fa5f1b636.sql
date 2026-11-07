ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;
UPDATE public.lesson_progress SET completed = COALESCE(is_completed,false) WHERE completed IS DISTINCT FROM COALESCE(is_completed,false);
CREATE OR REPLACE FUNCTION public.sync_lesson_progress_completed()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.completed := COALESCE(NEW.completed,false) OR COALESCE(NEW.is_completed,false);
  ELSIF NEW.completed IS DISTINCT FROM OLD.completed THEN
    NULL;
  ELSIF NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    NEW.completed := COALESCE(NEW.is_completed,false);
  END IF;
  NEW.is_completed := NEW.completed;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_lesson_progress_completed ON public.lesson_progress;
CREATE TRIGGER sync_lesson_progress_completed BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_progress_completed();