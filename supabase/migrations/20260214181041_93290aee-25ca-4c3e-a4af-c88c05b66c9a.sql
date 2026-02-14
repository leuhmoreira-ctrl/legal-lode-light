
-- 1. ENUM DE ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'senior', 'junior', 'intern', 'secretary');

-- 2. TABELA PROFILES (substitui perfis)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Usuário',
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. TABELA USER_ROLES (segurança: roles separados)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'junior',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. SECURITY DEFINER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'senior' THEN 2
    WHEN 'junior' THEN 3
    WHEN 'intern' THEN 4
    WHEN 'secretary' THEN 5
  END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_senior(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'senior')
  )
$$;

-- 5. TRIGGER: cria profile + role ao cadastrar
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ADD advogado_id TO processos
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS advogado_id UUID;

-- 7. UPDATE processos RLS (drop old, create hierarchical)
DROP POLICY IF EXISTS "Users can view own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can insert own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can update own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can delete own processos" ON public.processos;

CREATE POLICY "Hierarchical view processos" ON public.processos FOR SELECT USING (
  user_id = auth.uid() OR advogado_id = auth.uid() OR public.is_admin_or_senior(auth.uid())
);

CREATE POLICY "Users can insert processos" ON public.processos FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Hierarchical update processos" ON public.processos FOR UPDATE USING (
  user_id = auth.uid() OR advogado_id = auth.uid() OR public.is_admin_or_senior(auth.uid())
);

CREATE POLICY "Admin/senior delete processos" ON public.processos FOR DELETE USING (
  user_id = auth.uid() OR public.is_admin_or_senior(auth.uid())
);

-- 8. KANBAN TASKS
CREATE TABLE public.kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  processo_id UUID,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  position_index FLOAT NOT NULL DEFAULT 0,
  due_date DATE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kanban_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View kanban tasks" ON public.kanban_tasks FOR SELECT USING (
  assigned_to = auth.uid() OR user_id = auth.uid() OR public.is_admin_or_senior(auth.uid())
);
CREATE POLICY "Insert kanban tasks" ON public.kanban_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update kanban tasks" ON public.kanban_tasks FOR UPDATE USING (
  assigned_to = auth.uid() OR user_id = auth.uid() OR public.is_admin_or_senior(auth.uid())
);
CREATE POLICY "Delete kanban tasks" ON public.kanban_tasks FOR DELETE USING (
  user_id = auth.uid() OR public.is_admin_or_senior(auth.uid())
);

-- 9. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- 10. AUDIT SCHEMA
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.record_version (
  id BIGSERIAL PRIMARY KEY,
  record_id UUID,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,
  old_record JSONB,
  record JSONB
);

ALTER TABLE audit.record_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/senior view audit" ON audit.record_version FOR SELECT USING (
  public.is_admin_or_senior(auth.uid())
);

-- 11. AUDIT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER audit_processos
  AFTER INSERT OR UPDATE OR DELETE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_kanban_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.kanban_tasks
  FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

-- 12. INDEXES
CREATE INDEX idx_kanban_tasks_assigned ON public.kanban_tasks(assigned_to, status);
CREATE INDEX idx_kanban_tasks_position ON public.kanban_tasks(status, position_index);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_processos_advogado ON public.processos(advogado_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- 13. REALTIME for kanban and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 14. DROP old perfis table (empty, being replaced by profiles)
DROP TABLE IF EXISTS public.perfis CASCADE;
