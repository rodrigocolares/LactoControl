
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.insemination_method AS ENUM ('ia', 'monta_natural', 'iatf');
CREATE TYPE public.pregnancy_result AS ENUM ('positivo', 'negativo', 'duvidoso');
CREATE TYPE public.delivery_type AS ENUM ('normal', 'distocico', 'cesariana');
CREATE TYPE public.calf_sex AS ENUM ('macho', 'femea');
CREATE TYPE public.expense_category AS ENUM ('racao', 'medicamento', 'mao_de_obra', 'energia', 'manutencao', 'sanidade', 'reproducao', 'outros');
CREATE TYPE public.medication_unit AS ENUM ('ml', 'g', 'mg', 'kg', 'l', 'dose', 'comprimido');

-- ============================================================
-- Generic guard trigger for property-scoped tables with cow_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.property_scoped_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cow_property UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
    IF NEW.property_id IS NULL THEN NEW.property_id := public.current_user_property_id(); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'property_id cannot be changed';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by cannot be changed';
    END IF;
  END IF;

  -- If row has a cow_id column, ensure same property
  IF to_jsonb(NEW) ? 'cow_id' AND (to_jsonb(NEW)->>'cow_id') IS NOT NULL THEN
    SELECT property_id INTO v_cow_property FROM public.cows WHERE id = (to_jsonb(NEW)->>'cow_id')::uuid;
    IF v_cow_property IS NULL OR v_cow_property <> NEW.property_id THEN
      RAISE EXCEPTION 'cow must belong to the same property';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- FASE 4 — REPRODUTIVO
-- ============================================================

-- Heats
CREATE TABLE public.heats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE CASCADE,
  heat_date DATE NOT NULL,
  intensity TEXT,
  observed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heats TO authenticated;
GRANT ALL ON public.heats TO service_role;
ALTER TABLE public.heats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "heats_owner_all" ON public.heats FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER heats_guard BEFORE INSERT OR UPDATE ON public.heats
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER heats_set_updated_at BEFORE UPDATE ON public.heats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER heats_audit AFTER INSERT OR UPDATE OR DELETE ON public.heats
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX heats_cow_idx ON public.heats (cow_id, heat_date DESC);
CREATE INDEX heats_property_idx ON public.heats (property_id, heat_date DESC);

-- Inseminations
CREATE TABLE public.inseminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE CASCADE,
  insemination_date DATE NOT NULL,
  method public.insemination_method NOT NULL DEFAULT 'ia',
  bull_or_semen TEXT,
  technician TEXT,
  batch_number TEXT,
  iatf_protocol TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inseminations TO authenticated;
GRANT ALL ON public.inseminations TO service_role;
ALTER TABLE public.inseminations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inseminations_owner_all" ON public.inseminations FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER inseminations_guard BEFORE INSERT OR UPDATE ON public.inseminations
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER inseminations_set_updated_at BEFORE UPDATE ON public.inseminations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inseminations_audit AFTER INSERT OR UPDATE OR DELETE ON public.inseminations
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX inseminations_cow_idx ON public.inseminations (cow_id, insemination_date DESC);
CREATE INDEX inseminations_property_idx ON public.inseminations (property_id, insemination_date DESC);

-- Pregnancy checks
CREATE TABLE public.pregnancy_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE CASCADE,
  insemination_id UUID REFERENCES public.inseminations(id) ON DELETE SET NULL,
  check_date DATE NOT NULL,
  result public.pregnancy_result NOT NULL,
  method TEXT,
  gestation_days INTEGER,
  expected_calving_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_checks TO authenticated;
GRANT ALL ON public.pregnancy_checks TO service_role;
ALTER TABLE public.pregnancy_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pregnancy_checks_owner_all" ON public.pregnancy_checks FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER pregnancy_checks_guard BEFORE INSERT OR UPDATE ON public.pregnancy_checks
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER pregnancy_checks_set_updated_at BEFORE UPDATE ON public.pregnancy_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pregnancy_checks_audit AFTER INSERT OR UPDATE OR DELETE ON public.pregnancy_checks
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX pregnancy_checks_cow_idx ON public.pregnancy_checks (cow_id, check_date DESC);

-- Calvings
CREATE TABLE public.calvings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE CASCADE,
  calving_date DATE NOT NULL,
  delivery_type public.delivery_type NOT NULL DEFAULT 'normal',
  calf_sex public.calf_sex,
  calf_weight_kg NUMERIC(6,2),
  calf_ear_tag TEXT,
  calf_name TEXT,
  stillborn BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calvings TO authenticated;
GRANT ALL ON public.calvings TO service_role;
ALTER TABLE public.calvings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calvings_owner_all" ON public.calvings FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER calvings_guard BEFORE INSERT OR UPDATE ON public.calvings
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER calvings_set_updated_at BEFORE UPDATE ON public.calvings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER calvings_audit AFTER INSERT OR UPDATE OR DELETE ON public.calvings
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX calvings_cow_idx ON public.calvings (cow_id, calving_date DESC);

-- ============================================================
-- FASE 5 — VETERINÁRIO
-- ============================================================

-- Medications (catalog)
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  active_ingredient TEXT,
  manufacturer TEXT,
  unit public.medication_unit NOT NULL DEFAULT 'ml',
  withdrawal_milk_days INTEGER NOT NULL DEFAULT 0,
  withdrawal_meat_days INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medications_owner_all" ON public.medications FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER medications_guard BEFORE INSERT OR UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER medications_set_updated_at BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER medications_audit AFTER INSERT OR UPDATE OR DELETE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Medication stock entries
CREATE TABLE public.medication_stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,4),
  batch_number TEXT,
  expiration_date DATE,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_stock_entries TO authenticated;
GRANT ALL ON public.medication_stock_entries TO service_role;
ALTER TABLE public.medication_stock_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medication_stock_owner_all" ON public.medication_stock_entries FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE OR REPLACE FUNCTION public.medication_stock_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_med_property UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
    IF NEW.property_id IS NULL THEN NEW.property_id := public.current_user_property_id(); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN RAISE EXCEPTION 'property_id cannot be changed'; END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'created_by cannot be changed'; END IF;
  END IF;
  SELECT property_id INTO v_med_property FROM public.medications WHERE id = NEW.medication_id;
  IF v_med_property IS NULL OR v_med_property <> NEW.property_id THEN
    RAISE EXCEPTION 'medication must belong to the same property';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER medication_stock_guard_trg BEFORE INSERT OR UPDATE ON public.medication_stock_entries
  FOR EACH ROW EXECUTE FUNCTION public.medication_stock_guard();
CREATE TRIGGER medication_stock_set_updated_at BEFORE UPDATE ON public.medication_stock_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER medication_stock_audit AFTER INSERT OR UPDATE OR DELETE ON public.medication_stock_entries
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX medication_stock_med_idx ON public.medication_stock_entries (medication_id, entry_date DESC);

-- Clinical events
CREATE TABLE public.clinical_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  disease TEXT NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
  milk_withdrawal_until DATE,
  meat_withdrawal_until DATE,
  responsible_person TEXT,
  cost NUMERIC(12,2),
  resolved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_events TO authenticated;
GRANT ALL ON public.clinical_events TO service_role;
ALTER TABLE public.clinical_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical_events_owner_all" ON public.clinical_events FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER clinical_events_guard BEFORE INSERT OR UPDATE ON public.clinical_events
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER clinical_events_set_updated_at BEFORE UPDATE ON public.clinical_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clinical_events_audit AFTER INSERT OR UPDATE OR DELETE ON public.clinical_events
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX clinical_events_cow_idx ON public.clinical_events (cow_id, event_date DESC);
CREATE INDEX clinical_events_property_idx ON public.clinical_events (property_id, event_date DESC);

-- Lab exams
CREATE TABLE public.lab_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  cow_id UUID REFERENCES public.cows(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  exam_type TEXT NOT NULL,
  result TEXT,
  ccs_value INTEGER,
  laboratory TEXT,
  cost NUMERIC(12,2),
  notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exams TO authenticated;
GRANT ALL ON public.lab_exams TO service_role;
ALTER TABLE public.lab_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_exams_owner_all" ON public.lab_exams FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER lab_exams_guard BEFORE INSERT OR UPDATE ON public.lab_exams
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER lab_exams_set_updated_at BEFORE UPDATE ON public.lab_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lab_exams_audit AFTER INSERT OR UPDATE OR DELETE ON public.lab_exams
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX lab_exams_property_idx ON public.lab_exams (property_id, exam_date DESC);

-- Vet visits
CREATE TABLE public.vet_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  visit_date DATE NOT NULL,
  vet_name TEXT NOT NULL,
  reason TEXT,
  cows_attended INTEGER,
  cost NUMERIC(12,2),
  next_visit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_visits TO authenticated;
GRANT ALL ON public.vet_visits TO service_role;
ALTER TABLE public.vet_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vet_visits_owner_all" ON public.vet_visits FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER vet_visits_guard BEFORE INSERT OR UPDATE ON public.vet_visits
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER vet_visits_set_updated_at BEFORE UPDATE ON public.vet_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vet_visits_audit AFTER INSERT OR UPDATE OR DELETE ON public.vet_visits
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX vet_visits_property_idx ON public.vet_visits (property_id, visit_date DESC);

-- ============================================================
-- FASE 6 — FINANCEIRO
-- ============================================================

-- Milk sales
CREATE TABLE public.milk_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  sale_date DATE NOT NULL,
  reference_month INTEGER NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year INTEGER NOT NULL CHECK (reference_year BETWEEN 2000 AND 2100),
  buyer TEXT,
  liters NUMERIC(12,2) NOT NULL CHECK (liters >= 0),
  price_per_liter NUMERIC(10,4) NOT NULL CHECK (price_per_liter >= 0),
  total_amount NUMERIC(14,2) NOT NULL,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milk_sales TO authenticated;
GRANT ALL ON public.milk_sales TO service_role;
ALTER TABLE public.milk_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milk_sales_owner_all" ON public.milk_sales FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE OR REPLACE FUNCTION public.milk_sales_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
    IF NEW.property_id IS NULL THEN NEW.property_id := public.current_user_property_id(); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN RAISE EXCEPTION 'property_id cannot be changed'; END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'created_by cannot be changed'; END IF;
  END IF;
  NEW.total_amount := ROUND(NEW.liters * NEW.price_per_liter, 2);
  RETURN NEW;
END; $$;
CREATE TRIGGER milk_sales_guard_trg BEFORE INSERT OR UPDATE ON public.milk_sales
  FOR EACH ROW EXECUTE FUNCTION public.milk_sales_guard();
CREATE TRIGGER milk_sales_set_updated_at BEFORE UPDATE ON public.milk_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER milk_sales_audit AFTER INSERT OR UPDATE OR DELETE ON public.milk_sales
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX milk_sales_property_idx ON public.milk_sales (property_id, sale_date DESC);
CREATE INDEX milk_sales_reference_idx ON public.milk_sales (property_id, reference_year DESC, reference_month DESC);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  expense_date DATE NOT NULL,
  category public.expense_category NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  quantity NUMERIC(12,3),
  supplier TEXT,
  invoice_number TEXT,
  cow_id UUID REFERENCES public.cows(id) ON DELETE SET NULL,
  reference_month INTEGER CHECK (reference_month BETWEEN 1 AND 12),
  reference_year INTEGER CHECK (reference_year BETWEEN 2000 AND 2100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_owner_all" ON public.expenses FOR ALL TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE TRIGGER expenses_guard BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.property_scoped_guard();
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER expenses_audit AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE INDEX expenses_property_idx ON public.expenses (property_id, expense_date DESC);
CREATE INDEX expenses_category_idx ON public.expenses (property_id, category, expense_date DESC);
CREATE INDEX expenses_cow_idx ON public.expenses (cow_id, expense_date DESC) WHERE cow_id IS NOT NULL;
