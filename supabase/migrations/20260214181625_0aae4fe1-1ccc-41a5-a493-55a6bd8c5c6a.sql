
CREATE OR REPLACE FUNCTION public.get_audit_logs()
RETURNS TABLE (
  id BIGINT,
  record_id UUID,
  table_name TEXT,
  op TEXT,
  ts TIMESTAMPTZ,
  user_id UUID,
  old_record JSONB,
  record JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, record_id, table_name, op, ts, user_id, old_record, record
  FROM audit.record_version
  WHERE public.is_admin_or_senior(auth.uid())
  ORDER BY ts DESC
  LIMIT 100
$$;
