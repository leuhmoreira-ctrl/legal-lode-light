
-- Allow users to update their own documents (for category changes and file replacement)
CREATE POLICY "Update own documents"
ON public.document_metadata
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());
