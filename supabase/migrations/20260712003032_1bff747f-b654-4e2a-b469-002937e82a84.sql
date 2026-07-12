
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_policy_version text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_terms_version text := NEW.raw_user_meta_data->>'terms_version';
  v_privacy_version text := NEW.raw_user_meta_data->>'privacy_policy_version';
  v_accepted boolean := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false);
BEGIN
  INSERT INTO public.profiles (
    id, full_name, farm_name, phone,
    terms_accepted, terms_accepted_at, terms_version, privacy_policy_version
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'farm_name',
    NEW.raw_user_meta_data->>'phone',
    v_accepted,
    CASE WHEN v_accepted THEN now() ELSE NULL END,
    v_terms_version,
    v_privacy_version
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
