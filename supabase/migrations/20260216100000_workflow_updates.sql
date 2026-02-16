-- Create new columns for workflow_versoes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_versoes' AND column_name = 'storage_path') THEN
        ALTER TABLE workflow_versoes ADD COLUMN storage_path TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_versoes' AND column_name = 'file_type') THEN
        ALTER TABLE workflow_versoes ADD COLUMN file_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_versoes' AND column_name = 'file_name') THEN
        ALTER TABLE workflow_versoes ADD COLUMN file_name TEXT;
    END IF;
END $$;

-- Create workflow-documents bucket if it doesn't exist (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-documents', 'workflow-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create policies for workflow-documents
-- Allow authenticated users to view documents (in a real app, this should be stricter based on RLS)
CREATE POLICY "Authenticated Select"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'workflow-documents' );

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'workflow-documents' );

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'workflow-documents' );

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'workflow-documents' );
