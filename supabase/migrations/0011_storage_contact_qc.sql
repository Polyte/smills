-- Private object storage for CRM contact documents and QC defect photos (signed URL access from app).

INSERT INTO storage.buckets (id, name, public)
SELECT 'contact-documents', 'contact-documents', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'contact-documents');

INSERT INTO storage.buckets (id, name, public)
SELECT 'qc-defect-photos', 'qc-defect-photos', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'qc-defect-photos');

CREATE POLICY contact_documents_storage_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contact-documents'
    AND public.app_user_role() IS NOT NULL
  );

CREATE POLICY contact_documents_storage_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contact-documents'
    AND public.app_user_role() IS NOT NULL
  );

CREATE POLICY contact_documents_storage_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contact-documents'
    AND public.app_user_role() IN ('admin', 'production_manager')
  );

CREATE POLICY contact_documents_storage_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contact-documents'
    AND public.app_user_role() IN ('admin', 'production_manager')
  );

CREATE POLICY qc_defects_storage_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'qc-defect-photos'
    AND public.app_user_role() IS NOT NULL
  );

CREATE POLICY qc_defects_storage_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'qc-defect-photos'
    AND public.app_user_role() IN ('admin', 'production_manager', 'quality_officer')
  );

CREATE POLICY qc_defects_storage_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'qc-defect-photos'
    AND public.app_user_role() IN ('admin', 'production_manager', 'quality_officer')
  );

CREATE POLICY qc_defects_storage_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'qc-defect-photos'
    AND public.app_user_role() IN ('admin', 'production_manager', 'quality_officer')
  );
