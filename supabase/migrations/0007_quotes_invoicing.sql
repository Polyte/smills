-- Public quote intake, formal quotes/invoices, CRM notifications, document storage

CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  product_key TEXT NOT NULL,
  product_label TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  quantity NUMERIC(14, 4),
  uom TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'reviewing', 'quoted', 'accepted', 'declined', 'invoiced', 'paid', 'cancelled'
  )),
  assigned_owner_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts (id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL
);

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests (id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'void')),
  subtotal_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
  tax_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  valid_until DATE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  pdf_path TEXT,
  customer_email_snapshot TEXT,
  customer_company_snapshot TEXT,
  customer_contact_snapshot TEXT
);

CREATE TABLE public.quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  qty NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_price_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_total_zar NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quote_id UUID NOT NULL REFERENCES public.quotes (id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'
  )),
  subtotal_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
  tax_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  due_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  pdf_path TEXT,
  customer_email_snapshot TEXT,
  customer_company_snapshot TEXT,
  customer_contact_snapshot TEXT
);

CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  qty NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_price_zar NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_total_zar NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE public.crm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ
);

CREATE INDEX quote_requests_status_idx ON public.quote_requests (status);
CREATE INDEX quote_requests_created_at_idx ON public.quote_requests (created_at DESC);
CREATE INDEX quotes_quote_request_id_idx ON public.quotes (quote_request_id);
CREATE INDEX invoices_quote_id_idx ON public.invoices (quote_id);
CREATE INDEX crm_notifications_user_unread_idx ON public.crm_notifications (user_id, read_at);
CREATE INDEX crm_notifications_user_created_idx ON public.crm_notifications (user_id, created_at DESC);

CREATE TRIGGER quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

-- quote_requests
CREATE POLICY quote_requests_select_auth
  ON public.quote_requests FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY quote_requests_update_mgr_emp
  ON public.quote_requests FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY quote_requests_delete_mgr
  ON public.quote_requests FOR DELETE
  USING (public.app_user_role() = 'manager');

-- quotes
CREATE POLICY quotes_select_auth
  ON public.quotes FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY quotes_insert_mgr_emp
  ON public.quotes FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('manager', 'employee')
    AND created_by = auth.uid()
  );

CREATE POLICY quotes_update_mgr_emp
  ON public.quotes FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY quotes_delete_mgr
  ON public.quotes FOR DELETE
  USING (public.app_user_role() = 'manager');

-- quote_lines
CREATE POLICY quote_lines_select_auth
  ON public.quote_lines FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY quote_lines_insert_mgr_emp
  ON public.quote_lines FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY quote_lines_update_mgr_emp
  ON public.quote_lines FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY quote_lines_delete_mgr_emp
  ON public.quote_lines FOR DELETE
  USING (public.app_user_role() IN ('manager', 'employee'));

-- invoices
CREATE POLICY invoices_select_auth
  ON public.invoices FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY invoices_insert_mgr_emp
  ON public.invoices FOR INSERT
  WITH CHECK (
    public.app_user_role() IN ('manager', 'employee')
    AND created_by = auth.uid()
  );

CREATE POLICY invoices_update_mgr_emp
  ON public.invoices FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY invoices_delete_mgr
  ON public.invoices FOR DELETE
  USING (public.app_user_role() = 'manager');

-- invoice_lines
CREATE POLICY invoice_lines_select_auth
  ON public.invoice_lines FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

CREATE POLICY invoice_lines_insert_mgr_emp
  ON public.invoice_lines FOR INSERT
  WITH CHECK (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY invoice_lines_update_mgr_emp
  ON public.invoice_lines FOR UPDATE
  USING (public.app_user_role() IN ('manager', 'employee'));

CREATE POLICY invoice_lines_delete_mgr_emp
  ON public.invoice_lines FOR DELETE
  USING (public.app_user_role() IN ('manager', 'employee'));

-- crm_notifications (inserts via service role only; users read/update own)
CREATE POLICY crm_notifications_select_own
  ON public.crm_notifications FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY crm_notifications_update_own
  ON public.crm_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage for generated PDFs (uploads from Edge Functions use service role; RLS bypassed)
INSERT INTO storage.buckets (id, name, public)
SELECT 'commercial-docs', 'commercial-docs', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'commercial-docs');

CREATE POLICY commercial_docs_select_crm
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'commercial-docs'
    AND public.app_user_role() IS NOT NULL
  );
