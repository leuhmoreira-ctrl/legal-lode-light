
-- Recreate security definer functions (idempotent)
CREATE OR REPLACE FUNCTION public.is_workflow_participant(_workflow_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workflow_etapas
    WHERE workflow_id = _workflow_id
      AND responsavel_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_workflow(_workflow_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workflows
    WHERE id = _workflow_id
      AND (criador_id = _user_id OR public.is_admin_or_senior(_user_id))
  )
$$;

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Insert comentarios" ON public.workflow_comentarios;
DROP POLICY IF EXISTS "Insert acoes" ON public.workflow_acoes;
DROP POLICY IF EXISTS "Insert versoes" ON public.workflow_versoes;

-- Now recreate
CREATE POLICY "Insert comentarios v2" ON public.workflow_comentarios FOR INSERT
  WITH CHECK (
    auth.uid() = autor_id
    AND (public.can_access_workflow(workflow_id, auth.uid()) OR public.is_workflow_participant(workflow_id, auth.uid()))
  );

CREATE POLICY "Insert acoes v2" ON public.workflow_acoes FOR INSERT
  WITH CHECK (
    auth.uid() = usuario_id
    AND (public.can_access_workflow(workflow_id, auth.uid()) OR public.is_workflow_participant(workflow_id, auth.uid()))
  );

CREATE POLICY "Insert versoes v2" ON public.workflow_versoes FOR INSERT
  WITH CHECK (
    auth.uid() = autor_id
    AND (public.can_access_workflow(workflow_id, auth.uid()) OR public.is_workflow_participant(workflow_id, auth.uid()))
  );
