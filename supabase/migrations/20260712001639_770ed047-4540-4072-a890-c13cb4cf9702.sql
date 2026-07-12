
-- =========================================================================
-- LACTO CONTROL — Multi-tenant schema (properties, cows, productions, vaccines)
-- =========================================================================

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================================
-- 1. PROPERTIES
-- =========================================================================
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT properties_owner_unique UNIQUE (owner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_own" ON public.properties
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "properties_insert_own" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "properties_update_own" ON public.properties
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "properties_delete_own" ON public.properties
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_properties_owner ON public.properties(owner_id);

-- Auto-fill owner_id
CREATE OR REPLACE FUNCTION public.properties_set_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN NEW.owner_id := auth.uid(); END IF;
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_properties_set_owner BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.properties_set_owner();

-- =========================================================================
-- 2. PROFILES.property_id
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_property ON public.profiles(property_id);

-- Prevent linking a profile to another user's property
CREATE OR REPLACE FUNCTION public.profiles_validate_property()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner FROM public.properties WHERE id = NEW.property_id;
    IF v_owner IS NULL OR v_owner <> NEW.id THEN
      RAISE EXCEPTION 'Cannot link profile to a property owned by another user';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_profiles_validate_property BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_validate_property();

-- =========================================================================
-- 3. Security helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.user_owns_property(_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties WHERE id = _property_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_user_property_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.properties WHERE owner_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.user_owns_property(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_property_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_property(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_property_id() TO authenticated;

-- =========================================================================
-- 4. COWS
-- =========================================================================
CREATE TYPE public.cow_status AS ENUM ('lactacao', 'seca', 'prenha', 'descartada');

CREATE TABLE public.cows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  ear_tag TEXT NOT NULL,
  breed TEXT,
  birth_date DATE,
  last_calving_date DATE,
  lactation_start_date DATE,
  status public.cow_status NOT NULL DEFAULT 'lactacao',
  notes TEXT,
  legacy_local_id TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cows_ear_tag_unique UNIQUE (property_id, ear_tag),
  CONSTRAINT cows_legacy_unique UNIQUE (property_id, legacy_local_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cows TO authenticated;
GRANT ALL ON public.cows TO service_role;
ALTER TABLE public.cows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cows_select_own" ON public.cows
  FOR SELECT TO authenticated USING (public.user_owns_property(property_id));
CREATE POLICY "cows_insert_own" ON public.cows
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_property(property_id) AND created_by = auth.uid());
CREATE POLICY "cows_update_own" ON public.cows
  FOR UPDATE TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE POLICY "cows_delete_own" ON public.cows
  FOR DELETE TO authenticated USING (public.user_owns_property(property_id));

CREATE INDEX idx_cows_property ON public.cows(property_id);
CREATE INDEX idx_cows_ear_tag ON public.cows(ear_tag);
CREATE INDEX idx_cows_status ON public.cows(status);

CREATE TRIGGER trg_cows_updated_at BEFORE UPDATE ON public.cows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guard: cannot change property_id or created_by; auto-fill; date sanity
CREATE OR REPLACE FUNCTION public.cows_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
  IF NEW.birth_date IS NOT NULL AND NEW.birth_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'birth_date cannot be in the future';
  END IF;
  IF NEW.lactation_start_date IS NOT NULL AND NEW.birth_date IS NOT NULL
     AND NEW.lactation_start_date < NEW.birth_date THEN
    RAISE EXCEPTION 'lactation_start_date cannot be before birth_date';
  END IF;
  IF NEW.last_calving_date IS NOT NULL AND NEW.birth_date IS NOT NULL
     AND NEW.last_calving_date < NEW.birth_date THEN
    RAISE EXCEPTION 'last_calving_date cannot be before birth_date';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_cows_guard BEFORE INSERT OR UPDATE ON public.cows
  FOR EACH ROW EXECUTE FUNCTION public.cows_guard();

-- =========================================================================
-- 5. MILK PRODUCTIONS
-- =========================================================================
CREATE TABLE public.milk_productions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  reference_month SMALLINT NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year SMALLINT NOT NULL CHECK (reference_year BETWEEN 1900 AND 2200),
  production_date DATE,
  total_liters NUMERIC(12,2) NOT NULL CHECK (total_liters >= 0),
  days_recorded SMALLINT NOT NULL DEFAULT 30 CHECK (days_recorded BETWEEN 1 AND 31),
  daily_average NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  legacy_local_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT milk_productions_unique UNIQUE (cow_id, reference_month, reference_year),
  CONSTRAINT milk_productions_legacy_unique UNIQUE (property_id, legacy_local_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.milk_productions TO authenticated;
GRANT ALL ON public.milk_productions TO service_role;
ALTER TABLE public.milk_productions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milk_select_own" ON public.milk_productions
  FOR SELECT TO authenticated USING (public.user_owns_property(property_id));
CREATE POLICY "milk_insert_own" ON public.milk_productions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_property(property_id) AND created_by = auth.uid());
CREATE POLICY "milk_update_own" ON public.milk_productions
  FOR UPDATE TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE POLICY "milk_delete_own" ON public.milk_productions
  FOR DELETE TO authenticated USING (public.user_owns_property(property_id));

CREATE INDEX idx_milk_property ON public.milk_productions(property_id);
CREATE INDEX idx_milk_cow ON public.milk_productions(cow_id);
CREATE INDEX idx_milk_year_month ON public.milk_productions(reference_year, reference_month);

CREATE TRIGGER trg_milk_updated_at BEFORE UPDATE ON public.milk_productions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.milk_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  SELECT property_id INTO v_cow_property FROM public.cows WHERE id = NEW.cow_id;
  IF v_cow_property IS NULL OR v_cow_property <> NEW.property_id THEN
    RAISE EXCEPTION 'cow must belong to the same property';
  END IF;
  IF NEW.days_recorded IS NULL OR NEW.days_recorded < 1 THEN
    NEW.days_recorded := 30;
  END IF;
  NEW.daily_average := ROUND(NEW.total_liters / NEW.days_recorded, 2);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_milk_guard BEFORE INSERT OR UPDATE ON public.milk_productions
  FOR EACH ROW EXECUTE FUNCTION public.milk_guard();

-- =========================================================================
-- 6. VACCINES
-- =========================================================================
CREATE TYPE public.vaccine_frequency AS ENUM
  ('anual','semestral','trimestral','mensal','dose_unica','personalizado');

CREATE TABLE public.vaccines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  disease_prevention TEXT,
  manufacturer TEXT,
  number_of_doses SMALLINT NOT NULL DEFAULT 1 CHECK (number_of_doses > 0),
  dose_interval_days INTEGER NOT NULL DEFAULT 0 CHECK (dose_interval_days >= 0),
  booster_frequency public.vaccine_frequency NOT NULL DEFAULT 'anual',
  booster_custom_days INTEGER CHECK (booster_custom_days IS NULL OR booster_custom_days >= 0),
  withdrawal_period_days INTEGER NOT NULL DEFAULT 0 CHECK (withdrawal_period_days >= 0),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_local_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vaccines_legacy_unique UNIQUE (property_id, legacy_local_id)
);
CREATE UNIQUE INDEX vaccines_name_unique_ci
  ON public.vaccines(property_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccines TO authenticated;
GRANT ALL ON public.vaccines TO service_role;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vaccines_select_own" ON public.vaccines
  FOR SELECT TO authenticated USING (public.user_owns_property(property_id));
CREATE POLICY "vaccines_insert_own" ON public.vaccines
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_property(property_id) AND created_by = auth.uid());
CREATE POLICY "vaccines_update_own" ON public.vaccines
  FOR UPDATE TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE POLICY "vaccines_delete_own" ON public.vaccines
  FOR DELETE TO authenticated USING (public.user_owns_property(property_id));

CREATE INDEX idx_vaccines_property ON public.vaccines(property_id);

CREATE TRIGGER trg_vaccines_updated_at BEFORE UPDATE ON public.vaccines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.vaccines_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_vaccines_guard BEFORE INSERT OR UPDATE ON public.vaccines
  FOR EACH ROW EXECUTE FUNCTION public.vaccines_guard();

-- =========================================================================
-- 7. VACCINATION RECORDS
-- =========================================================================
CREATE TABLE public.vaccination_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  cow_id UUID NOT NULL REFERENCES public.cows(id) ON DELETE RESTRICT,
  vaccine_id UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  application_date DATE NOT NULL,
  dose_label TEXT NOT NULL DEFAULT '1ª',
  responsible_person TEXT,
  batch_number TEXT,
  next_application_date DATE,
  notes TEXT,
  legacy_local_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vaccination_unique UNIQUE (cow_id, vaccine_id, application_date, dose_label),
  CONSTRAINT vaccination_legacy_unique UNIQUE (property_id, legacy_local_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccination_records TO authenticated;
GRANT ALL ON public.vaccination_records TO service_role;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacc_records_select_own" ON public.vaccination_records
  FOR SELECT TO authenticated USING (public.user_owns_property(property_id));
CREATE POLICY "vacc_records_insert_own" ON public.vaccination_records
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_property(property_id) AND created_by = auth.uid());
CREATE POLICY "vacc_records_update_own" ON public.vaccination_records
  FOR UPDATE TO authenticated
  USING (public.user_owns_property(property_id))
  WITH CHECK (public.user_owns_property(property_id));
CREATE POLICY "vacc_records_delete_own" ON public.vaccination_records
  FOR DELETE TO authenticated USING (public.user_owns_property(property_id));

CREATE INDEX idx_vacc_property ON public.vaccination_records(property_id);
CREATE INDEX idx_vacc_cow ON public.vaccination_records(cow_id);
CREATE INDEX idx_vacc_vaccine ON public.vaccination_records(vaccine_id);
CREATE INDEX idx_vacc_next_date ON public.vaccination_records(next_application_date);

CREATE TRIGGER trg_vacc_updated_at BEFORE UPDATE ON public.vaccination_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.vaccination_records_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cow_property UUID; v_vaccine_property UUID;
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
  SELECT property_id INTO v_cow_property FROM public.cows WHERE id = NEW.cow_id;
  SELECT property_id INTO v_vaccine_property FROM public.vaccines WHERE id = NEW.vaccine_id;
  IF v_cow_property IS NULL OR v_cow_property <> NEW.property_id THEN
    RAISE EXCEPTION 'cow must belong to the same property';
  END IF;
  IF v_vaccine_property IS NULL OR v_vaccine_property <> NEW.property_id THEN
    RAISE EXCEPTION 'vaccine must belong to the same property';
  END IF;
  IF NEW.next_application_date IS NOT NULL
     AND NEW.next_application_date < NEW.application_date THEN
    RAISE EXCEPTION 'next_application_date cannot be before application_date';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_vacc_records_guard BEFORE INSERT OR UPDATE ON public.vaccination_records
  FOR EACH ROW EXECUTE FUNCTION public.vaccination_records_guard();

-- =========================================================================
-- 8. DATA MIGRATIONS
-- =========================================================================
CREATE TABLE public.data_migrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  migration_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT data_migrations_unique UNIQUE (user_id, migration_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_migrations TO authenticated;
GRANT ALL ON public.data_migrations TO service_role;
ALTER TABLE public.data_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_migrations_own" ON public.data_migrations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_data_migrations_updated_at BEFORE UPDATE ON public.data_migrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 9. AUDIT LOGS
-- =========================================================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_owns_property(property_id));
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_audit_property ON public.audit_logs(property_id);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
