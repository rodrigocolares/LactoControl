
REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_data_migration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.properties_set_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_validate_property() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cows_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.milk_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vaccines_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vaccination_records_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
