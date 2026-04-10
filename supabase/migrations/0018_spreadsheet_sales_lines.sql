-- Spreadsheet / sales ledger lines (imported order data + CRM edits).
-- Seeded from build-time JSON; clients sync via Supabase when configured.

CREATE TABLE public.spreadsheet_sales_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sales_order TEXT NOT NULL,
  customer TEXT NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  delivery_status TEXT NOT NULL DEFAULT '',
  order_date DATE,
  delivery_date DATE,
  quantity NUMERIC,
  delivered_kgs NUMERIC,
  balance NUMERIC,
  grand_total NUMERIC,
  order_status TEXT NOT NULL DEFAULT 'open',
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'manual')),
  seed_key TEXT UNIQUE
);

CREATE INDEX spreadsheet_sales_lines_order_date_idx ON public.spreadsheet_sales_lines (order_date DESC NULLS LAST);
CREATE INDEX spreadsheet_sales_lines_customer_idx ON public.spreadsheet_sales_lines (customer);
CREATE INDEX spreadsheet_sales_lines_delivery_status_idx ON public.spreadsheet_sales_lines (delivery_status);

CREATE TRIGGER spreadsheet_sales_lines_updated_at
  BEFORE UPDATE ON public.spreadsheet_sales_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.spreadsheet_sales_lines ENABLE ROW LEVEL SECURITY;

-- Read: any signed-in user with a CRM profile
CREATE POLICY spreadsheet_sales_lines_select
  ON public.spreadsheet_sales_lines FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.app_user_role() IS NOT NULL);

-- Write: commercial / ops roles (matches canWriteCommercial in app)
CREATE POLICY spreadsheet_sales_lines_insert
  ON public.spreadsheet_sales_lines FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.app_user_role_raw() IN (
      'super_admin',
      'admin',
      'production_manager',
      'sales',
      'quality_officer'
    )
  );

CREATE POLICY spreadsheet_sales_lines_update
  ON public.spreadsheet_sales_lines FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.app_user_role_raw() IN (
      'super_admin',
      'admin',
      'production_manager',
      'sales',
      'quality_officer'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.app_user_role_raw() IN (
      'super_admin',
      'admin',
      'production_manager',
      'sales',
      'quality_officer'
    )
  );

CREATE POLICY spreadsheet_sales_lines_delete
  ON public.spreadsheet_sales_lines FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.app_user_role_raw() IN (
      'super_admin',
      'admin',
      'production_manager',
      'sales',
      'quality_officer'
    )
  );


INSERT INTO public.spreadsheet_sales_lines (sales_order, customer, item_code, description, delivery_status, order_date, delivery_date, quantity, delivered_kgs, balance, grand_total, order_status, comments, source, seed_key) VALUES
('SO-17427', 'BUCKLE PACKAGING (PTY) LTD', 'YC01264', 'TEX 80/3 POLYESTER RS 5KG PRECISION WAX', 'Partly Delivered', '2026-01-22', '2026-01-25', 10000, 7705, 2295, 534175, 'open', '[]'::jsonb, 'seed', 'imp-0'),
('SO-17549', 'GOLDENGLO CANDLE & SOAP MANUFACTURES (PTY) LTD', 'YC00826', 'TEX 200/3 A COTTON RS 50MM', 'Partly Delivered', '2026-01-05', '2026-01-09', 1500, 1066.88, 433.12, 146625, 'open', '[]'::jsonb, 'seed', 'imp-1'),
('SO-17733', 'CAPE FRINGE MANUFACTURERS (PTY) LTD', 'YC02392', 'TEX 100/2 A COTTON OE', 'Partly Delivered', '2026-01-02', '2026-01-07', 500, 222.52, 277.48, 37892.5, 'open', '[]'::jsonb, 'seed', 'imp-2'),
('SO-17889', 'TENSILE RUBBER HOSES (PTY) LTD', 'YC00217', 'TEX 42/2 POLYESTER RS GREY 70mm 3//', 'Partly Delivered', '2026-01-25', '2026-01-28', 60, 32.29, 27.71, 11592, 'open', '[]'::jsonb, 'seed', 'imp-3'),
('SO-17890', 'TENSILE RUBBER HOSES (PTY) LTD', 'YC00018', 'TEX 42/2 POLYESTER RS GREY 4// 70mm', 'Partly Delivered', '2026-01-25', '2026-01-29', 60, 35.91, 24.09, 11592, 'open', '[]'::jsonb, 'seed', 'imp-4'),
('SO-17897', 'ARTFULLY DYED (PTY) LTD t/a COLOURSPUN', 'YC02242', 'TEX 600/4 A COTTON RING SPUN YARN', 'Partly Delivered', '2026-01-10', '2026-01-13', 250, 24.79, 225.21, 26277.5, 'open', '[]'::jsonb, 'seed', 'imp-5'),
('SO-17956', 'STANGER TEXTILE INDUSTRIES', 'YC02381', 'TEX 20/2 POLYESTER/COTTON RS (65/35) + STEAM', 'Partly Delivered', '2026-01-09', '2026-01-15', 4500, 1987.94, 2512.06, 462645, 'open', '[]'::jsonb, 'seed', 'imp-6'),
('SO-17985', 'GENERAL BELTINGS (PVT) LTD', 'W00846', 'ZEP125 RFL X 191CM  2 roll x1212m x 1041.5kg/roll', 'Partly Delivered', '2026-01-09', '2026-01-14', 2083, 1187.5, 895.5, 218715, 'open', '[]'::jsonb, 'seed', 'imp-7'),
('SO-17989', 'GENERAL BELTINGS (PVT) LTD', 'W00850', 'ZEP200 RFL x 114cm  6 roll x 1212m x 1105.34kg/roll', 'Partly Delivered', '2026-01-09', '2026-01-15', 6632.04, 4262, 2370.04, 636675.84, 'open', '[]'::jsonb, 'seed', 'imp-8'),
('SO-18035', 'NORTHERN TEXTILE MILLS S A (PTY) LTD t/a JOSHTEX', 'YP04462', 'TEX 36/1 O COT OE 4.0 TF', 'Partly Delivered', '2026-01-06', '2026-01-11', 10000, 4383, 5617, 609500, 'open', '[]'::jsonb, 'seed', 'imp-9'),
('SO-18073', 'COMPOTEX LIMITED', 'W01515', 'COMPOTEX 3175 X 140CM  3 ROLLS X 1000M', 'Partly Delivered', '2026-01-25', '2026-01-29', 3000, 1382, 1618, 13980, 'open', '[]'::jsonb, 'seed', 'imp-10'),
('SO-18103', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP03027', 'TEX 60/1 O COTTON OE STEAM', 'Partly Delivered', '2026-01-05', '2026-01-10', 60000, 59291.5, 708.5, 3463800, 'open', '[]'::jsonb, 'seed', 'imp-11'),
('SO-18104', 'NATIONAL FLAG PTY LTD', 'W00201', 'BUNTING FINISHED X 130CM  15 ROLLS X 200M ROLLS', 'Partly Delivered', '2026-01-23', '2026-01-28', 3000, 1151, 1849, 131100, 'open', '[]'::jsonb, 'seed', 'imp-12'),
('SO-18129', 'IB TEXTILES', 'YC00577', 'TEX 80/6 POLYESTER RS RW', 'Partly Delivered', '2026-01-25', '2026-01-29', 500, 414.36, 85.64, 29037.5, 'open', '[]'::jsonb, 'seed', 'imp-13'),
('SO-18140', 'BUCKLE PACKAGING (PTY) LTD', 'YP00070', 'TEX 80/3 POLYESTER RS WAX', 'Partly Delivered', '2026-01-22', '2026-01-27', 20000, 10202, 9798, 1052250, 'open', '[]'::jsonb, 'seed', 'imp-14'),
('SO-18206', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W00385', 'EE250 HCR FABRIC RFL X 140CM  4 ROLLS X 1236M', 'Partly Delivered', '2026-01-30', '2026-02-02', 4944, 3748, 1196, 369450.29, 'open', '[]'::jsonb, 'seed', 'imp-15'),
('SO-18207', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W00385', 'EE250 HCR FABRIC RFL X 185CM  8 ROLLS X 1245M', 'Partly Delivered', '2026-01-30', '2026-02-06', 9960, 5786, 4174, 983554.98, 'open', '[]'::jsonb, 'seed', 'imp-16'),
('SO-18210', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W01445', 'EE350 HCR RFL X 125CM  8 ROLLS X 620M  ,', 'Partly Delivered', '2026-01-30', '2026-02-03', 4960, 3196, 1764, 466359.04, 'open', '[]'::jsonb, 'seed', 'imp-17'),
('SO-18229', 'THE NATURAL COMPANY', 'W00316', 'COTTON THROW PLAIN x 180cm  10 rolls x 50m', 'Partly Delivered', '2026-01-19', '2026-01-26', 500, 400, 100, 71185, 'open', '[]'::jsonb, 'seed', 'imp-18'),
('SO-18236', 'TOGA LININGS (PTY) LTD', 'YP00169', 'MIXED MUTTON CLOTH', 'Partly Delivered', '2026-01-04', '2026-01-08', 20000, 6814, 13186, 529000, 'open', '[]'::jsonb, 'seed', 'imp-19'),
('SO-18442', 'LOVELINGS BY MARGRACE', 'YC00385', 'TEX 180/2 A COTTON RS', 'Partly Delivered', '2026-01-20', '2026-01-24', 200, 108.2, 91.8, 25300, 'open', '[]'::jsonb, 'seed', 'imp-20'),
('SO-18539', 'NURTURING FIBRES', 'YC00762', 'TEX 200/2 BAMBOO RS', 'Partly Delivered', '2026-01-15', '2026-01-21', 500, 222.42, 277.58, 67735, 'open', '[]'::jsonb, 'seed', 'imp-21'),
('SO-18564', 'BURNSHIELD (PTY) LTD', 'W00327', '200 Gsm Cotton Scrim Bleached x 200cm  5 rolls x 1000m', 'Partly Delivered', '2026-01-03', '2026-01-09', 5000, 2000, 3000, 421187.5, 'open', '[]'::jsonb, 'seed', 'imp-22'),
('SO-18671', 'DELTEX NARROW WEAVERS cc', 'YC04246', 'TEX 80/2 POLYESTER RS 5KG', 'Partly Delivered', '2026-01-02', '2026-01-07', 500, 331.76, 168.24, 31423.75, 'open', '[]'::jsonb, 'seed', 'imp-23'),
('SO-18789', 'THREAD FINESSE (PTY) LTD', 'YC04159', 'TEX 42/1 ACRYLIC RS BIRLA', 'Partly Delivered', '2026-01-04', '2026-01-11', 1000, 796.82, 203.18, 108330, 'open', '[]'::jsonb, 'seed', 'imp-24'),
('SO-18793', 'LEISUREWORLD SA(PTY)LTD', 'W01502', 'ULTRA LIGHT LINER X 280CM', 'Partly Delivered', '2026-01-08', '2026-01-12', 2000, 52, 1948, 132825, 'open', '[]'::jsonb, 'seed', 'imp-25'),
('SO-18830', 'HELM TEXTILES MILLS (PTY) LTD', 'YC04442', 'TEX 30/2 PES OE DURA SHINE BLACK', 'Partly Delivered', '2026-01-09', '2026-01-14', 500, 292.6, 207.4, 83950, 'open', '[]'::jsonb, 'seed', 'imp-26'),
('SO-18834', 'AFRICA CLEANING SUPPLIES (PTY) LTD', 'YP04327', 'TEX 1000/4 UNCUT MOP', 'Partly Delivered', '2026-01-18', '2026-01-21', 40000, 2054.5, 37945.5, 1311000, 'open', '[]'::jsonb, 'seed', 'imp-27'),
('SO-18835', 'AFRICA CLEANING SUPPLIES (PTY) LTD', 'YP04327', 'TEX 1000/4 UNCUT MOP', 'Partly Delivered', '2026-01-18', '2026-01-22', 40000, 2059.5, 37940.5, 1311000, 'open', '[]'::jsonb, 'seed', 'imp-28'),
('SO-18840', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W00385', 'EE250 HCR FABRIC RFL x 110cm  15 rolls x 1236m', 'Not Delivered', '2026-01-30', '2026-02-02', 18540, 0, 18540, 1012747.5, 'open', '[]'::jsonb, 'seed', 'imp-29'),
('SO-18841', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W00385', 'EE250 HCR FABRIC RFL x 95cm  18 rolls x 1236m', 'Partly Delivered', '2026-01-30', '2026-02-04', 9888, 5019, 4869, 500332.8, 'open', '[]'::jsonb, 'seed', 'imp-30'),
('SO-18843', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W01430', 'EE500 3/1 RIB RFL DIPPED x 110cm  14 rolls x 620m', 'Partly Delivered', '2026-01-30', '2026-02-05', 8680, 3742, 4938, 988717.1, 'open', '[]'::jsonb, 'seed', 'imp-31'),
('SO-18877', 'AMANA MEDICAL (PTY) LTD t/a AMANA HEALTH CARE (PTY) LTD', 'YC04402', 'TEX 30/1 PES/COT  65/35 OPEN END', 'Partly Delivered', '2026-01-21', '2026-01-26', 20000, 16337.32, 3662.68, 1265000, 'open', '[]'::jsonb, 'seed', 'imp-32'),
('SO-18878', 'AMANA MEDICAL (PTY) LTD t/a AMANA HEALTH CARE (PTY) LTD', 'YC00417', 'TEX 30/1 POLYESTER OE 190mm', 'Partly Delivered', '2026-01-21', '2026-01-24', 20000, 1140.61, 18859.39, 1334000, 'open', '[]'::jsonb, 'seed', 'imp-33'),
('SO-18883', 'PIANNA YARNS', 'YC01225', 'TEX 200/1 O + 200/1 BAM RING SPUN', 'Partly Delivered', '2026-01-02', '2026-01-06', 30, 14.01, 15.99, 4525.02, 'open', '[]'::jsonb, 'seed', 'imp-34'),
('SO-18901', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP00875', 'TEX 72/2 A COTTON OE', 'Partly Delivered', '2026-01-05', '2026-01-12', 5000, 2171, 2829, 340400, 'open', '[]'::jsonb, 'seed', 'imp-35'),
('SO-18905', 'EMPIRE GLOVES PTY LTD', 'YP04464', 'TEX 60/1 O COT OE 4.5 TF', 'Partly Delivered', '2026-01-19', '2026-01-24', 5000, 3936.5, 1063.5, 287500, 'open', '[]'::jsonb, 'seed', 'imp-36'),
('SO-18911', 'ARANDA TEXTILE MILLS (PTY)  LTD', 'YP02098', 'TEX 20/2 POLYESTER/COTTON OE 65/35', 'Partly Delivered', '2026-01-08', '2026-01-12', 20000, 14349, 5651, 1488100, 'open', '[]'::jsonb, 'seed', 'imp-37'),
('SO-18916', 'EMPIRE GLOVES PTY LTD', 'YC00043', 'TEX 72/1 D OPEN END YARN', 'Partly Delivered', '2026-01-19', '2026-01-25', 10000, 2695.98, 7304.02, 437000, 'open', '[]'::jsonb, 'seed', 'imp-38'),
('SO-18922', 'CHAMPION HEALTH CARE (PTY) LTD', 'YC01083', 'TEX 30/1 O COTTON OE 6.3TF STEAM', 'Partly Delivered', '2026-01-24', '2026-01-30', 2000, 1772.82, 227.18, 170154, 'open', '[]'::jsonb, 'seed', 'imp-39'),
('SO-18943', 'GENERAL BELTINGS (PVT) LTD', 'W00221', 'ZEP 315 RFL X 165CM  ,', 'Partly Delivered', '2026-01-09', '2026-01-15', 9126.36, 6385, 2741.36, 930888.72, 'open', '[]'::jsonb, 'seed', 'imp-40'),
('SO-18957', 'FENNER CONVEYOR BELTING', 'W01420', 'EE160 Fabric RFL X 154CM  2 ROLLS X 1050M', 'Partly Delivered', '2026-01-22', '2026-01-26', 2100, 801, 1299, 186196.5, 'open', '[]'::jsonb, 'seed', 'imp-41'),
('SO-18966', 'TRIDENT JUTE & HESSIAN PRODUCTS', 'YP04445', 'TEX 30/2 PES BLACK RS', 'Partly Delivered', '2026-01-24', '2026-01-29', 1500, 878, 622, 247641, 'open', '[]'::jsonb, 'seed', 'imp-42'),
('SO-18975', 'ABERDARE CABLES (PTY) LTD', 'YP00081', 'TEX 60/2 POLYESTER RS 2 //', 'Partly Delivered', '2026-01-19', '2026-01-23', 2000, 1648.5, 351.5, 221030, 'open', '[]'::jsonb, 'seed', 'imp-43'),
('SO-18976', 'DHOOGES TEXTILES PTY LTD', 'YP02240', 'TEX 50/1 O COTTON OPEN END YARN 4.8 TPM', 'Partly Delivered', '2026-01-15', '2026-01-19', 600, 445.5, 154.5, 6.9, 'open', '[]'::jsonb, 'seed', 'imp-44'),
('SO-18990', 'AFRI BRUSH PTY LTD t/a AFRICA BRUSHWARE', 'YP04327', 'TEX 1000/4 UNCUT MOP', 'Partly Delivered', '2026-01-09', '2026-01-16', 2500, 1512.9, 987.1, 86250, 'open', '[]'::jsonb, 'seed', 'imp-45'),
('SO-19015', 'SERENITY SOUTH AFRICA', 'YC00848', 'TEX 240/1 AOE-HOWX+25/1 PES BROWN', 'Partly Delivered', '2026-01-16', '2026-01-23', 500, 353.5, 146.5, 88837.5, 'open', '[]'::jsonb, 'seed', 'imp-46'),
('SO-19016', 'SERENITY SOUTH AFRICA', 'YC00824', 'TEX 240/1 A COT OE + 25/1 PES ECRU', 'Partly Delivered', '2026-01-16', '2026-01-21', 500, 107.76, 392.24, 88665, 'open', '[]'::jsonb, 'seed', 'imp-47'),
('SO-19025', 'HELM TEXTILES MILLS (PTY) LTD', 'YP04214', 'TEX 56/2 PES OE ECOPOLY SP01/TO1', 'Partly Delivered', '2026-01-09', '2026-01-16', 20000, 13072.5, 6927.5, 1408750, 'open', '[]'::jsonb, 'seed', 'imp-48'),
('SO-19059', 'LOOMCRAFT FABRICS (PTY) LTD', 'W00469', 'COTTON CANVAS 300G X 153CM  ,', 'Partly Delivered', '2026-01-20', '2026-01-26', 20000, 13219, 6781, 874000, 'open', '[]'::jsonb, 'seed', 'imp-49'),
('SO-19151', 'SVENMILL (PTY) LTD', 'YC00297', 'TEX 25/2 O COTTON RS 500TPM', 'Partly Delivered', '2026-01-10', '2026-01-17', 2000, 1420.42, 579.58, 148350, 'open', '[]'::jsonb, 'seed', 'imp-50'),
('SO-19166', 'MULLER KNITWEAR', 'YC00776', 'TEX 100/1 A COTTON RS SLUB EP28', 'Partly Delivered', '2026-01-27', '2026-02-02', 120, 48.28, 71.72, 23322, 'open', '[]'::jsonb, 'seed', 'imp-51'),
('SO-19177', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP04245', 'TEX 100/1 O COT OE - 5.2 TF', 'Partly Delivered', '2026-01-05', '2026-01-10', 6000, 5314.5, 685.5, 343275, 'open', '[]'::jsonb, 'seed', 'imp-52'),
('SO-19179', 'AFRICA CLEANING SUPPLIES (PTY) LTD', 'YP00827', 'TEX 1000/4 D OE 2// NAT + 2// BLUE', 'Not Delivered', '2026-01-18', '2026-01-22', 250, 0, 250, 24443.25, 'open', '[]'::jsonb, 'seed', 'imp-53'),
('SO-19182', 'DHOOGES TEXTILES PTY LTD', 'YP04209', 'TEX 25/1 COTTON RS 4.25 TF', 'Partly Delivered', '2026-01-15', '2026-01-19', 3000, 2745, 255, 222525, 'open', '[]'::jsonb, 'seed', 'imp-54'),
('SO-19207', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP03027', 'TEX 60/1 O COTTON OE STEAM', 'Partly Delivered', '2026-01-05', '2026-01-12', 15000, 5670, 9330, 865950, 'open', '[]'::jsonb, 'seed', 'imp-55'),
('SO-19223', 'CURTEX TEXTILES INDUSTRIES (PTY) LTD', 'YC00577', 'TEX 80/6 POLYESTER RS RW', 'Partly Delivered', '2026-01-29', '2026-02-04', 1000, 897.92, 102.08, 63020, 'open', '[]'::jsonb, 'seed', 'imp-56'),
('SO-19227', 'ADVANCED VALVE CC', 'W00207', 'PCW 8 RFL X 150CM  5 ROLLS X 200M', 'Partly Delivered', '2026-01-02', '2026-01-05', 1000, 450, 550, 315468, 'open', '[]'::jsonb, 'seed', 'imp-57'),
('SO-19234', 'MOHAIR SPINNERS SOUTH AFRICA PTY LTD', 'YP04296', 'TEX 25/2 O COTTON RS 330 DYE -CHEESES', 'Partly Delivered', '2026-01-26', '2026-01-29', 30000, 3647.3, 26352.7, 2306325, 'open', '[]'::jsonb, 'seed', 'imp-58'),
('SO-19258', 'BUCKLE PACKAGING (PTY) LTD', 'YC02110', 'TEX 80/3 POLYESTER RS SO', 'Partly Delivered', '2026-01-22', '2026-01-25', 10000, 6686.58, 3313.42, 569825, 'open', '[]'::jsonb, 'seed', 'imp-59'),
('SO-19277', 'HESTER BESTER', 'YC01225', 'TEX 200/1 O + 200/1 BAM RING SPUN', 'Partly Delivered', '2026-01-27', '2026-01-31', 200, 92.79, 107.21, 22862, 'open', '[]'::jsonb, 'seed', 'imp-60'),
('SO-19296', 'TANZI ZIMBABWE', 'YP04344', 'TEX 80/3 POLYESTER RS 2KG WAXED', 'Partly Delivered', '2026-01-07', '2026-01-11', 3000, 1008, 1992, 159000, 'open', '[]'::jsonb, 'seed', 'imp-61'),
('SO-19305', 'L-FLEX CC', 'W00756', 'DVT3 RFL X 80CM  4 ROLLS X 300M', 'Partly Delivered', '2026-01-24', '2026-01-30', 1200, 915, 285, 176336.4, 'open', '[]'::jsonb, 'seed', 'imp-62'),
('SO-19309', 'CAPRICON  ZAMBIA LTD', 'YC04475', 'TEX 80/3 PES R/S 150 Grams  5000 CONES', 'Partly Delivered', '2026-01-15', '2026-01-22', 750, 395.12, 354.88, 63750, 'open', '[]'::jsonb, 'seed', 'imp-63'),
('SO-19319', 'AFRICA SUNOIL REFINERIES (PTY) LTD', 'YC00768', 'TEX 200/4 A OE RW', 'Partly Delivered', '2026-01-12', '2026-01-15', 3000, 2915.56, 84.44, 249262.5, 'open', '[]'::jsonb, 'seed', 'imp-64'),
('SO-19320', 'BIAS BINDING SPECIALIST cc', 'YC00050', 'TEX 50/36 POLYESTER RS 1Kg', 'Partly Delivered', '2026-01-10', '2026-01-16', 1000, 524.18, 475.82, 147200, 'open', '[]'::jsonb, 'seed', 'imp-65'),
('SO-19327', 'TOGA LININGS (PTY) LTD', 'YP00657', 'TEX 50/2 POLYESTER OE,', 'Partly Delivered', '2026-01-04', '2026-01-10', 5000, 3387.5, 1612.5, 315100, 'open', '[]'::jsonb, 'seed', 'imp-66'),
('SO-19328', 'HELM TEXTILES MILLS (PTY) LTD', 'YC02567', 'TEX 100/1 COT SL+ 167DTEX COL', 'Partly Delivered', '2026-01-09', '2026-01-16', 500, 442.78, 57.22, 53935, 'open', '[]'::jsonb, 'seed', 'imp-67'),
('SO-19337', 'ZORBCO (PTY) LTD', 'YC01264', 'TEX 80/3 POLYESTER RS 5KG PRECISION WAX', 'Partly Delivered', '2026-01-06', '2026-01-12', 500, 479.04, 20.96, 29037.5, 'open', '[]'::jsonb, 'seed', 'imp-68'),
('SO-19341', 'ABUBAKKAR TRADING', 'YP04327', 'TEX 1000/4 UNCUT MOP', 'Partly Delivered', '2026-01-08', '2026-01-15', 20000, 12234, 7766, 690000, 'open', '[]'::jsonb, 'seed', 'imp-69'),
('SO-19342', 'TOGA LININGS (PTY) LTD', 'YP04163', 'TEX 50/ PES/COT OE 65/35', 'Partly Delivered', '2026-01-04', '2026-01-09', 15000, 7316, 7684, 991875, 'open', '[]'::jsonb, 'seed', 'imp-70'),
('SO-19361', 'DELTEX NARROW WEAVERS cc', 'YC00577', 'TEX 80/6 POLYESTER RS RW', 'Partly Delivered', '2026-01-02', '2026-01-09', 500, 401.14, 98.86, 32947.5, 'open', '[]'::jsonb, 'seed', 'imp-71'),
('SO-19364', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'YP00099', 'TEX 200/1 D OE', 'Partly Delivered', '2026-01-30', '2026-02-02', 30000, 14214.5, 15785.5, 1207500, 'open', '[]'::jsonb, 'seed', 'imp-72'),
('SO-19375', 'L-FLEX CC', 'W00756', 'DVT3 RFL X 80CM  1 ROLL X 300M', 'Not Delivered', '2026-01-24', '2026-01-27', 300, 0, 300, 44084.1, 'open', '[]'::jsonb, 'seed', 'imp-73'),
('SO-19384', 'TOGA LININGS (PTY) LTD', 'YP04090', 'TEX 70/3 AOE COTTON OE', 'Partly Delivered', '2026-01-04', '2026-01-11', 15000, 8640.5, 6359.5, 1017750, 'open', '[]'::jsonb, 'seed', 'imp-74'),
('SO-19391', 'ROKETSAN', 'W00533', 'PCW8 LOOMSTATE X 150CM  13 ROLLS X 200M', 'Not Delivered', '2026-01-26', '2026-01-31', 2600, 0, 2600, 28470, 'open', '[]'::jsonb, 'seed', 'imp-75'),
('SO-19400', 'NATIONAL BRAIDING INDUSTRIES PTY LTD', 'YC01004', 'TEX 200/4 D OE 170-S', 'Not Delivered', '2026-01-12', '2026-01-17', 150, 0, 150, 9798, 'open', '[]'::jsonb, 'seed', 'imp-76'),
('SO-19411', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W00736', 'DVT5 RFL X 155CM  1 ROLL X 1236M', 'Not Delivered', '2026-01-30', '2026-02-02', 1236, 0, 1236, 81389.36, 'open', '[]'::jsonb, 'seed', 'imp-77'),
('SO-19430', 'CURTEX TEXTILES INDUSTRIES (PTY) LTD', 'YC04344', 'TEX 80/3 POLYESTER RS 2KG WAXED', 'Partly Delivered', '2026-01-29', '2026-02-03', 1000, 431.92, 568.08, 61640, 'open', '[]'::jsonb, 'seed', 'imp-78'),
('SO-19447', 'HELM TEXTILES MILLS (PTY) LTD', 'YC03069', 'TEX 30/2 O COTTON OE 450-S', 'Partly Delivered', '2026-01-09', '2026-01-15', 500, 336.01, 163.99, 36570, 'open', '[]'::jsonb, 'seed', 'imp-79'),
('SO-19448', 'BOARDMAN BROTHERS (NATAL) (PTY) LTD', 'YC00901', 'TEX 72/3 A COTTON OE 170S', 'Partly Delivered', '2026-01-05', '2026-01-09', 3000, 905.46, 2094.54, 234600, 'open', '[]'::jsonb, 'seed', 'imp-80'),
('SO-19451', 'RHEOLA KNITWEAR           SUNDRY', 'YC03036', 'TEX 25/2 O COTTON RS 1Kg 500S,', 'Partly Delivered', '2026-01-04', '2026-01-10', 200, 101.8, 98.2, 15306.5, 'open', '[]'::jsonb, 'seed', 'imp-81'),
('SO-19454', 'GOLDENGLO CANDLE & SOAP MANUFACTURES (PTY) LTD', 'YC04303', 'TEX 200/3 AOE R/W', 'Partly Delivered', '2026-01-05', '2026-01-08', 2000, 661.38, 1338.62, 156400, 'open', '[]'::jsonb, 'seed', 'imp-82'),
('SO-19462', 'LION MATCH PRODUCTS PTY LTD', 'YC00219', 'TEX 200/3 A COTTON RS RW', 'Partly Delivered', '2026-01-14', '2026-01-19', 3000, 724.63, 2275.37, 279001.5, 'open', '[]'::jsonb, 'seed', 'imp-83'),
('SO-19505', 'NARROWTEX (PTY) LTD', 'YC00577', 'TEX 80/6 POLYESTER RS RW', 'Partly Delivered', '2026-01-05', '2026-01-12', 1000, 984, 16, 54912.5, 'open', '[]'::jsonb, 'seed', 'imp-84'),
('SO-19506', 'NARROWTEX (PTY) LTD', 'YC00445', 'TEX 80/3 POLYESTER RS', 'Partly Delivered', '2026-01-05', '2026-01-09', 600, 244.06, 355.94, 32947.5, 'open', '[]'::jsonb, 'seed', 'imp-85'),
('SO-19510', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP00818', 'TEX 36/1 O COTTON R66 OE', 'Not Delivered', '2026-01-05', '2026-01-12', 13500, 0, 13500, 824377.5, 'open', '[]'::jsonb, 'seed', 'imp-86'),
('SO-19511', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP04176', 'TEX 42/1 O COTTON OE R66', 'Partly Delivered', '2026-01-05', '2026-01-08', 30000, 26278.5, 3721.5, 1759500, 'open', '[]'::jsonb, 'seed', 'imp-87'),
('SO-19512', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP04280', 'TEX 72/1 O COTTON OE 5.2 TF', 'Partly Delivered', '2026-01-05', '2026-01-10', 3600, 1791.5, 1808.5, 205965, 'open', '[]'::jsonb, 'seed', 'imp-88'),
('SO-19513', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP00875', 'TEX 72/2 A COTTON OE', 'Partly Delivered', '2026-01-05', '2026-01-12', 3000, 2282.5, 717.5, 204240, 'open', '[]'::jsonb, 'seed', 'imp-89'),
('SO-19514', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP04245', 'TEX 100/1 O COT OE - 5.2 TF', 'Partly Delivered', '2026-01-05', '2026-01-12', 2400, 1747, 653, 137310, 'open', '[]'::jsonb, 'seed', 'imp-90'),
('SO-19526', 'GLASSER & ASSOCIATES CC  T/A AMELIA JACKSON INDUSTRIES', 'YC04479', 'TEX 870/5 COT TAUPE', 'Not Delivered', '2026-01-13', '2026-01-17', 180, 0, 180, 32602.5, 'open', '[]'::jsonb, 'seed', 'imp-91'),
('SO-19532', 'DHOOGES TEXTILES PTY LTD', 'YP04172', 'TEX 20/1 O COTTON RS 4.5 TF', 'Partly Delivered', '2026-01-15', '2026-01-19', 1000, 238, 762, 87400, 'open', '[]'::jsonb, 'seed', 'imp-92'),
('SO-19539', 'BSN MEDICAL (PTY) LTD', 'NP6201', 'NE 24/1 VISCOSE YARN', 'Not Delivered', '2026-01-29', '2026-02-03', 1000, 0, 1000, 92000, 'open', '[]'::jsonb, 'seed', 'imp-93'),
('SO-19547', 'S.A.A.  T/A GARY''S COTTON SHOP', 'YC00074', 'TEX 80/4 POLYESTER RS 1.8-2.0Kg', 'Partly Delivered', '2026-01-13', '2026-01-17', 300, 225.58, 74.42, 20631, 'open', '[]'::jsonb, 'seed', 'imp-94'),
('SO-19548', 'NARROWTEX (PTY) LTD', 'YC00540', 'TEX 80/2 POLYESTER RS,', 'Partly Delivered', '2026-01-05', '2026-01-12', 620, 613.12, 6.88, 34045.75, 'open', '[]'::jsonb, 'seed', 'imp-95'),
('SO-19564', 'BUCKLE PACKAGING (PTY) LTD', 'YC00445', 'TEX 80/3 POLYESTER RS', 'Partly Delivered', '2026-01-22', '2026-01-29', 5000, 1950.08, 3049.92, 263062.5, 'open', '[]'::jsonb, 'seed', 'imp-96'),
('SO-19565', 'BUCKLE PACKAGING (PTY) LTD', 'YC01053', 'TEX 80/3 POLYESTER RS', 'Partly Delivered', '2026-01-22', '2026-01-25', 15000, 9745.88, 5254.12, 789187.5, 'open', '[]'::jsonb, 'seed', 'imp-97'),
('SO-19568', 'BLOMI HEKELGESKENKE EN WOLWÊRELD', 'YC02242', 'TEX 600/4 A COTTON RING SPUN YARN', 'Partly Delivered', '2026-01-21', '2026-01-28', 30, 24.65, 5.35, 3277.5, 'open', '[]'::jsonb, 'seed', 'imp-98'),
('SO-19569', 'BLOMI HEKELGESKENKE EN WOLWÊRELD', 'YC00219', 'TEX 200/3 A COTTON RS RW', 'Partly Delivered', '2026-01-21', '2026-01-26', 30, 23.88, 6.12, 3622.5, 'open', '[]'::jsonb, 'seed', 'imp-99'),
('SO-19573', 'ARTFULLY DYED (PTY) LTD t/a COLOURSPUN', 'YC00336', 'TEX 150/2 O COTTON RS', 'Partly Delivered', '2026-01-10', '2026-01-16', 100, 63.52, 36.48, 11165.35, 'open', '[]'::jsonb, 'seed', 'imp-100'),
('SO-19580', 'THE ROPEWORX (PTY) LTD', 'YC03073', 'TEX 100/6 DOE 2Kg', 'Partly Delivered', '2026-01-10', '2026-01-13', 400, 375.8, 24.2, 23529, 'open', '[]'::jsonb, 'seed', 'imp-101'),
('SO-19582', 'EMPIRE GLOVES PTY LTD', 'YC00063', 'TEX 72/1 A COTTON RS 3.0 WAX', 'Partly Delivered', '2026-01-19', '2026-01-22', 1500, 1118.06, 381.94, 110693.25, 'open', '[]'::jsonb, 'seed', 'imp-102'),
('SO-19608', 'MONN CARPETS (PTY) LTD', 'YP00057', 'TEX 60/3 POLYESTER RS ,', 'Partly Delivered', '2026-01-27', '2026-02-01', 6000, 3344, 2656, 449190, 'open', '[]'::jsonb, 'seed', 'imp-103'),
('SO-19627', 'WEBTEX PVT LTD', 'YP02084', 'TEX 1440/1 POLYESTER FLAT', 'Partly Delivered', '2026-01-03', '2026-01-08', 3000, 2880, 120, 144000, 'open', '[]'::jsonb, 'seed', 'imp-104'),
('SO-19630', 'SPORTING LIFE PRODUCTS AND SERVICES (PTY) LTD', 'W00904', '500GM O/PES HOSE RFL X 95CM  10 ROLLS X 250M', 'Partly Delivered', '2026-01-25', '2026-01-29', 2500, 1590, 910, 229367.5, 'open', '[]'::jsonb, 'seed', 'imp-105'),
('SO-19638', 'PIONEER BRAIDERS PTY LTD', 'YC00378', 'TEX 100/1 DOE SPECIAL', 'Partly Delivered', '2026-01-16', '2026-01-19', 1000, 733.74, 266.26, 48185, 'open', '[]'::jsonb, 'seed', 'imp-106'),
('SO-19639', 'RUDANT PTY LTD', 'YC04279', 'TEX 100/2 A COTTON R/S RUDANT 2', 'Partly Delivered', '2026-01-19', '2026-01-23', 1500, 330.56, 1169.44, 148350, 'open', '[]'::jsonb, 'seed', 'imp-107'),
('SO-19646', 'EMPIRE GLOVES PTY LTD', 'YC04486', 'TEX 84/1 A COTTON R/S 3.2 TF H/WAX', 'Partly Delivered', '2026-01-19', '2026-01-26', 1000, 386.16, 613.84, 70265, 'open', '[]'::jsonb, 'seed', 'imp-108'),
('SO-19657', 'LOGATI TEXTILES CC', 'YP00169', 'MIXED MUTTON CLOTH', 'Partly Delivered', '2026-01-05', '2026-01-08', 2000, 1699, 301, 69000, 'open', '[]'::jsonb, 'seed', 'imp-109'),
('SO-19658', 'D H BROTHERS INDUSTRIES PTY LTD', 'YC04512', 'TEX 185/5 D COTTON OE', 'Partly Delivered', '2026-01-14', '2026-01-17', 500, 360.42, 139.58, 25817.5, 'open', '[]'::jsonb, 'seed', 'imp-110'),
('SO-19659', 'PENTAGON FIBRES (PTY) LTD', 'YP04472', 'TEX 100/1 DOE SPECIAL D', 'Partly Delivered', '2026-01-04', '2026-01-10', 14000, 3744.5, 10255.5, 531300, 'open', '[]'::jsonb, 'seed', 'imp-111'),
('SO-19664', 'CHEMICAL VULCANISING SYSTEMS PTY LTD', 'W01539', 'N595 HEATSET x 140cm   1 roll x 200m', 'Not Delivered', '2026-01-19', '2026-01-22', 200, 0, 200, 33223.5, 'open', '[]'::jsonb, 'seed', 'imp-112'),
('SO-19668', 'ASISEBENZE HOLDINGS (PTY) LTD', 'YM04240', 'CROCHET/NARROW WIDTH FABRIC', 'Partly Delivered', '2026-01-11', '2026-01-18', 100, 41.5, 58.5, 8510, 'open', '[]'::jsonb, 'seed', 'imp-113'),
('SO-19672', 'DHOOGES TEXTILES PTY LTD', 'YC04172', 'TEX 20/1 O COTTON RS 4.5 TF', 'Partly Delivered', '2026-01-15', '2026-01-19', 1000, 477.83, 522.17, 87400, 'open', '[]'::jsonb, 'seed', 'imp-114'),
('SO-19673', 'MZANSI BRAIDERS (PTY) LTD', 'YC04271', 'TEX 138/2 PES R/S BOM 2 200S', 'Not Delivered', '2026-01-28', '2026-02-01', 590, 0, 590, 25783, 'open', '[]'::jsonb, 'seed', 'imp-115'),
('SO-19676', 'TRANSVAAL RUBBER CO PTY LTD t/a TRUCO', 'YC00529', 'TEX 1100/20 C.F POLYESTER', 'Partly Delivered', '2026-01-22', '2026-01-28', 500, 479.5, 20.5, 48673.75, 'open', '[]'::jsonb, 'seed', 'imp-116'),
('SO-19680', 'FENNER CONVEYOR BELTING - AUSTRALIA', 'YC04020', 'TEX 940/1 NYLON + 150/2 COT + 138/2 PES + 188/1 NYLON', 'Partly Delivered', '2026-01-21', '2026-01-28', 475, 331.22, 143.78, 1724.25, 'open', '[]'::jsonb, 'seed', 'imp-117'),
('SO-19692', 'SOURCE KNITTING', 'YP04544', 'TEX 72/1 PES/COT OE R28', 'Partly Delivered', '2026-01-30', '2026-02-03', 3000, 2229, 771, 96600, 'open', '[]'::jsonb, 'seed', 'imp-118'),
('SO-19695', 'COTTON GIRLS', 'YC00848', 'TEX 240/1 AOE-HOWX+25/1 PES BROWN', 'Partly Delivered', '2026-01-29', '2026-02-03', 1000, 228.67, 771.33, 172500, 'open', '[]'::jsonb, 'seed', 'imp-119'),
('SO-19699', 'BOTE INDUSTRIES (PTY) LTD', 'YC00529', 'TEX 1100/20 C.F POLYESTER  1 carton X 35kg', 'Partly Delivered', '2026-01-13', '2026-01-20', 35, 27.88, 7.12, 3823.75, 'open', '[]'::jsonb, 'seed', 'imp-120'),
('SO-19715', 'SPRADBURY POOLSKIM Cc', 'W00272', 'BLUE POOL NON UV LOOMSTATE x 135cm  6 rolls x 100m', 'Partly Delivered', '2026-01-20', '2026-01-27', 600, 294, 306, 46423.2, 'open', '[]'::jsonb, 'seed', 'imp-121'),
('SO-19719', 'TFG SLC RECEIVING BAY', 'W01536', 'COTTON HEMP SCOURED x 150cm  ,', 'Partly Delivered', '2026-01-08', '2026-01-14', 500, 30, 470, 87578.25, 'open', '[]'::jsonb, 'seed', 'imp-122'),
('SO-19729', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W00736', 'DVT5 RFL X 155CM  1 ROLL X 1236M', 'Not Delivered', '2026-01-30', '2026-02-03', 1236, 0, 1236, 81389.36, 'open', '[]'::jsonb, 'seed', 'imp-123'),
('SO-19730', 'DUNLOP BELTING PRODUCTS (PTY) LTD', 'W01508', 'DPP 2000/1 ARAMID VS FABRIC RFL X 95CM  1 ROLL X 426M', 'Not Delivered', '2026-01-30', '2026-02-06', 426, 0, 426, 455607, 'open', '[]'::jsonb, 'seed', 'imp-124'),
('SO-19734', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP04176', 'TEX 42/1 O COTTON OE R66', 'Not Delivered', '2026-01-05', '2026-01-09', 21000, 0, 21000, 1231650, 'open', '[]'::jsonb, 'seed', 'imp-125'),
('SO-19735', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP03027', 'TEX 60/1 O COTTON OE STEAM', 'Not Delivered', '2026-01-05', '2026-01-10', 9000, 0, 9000, 519570, 'open', '[]'::jsonb, 'seed', 'imp-126'),
('SO-19736', 'THE GOOD HOPE TEXTILE CORPORATION (PTY) LTD', 'YP04245', 'TEX 100/1 O COT OE - 5.2 TF', 'Not Delivered', '2026-01-05', '2026-01-11', 1500, 0, 1500, 85818.75, 'open', '[]'::jsonb, 'seed', 'imp-127'),
('SO-19745', 'NURTURING FIBRES', 'YC00790', 'TEX 200/2 O COTTON RS', 'Partly Delivered', '2026-01-15', '2026-01-20', 300, 168.1, 131.9, 38277.75, 'open', '[]'::jsonb, 'seed', 'imp-128'),
('SO-19746', 'DELTEX NARROW WEAVERS cc', 'YC00540', 'TEX 80/2 POLYESTER RS,', 'Not Delivered', '2026-01-02', '2026-01-08', 500, 0, 500, 31423.75, 'open', '[]'::jsonb, 'seed', 'imp-129'),
('SO-19753', 'UNITED UNTERTRADE CC / KAROO LOOMS', 'YC03047', 'TEX 870/5 A COTTON OE', 'Partly Delivered', '2026-01-24', '2026-01-31', 15, 5, 10, 1276.5, 'open', '[]'::jsonb, 'seed', 'imp-130'),
('SO-19758', 'CURTEX TEXTILES INDUSTRIES (PTY) LTD', 'YC00540', 'TEX 80/2 POLYESTER RS,', 'Partly Delivered', '2026-01-29', '2026-02-04', 500, 363.84, 136.16, 30820, 'open', '[]'::jsonb, 'seed', 'imp-131'),
('SO-19766', 'NARROWTEX (PTY) LTD', 'YC00540', 'TEX 80/2 POLYESTER RS,', 'Partly Delivered', '2026-01-05', '2026-01-08', 1000, 128.8, 871.2, 54912.5, 'open', '[]'::jsonb, 'seed', 'imp-132'),
('SO-19767', 'NARROWTEX (PTY) LTD', 'YC00074', 'TEX 80/4 POLYESTER RS 1.8-2.0Kg', 'Partly Delivered', '2026-01-05', '2026-01-09', 600, 187.77, 412.23, 32947.5, 'open', '[]'::jsonb, 'seed', 'imp-133'),
('SO-19768', 'NARROWTEX (PTY) LTD', 'YC00577', 'TEX 80/6 POLYESTER RS RW', 'Partly Delivered', '2026-01-05', '2026-01-09', 1000, 797.44, 202.56, 54912.5, 'open', '[]'::jsonb, 'seed', 'imp-134'),
('SO-19769', 'NARROWTEX (PTY) LTD', 'YC02290', 'TEX 80/9 POLYESTER RS RW BOM-2', 'Partly Delivered', '2026-01-05', '2026-01-08', 600, 131.12, 468.88, 32947.5, 'open', '[]'::jsonb, 'seed', 'imp-135'),
('SO-19774', 'NURTURING FIBRES', 'YC01225', 'TEX 200/1 O + 200/1 BAM RING SPUN', 'Partly Delivered', '2026-01-15', '2026-01-20', 150, 36.43, 113.57, 19173.38, 'open', '[]'::jsonb, 'seed', 'imp-136'),
('SO-19775', 'DJN NARROW WEAVERS(PTY) LTD', 'YC03033', 'TEX 50/3 POLYESTER OE BOM2', 'Not Delivered', '2026-01-04', '2026-01-07', 600, 0, 600, 46029.9, 'open', '[]'::jsonb, 'seed', 'imp-137')
ON CONFLICT (seed_key) DO NOTHING;
