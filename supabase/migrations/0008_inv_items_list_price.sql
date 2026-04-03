-- List / selling reference price per inventory UOM (ZAR).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inv_items'
      AND column_name = 'list_price_zar'
  ) THEN
    ALTER TABLE public.inv_items
      ADD COLUMN list_price_zar NUMERIC(14, 4) NOT NULL DEFAULT 0;
  END IF;
END $$;
