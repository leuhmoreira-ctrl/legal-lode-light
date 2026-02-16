
-- Fix infinite recursion: workflows policies reference workflow_etapas which reference workflows

-- Drop the problematic circular policies
DROP POLICY IF EXISTS "Participants view workflows" ON public.workflows;
DROP POLICY IF EXISTS "View etapas" ON public.workflow_etapas;
DROP POLICY IF EXISTS "Manage etapas" ON public.workflow_etapas;
DROP POLICY IF EXISTS "Participants view etapas" ON public.workflow_etapas;
DROP POLICY IF EXISTS "Participants update etapas" ON public.workflow_etapas;

-- Recreate workflows participant policy using can_access_workflow function (no circular ref)
CREATE POLICY "Participants view workflows" ON public.workflows
  FOR SELECT USING (
    criador_id = auth.uid()
    OR is_admin_or_senior(auth.uid())
    OR is_workflow_participant(auth.uid(), id)
  );

-- Recreate workflow_etapas policies WITHOUT referencing workflows table (use workflow_id directly)
CREATE POLICY "View etapas" ON public.workflow_etapas
  FOR SELECT USING (
    responsavel_id = auth.uid()
    OR is_admin_or_senior(auth.uid())
    OR is_workflow_participant(auth.uid(), workflow_id)
  );

CREATE POLICY "Manage etapas" ON public.workflow_etapas
  FOR ALL USING (
    is_admin_or_senior(auth.uid())
    OR is_workflow_participant(auth.uid(), workflow_id)
  ) WITH CHECK (
    is_admin_or_senior(auth.uid())
    OR is_workflow_participant(auth.uid(), workflow_id)
  );
