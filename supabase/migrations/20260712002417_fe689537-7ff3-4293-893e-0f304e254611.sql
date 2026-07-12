
-- =========================================================================
-- Central audit function + triggers
-- =========================================================================
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop UUID;
  v_id UUID;
  v_action TEXT;
  v_old JSONB;
  v_new JSONB;
  v_uid UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_new := to_jsonb(NEW);
    v_old := NULL;
    BEGIN v_id := (to_jsonb(NEW) ->> 'id')::uuid; EXCEPTION WHEN others THEN v_id := NULL; END;
    BEGIN v_prop := COALESCE((to_jsonb(NEW) ->> 'property_id')::uuid, NULL); EXCEPTION WHEN others THEN v_prop := NULL; END;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Special case: cows soft-delete
    IF TG_TABLE_NAME = 'cows'
       AND (to_jsonb(OLD) ->> 'deleted_at') IS NULL
       AND (to_jsonb(NEW) ->> 'deleted_at') IS NOT NULL THEN
      v_action := 'soft_delete';
    ELSIF TG_TABLE_NAME = 'vaccines'
       AND (to_jsonb(OLD) ->> 'active')::boolean IS TRUE
       AND (to_jsonb(NEW) ->> 'active')::boolean IS FALSE THEN
      v_action := 'deactivate';
    ELSE
      v_action := 'update';
    END IF;
    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    BEGIN v_id := (to_jsonb(NEW) ->> 'id')::uuid; EXCEPTION WHEN others THEN v_id := NULL; END;
    BEGIN v_prop := COALESCE((to_jsonb(NEW) ->> 'property_id')::uuid, NULL); EXCEPTION WHEN others THEN v_prop := NULL; END;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_new := NULL;
    BEGIN v_id := (to_jsonb(OLD) ->> 'id')::uuid; EXCEPTION WHEN others THEN v_id := NULL; END;
    BEGIN v_prop := COALESCE((to_jsonb(OLD) ->> 'property_id')::uuid, NULL); EXCEPTION WHEN others THEN v_prop := NULL; END;
  END IF;

  -- profiles has no property_id column; use the profile's linked property
  IF TG_TABLE_NAME = 'profiles' THEN
    BEGIN v_prop := COALESCE((to_jsonb(COALESCE(NEW, OLD)) ->> 'property_id')::uuid, NULL);
    EXCEPTION WHEN others THEN v_prop := NULL; END;
  END IF;

  -- properties: entity id IS the property id
  IF TG_TABLE_NAME = 'properties' THEN
    v_prop := v_id;
  END IF;

  INSERT INTO public.audit_logs (property_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (v_prop, v_uid, v_action, TG_TABLE_NAME, v_id, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Data migrations: log lifecycle transitions
CREATE OR REPLACE FUNCTION public.audit_data_migration()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'migration_started';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_action := 'migration_' || NEW.status;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.audit_logs (property_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (NEW.property_id, NEW.user_id, v_action, 'data_migrations', NEW.id,
          CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
  RETURN NEW;
END; $$;

-- Attach triggers
CREATE TRIGGER trg_audit_cows
  AFTER INSERT OR UPDATE OR DELETE ON public.cows
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_milk
  AFTER INSERT OR UPDATE OR DELETE ON public.milk_productions
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_vaccines
  AFTER INSERT OR UPDATE OR DELETE ON public.vaccines
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_vacc_records
  AFTER INSERT OR UPDATE OR DELETE ON public.vaccination_records
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_properties
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TRIGGER trg_audit_data_migrations
  AFTER INSERT OR UPDATE ON public.data_migrations
  FOR EACH ROW EXECUTE FUNCTION public.audit_data_migration();

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type);
