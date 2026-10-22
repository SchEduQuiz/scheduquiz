CREATE OR REPLACE FUNCTION public.guard_message_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only the read status of a message can be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_message_update ON public.messages;
CREATE TRIGGER guard_message_update BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();
GRANT UPDATE (read) ON public.messages TO authenticated;
DROP POLICY IF EXISTS "Recipients mark messages read" ON public.messages;
CREATE POLICY "Recipients mark messages read" ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());