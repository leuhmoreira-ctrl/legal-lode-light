
-- Remove duplicate/redundant "View workflows" policy since "Participants view workflows" already covers it
DROP POLICY IF EXISTS "View workflows" ON public.workflows;
