#!/usr/bin/env bash
# Isolation tests: two synthetic users, verify RLS blocks cross-property access.
# Requires PG* env vars (already set in the Lovable dev sandbox).
# Usage: bash scripts/isolation-test.sh
set -euo pipefail

UUID_A="00000000-0000-0000-0000-00000000aaaa"
UUID_B="00000000-0000-0000-0000-00000000bbbb"

pg() { psql -v ON_ERROR_STOP=0 -X -q -t -A -c "$1" 2>&1; }

impersonate() {
  local uid="$1"; shift
  local sql="$1"
  psql -v ON_ERROR_STOP=0 -X -q -t -A <<SQL 2>&1
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$uid','role','authenticated')::text, true);
SELECT set_config('request.jwt.claim.sub', '$uid', true);
$sql
ROLLBACK;
SQL
}

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

echo "=== Setup: creating synthetic auth users & properties ==="
# Insert directly as postgres superuser (setup only)
pg "INSERT INTO auth.users (id, email, aud, role, instance_id, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES ('$UUID_A', 'a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', crypt('x', gen_salt('bf')), now(), now(), now())
    ON CONFLICT (id) DO NOTHING;" > /dev/null
pg "INSERT INTO auth.users (id, email, aud, role, instance_id, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES ('$UUID_B', 'b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', crypt('x', gen_salt('bf')), now(), now(), now())
    ON CONFLICT (id) DO NOTHING;" > /dev/null

# Clean previous test data
pg "DELETE FROM public.properties WHERE owner_id IN ('$UUID_A','$UUID_B');" > /dev/null

# --- User A creates their property + cow ---
echo
echo "=== Test 1: A creates property, cow, vaccine ==="
res=$(impersonate "$UUID_A" "
INSERT INTO public.properties (name) VALUES ('Fazenda A') RETURNING id;
")
propA=$(echo "$res" | grep -Eo '[0-9a-f-]{36}' | head -1 || true)
# Because ROLLBACK aborts, re-run with commit for setup
propA=$(psql -X -A -t <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_A','role','authenticated')::text, true);
INSERT INTO public.properties (name) VALUES ('Fazenda A') RETURNING id;
COMMIT;
SQL
)
propA=$(echo "$propA" | grep -Eo '[0-9a-f-]{36}' | head -1)
check "A criou propriedade" "true" "$([[ -n "$propA" ]] && echo true || echo false)"

cowA=$(psql -X -A -t <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_A','role','authenticated')::text, true);
INSERT INTO public.cows (property_id, created_by, name, ear_tag)
VALUES ('$propA', '$UUID_A', 'Mimosa', '001') RETURNING id;
COMMIT;
SQL
)
cowA=$(echo "$cowA" | grep -Eo '[0-9a-f-]{36}' | head -1)
check "A criou vaca" "true" "$([[ -n "$cowA" ]] && echo true || echo false)"

# --- User B creates their property ---
echo
echo "=== Test 2: B creates property ==="
propB=$(psql -X -A -t <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_B','role','authenticated')::text, true);
INSERT INTO public.properties (name) VALUES ('Fazenda B') RETURNING id;
COMMIT;
SQL
)
propB=$(echo "$propB" | grep -Eo '[0-9a-f-]{36}' | head -1)
check "B criou propriedade" "true" "$([[ -n "$propB" ]] && echo true || echo false)"

# --- Isolation: B cannot see A's data ---
echo
echo "=== Test 3: B SELECT deve ignorar registros de A ==="
countB=$(psql -X -A -t <<SQL | tr -d '[:space:]'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_B','role','authenticated')::text, true);
SELECT count(*) FROM public.cows;
ROLLBACK;
SQL
)
check "B não vê vacas de A" "0" "$countB"

countPropB=$(psql -X -A -t <<SQL | tr -d '[:space:]'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_B','role','authenticated')::text, true);
SELECT count(*) FROM public.properties;
ROLLBACK;
SQL
)
check "B só vê 1 propriedade (a própria)" "1" "$countPropB"

# --- B tenta UPDATE em vaca de A ---
echo
echo "=== Test 4: B UPDATE em vaca de A não altera nada ==="
upd=$(psql -X -A -t <<SQL | tr -d '[:space:]'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_B','role','authenticated')::text, true);
WITH x AS (UPDATE public.cows SET name='INVADIDA' WHERE id='$cowA' RETURNING 1) SELECT count(*) FROM x;
ROLLBACK;
SQL
)
check "UPDATE de B em vaca de A é bloqueado" "0" "$upd"

# --- B tenta DELETE vaca de A ---
del=$(psql -X -A -t <<SQL | tr -d '[:space:]'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_B','role','authenticated')::text, true);
WITH x AS (DELETE FROM public.cows WHERE id='$cowA' RETURNING 1) SELECT count(*) FROM x;
ROLLBACK;
SQL
)
check "DELETE de B em vaca de A é bloqueado" "0" "$del"

# --- B tenta INSERT em property de A ---
echo
echo "=== Test 5: B INSERT com property_id de A é bloqueado ==="
ins=$(psql -X -A -t <<SQL 2>&1 | tail -1
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_B','role','authenticated')::text, true);
INSERT INTO public.cows (property_id, created_by, name, ear_tag)
VALUES ('$propA','$UUID_B','Invasora','999');
ROLLBACK;
SQL
)
echo "$ins" | grep -qi 'violates row-level security\|permission denied\|new row violates' \
  && { check "INSERT cross-property bloqueado" "true" "true"; } \
  || { check "INSERT cross-property bloqueado" "true" "false ($ins)"; }

# --- A ainda enxerga seu registro ---
echo
echo "=== Test 6: A ainda enxerga sua vaca ==="
countA=$(psql -X -A -t <<SQL | tr -d '[:space:]'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$UUID_A','role','authenticated')::text, true);
SELECT count(*) FROM public.cows;
ROLLBACK;
SQL
)
check "A vê sua própria vaca" "1" "$countA"

# --- Anon não vê nada ---
echo
echo "=== Test 7: anon não enxerga nenhuma tabela sensível ==="
for t in cows milk_productions vaccines vaccination_records properties audit_logs; do
  c=$(psql -X -A -t <<SQL | tr -d '[:space:]'
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) FROM public.$t;
ROLLBACK;
SQL
)
  check "anon.count($t)=0" "0" "$c"
done

# --- Cleanup ---
pg "DELETE FROM public.properties WHERE owner_id IN ('$UUID_A','$UUID_B');" > /dev/null
pg "DELETE FROM auth.users WHERE id IN ('$UUID_A','$UUID_B');" > /dev/null

echo
echo "======================================="
echo "  PASS: $pass    FAIL: $fail"
echo "======================================="
[[ $fail -eq 0 ]]
