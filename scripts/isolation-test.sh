#!/usr/bin/env bash
# Static RLS / policy verifier.
#
# The sandbox role cannot `SET ROLE authenticated` (Supabase restriction),
# so full end-to-end multi-user tests must be run in a real environment with
# two authenticated sessions (Playwright / Postman / the Lovable preview).
# This script validates the policy surface that ENFORCES isolation.
#
# Usage: bash scripts/isolation-test.sh
set -euo pipefail

pass=0; fail=0
check() {
  local name="$1"; local expected="$2"; local got="$3"
  if [[ "$got" == "$expected" ]]; then
    echo "PASS  $name"
    pass=$((pass+1))
  else
    echo "FAIL  $name  (expected='$expected' got='$got')"
    fail=$((fail+1))
  fi
}
q() { psql -X -A -t -c "$1" | tr -d '[:space:]'; }

echo "=== 1. RLS ativo em todas as tabelas do domínio ==="
for t in properties profiles cows milk_productions vaccines vaccination_records data_migrations audit_logs; do
  r=$(q "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.$t'::regclass;")
  check "RLS ativo em $t" "t" "$r"
done

echo
echo "=== 2. Nenhuma policy permissiva 'USING (true)' em tabelas sensíveis ==="
bad=$(q "SELECT count(*) FROM pg_policies
         WHERE schemaname='public'
           AND tablename IN ('cows','milk_productions','vaccines','vaccination_records','properties')
           AND (qual = 'true' OR with_check = 'true');")
check "policies 'true' inexistentes" "0" "$bad"

echo
echo "=== 3. Nenhuma tabela sensível concede acesso a anon ==="
anon_grants=$(q "SELECT count(*) FROM information_schema.role_table_grants
                 WHERE grantee='anon'
                   AND table_schema='public'
                   AND table_name IN ('cows','milk_productions','vaccines','vaccination_records','properties','audit_logs','data_migrations');")
check "grants anon = 0" "0" "$anon_grants"

echo
echo "=== 4. Policies separadas para SELECT/INSERT/UPDATE/DELETE em cada tabela ==="
for t in properties cows milk_productions vaccines vaccination_records; do
  for cmd in SELECT INSERT UPDATE DELETE; do
    c=$(q "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='$t' AND cmd='$cmd';")
    [[ "$c" -ge 1 ]] && { echo "PASS  $t.$cmd (n=$c)"; pass=$((pass+1)); } \
                     || { echo "FAIL  $t.$cmd (n=$c)"; fail=$((fail+1)); }
  done
done

echo
echo "=== 5. Triggers de auditoria presentes ==="
for t in cows milk_productions vaccines vaccination_records profiles properties data_migrations; do
  c=$(q "SELECT count(*) FROM pg_trigger t
         JOIN pg_class c ON c.oid=t.tgrelid
         JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relname='$t' AND t.tgname LIKE 'trg_audit_%';")
  check "trigger auditoria em $t" "1" "$c"
done

echo
echo "=== 6. Triggers de guarda (property/created_by) presentes ==="
for t in cows milk_productions vaccines vaccination_records; do
  c=$(q "SELECT count(*) FROM pg_trigger t
         JOIN pg_class c ON c.oid=t.tgrelid
         WHERE c.relname='$t' AND t.tgname LIKE 'trg_%_guard';")
  check "guarda em $t" "1" "$c"
done

echo
echo "=== 7. Restrições únicas de isolamento ==="
for c in cows_ear_tag_unique milk_productions_unique vaccination_unique cows_legacy_unique vaccines_legacy_unique milk_productions_legacy_unique vaccination_legacy_unique properties_owner_unique; do
  r=$(q "SELECT count(*) FROM pg_constraint WHERE conname='$c';")
  check "constraint $c" "1" "$r"
done

echo
echo "=== 8. Funções SECURITY DEFINER com search_path fixado ==="
bad=$(q "SELECT count(*) FROM pg_proc p
         JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public'
           AND p.prosecdef=true
           AND NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
           );")
check "SECURITY DEFINER sem search_path" "0" "$bad"

echo
echo "======================================="
echo "  PASS: $pass    FAIL: $fail"
echo "======================================="
[[ $fail -eq 0 ]]
