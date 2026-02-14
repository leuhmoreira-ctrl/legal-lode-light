
-- Fix search_path for audit.log_changes
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit.record_version (record_id, table_name, op, user_id, old_record)
    VALUES (OLD.id, TG_TABLE_NAME, TG_OP, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit.record_version (record_id, table_name, op, user_id, old_record, record)
    VALUES (NEW.id, TG_TABLE_NAME, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit.record_version (record_id, table_name, op, user_id, record)
    VALUES (NEW.id, TG_TABLE_NAME, TG_OP, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

-- Fix search_path for handle_new_user (already has it but re-ensure)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_escritorio', NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'junior');
  RETURN NEW;
END;
$$;
