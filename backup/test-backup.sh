#!/usr/bin/env bash
# Test of backup/backup.sh with stub pg_dump/psql: never touches a real
# database, uses a throwaway age key pair. Needs age + age-keygen on PATH.
# Run: bash backup/test-backup.sh
set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
command -v age >/dev/null && command -v age-keygen >/dev/null || { echo "age and age-keygen must be on PATH"; exit 2; }
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
# Throwaway key pair; backup.sh is pointed at its public key through a copy of the repo script.
KEY="$W/test-key.txt"; age-keygen -o "$KEY" 2>/dev/null
mkdir -p "$W/repo/backup"; cp "$REPO/backup/backup.sh" "$W/repo/backup/"
age-keygen -y "$KEY" > "$W/repo/backup/age-recipient.txt"
REPO="$W/repo"
FAKE_URL='postgresql://postgres.fakeref:S3cretPass@db.example.invalid:5432/postgres'
pass=0; failn=0
ok()  { echo "PASS $1"; pass=$((pass+1)); }
ko()  { echo "FAIL $1"; failn=$((failn+1)); }

mkstubs() { # $1 = mode
  mkdir -p "$W/bin"
  cat > "$W/bin/pg_dump" <<EOF
#!/usr/bin/env bash
if [ "\$1" = "--version" ]; then echo "pg_dump (PostgreSQL) ${VER:-17.6}"; exit 0; fi
echo "\$@" > "$W/dump-args"
case "$1" in
  ok) head -c 300000 /dev/urandom | tee "$W/plain" ;;
  dumpfail) echo "pg_dump: error: connection to server at \"db.example.invalid\" (3.4.5.6), port 5432 failed: FATAL:  password authentication failed for user \"postgres.fakeref\" url=$FAKE_URL" >&2; exit 1 ;;
  small) printf 'tiny' ;;
esac
EOF
  cat > "$W/bin/psql" <<EOF
#!/usr/bin/env bash
case "$1" in
  psqlfail) echo "psql: error: connection to server at \"db.example.invalid\" (3.4.5.6), port 5432 failed: FATAL: Tenant or user not found user \"postgres.fakeref\"" >&2; exit 2 ;;
  *) printf 'auth.mfa_factors\nstorage.s3_multipart_uploads\n' ;;
esac
EOF
  chmod +x "$W/bin/pg_dump" "$W/bin/psql"
}

run() { # mode, url -> sets RC, LOG, GO
  rm -rf "$W/out" "$W/go" "$W/sum"; mkstubs "$1"
  LOG="$(SUPABASE_DB_URL="$2" PG_BIN="$W/bin" OUT_DIR="$W/out" GITHUB_OUTPUT="$W/go" GITHUB_STEP_SUMMARY="$W/sum" bash "$REPO/backup/backup.sh" 2>&1)"; RC=$?
  GO="$(cat "$W/go" 2>/dev/null)"
}
noleak() { ! grep -q -E "S3cretPass|fakeref|db.example.invalid|3\.4\.5\.6" <<< "$LOG$(cat "$W/sum" 2>/dev/null)"; }

# 1. no secret -> clean exit 0, skipped
run ok ""
[ $RC -eq 0 ] && grep -q "status=skipped" <<< "$GO" && grep -q "Backup skipped" <<< "$LOG" && [ ! -d "$W/out" ] && ok "no secret: exit 0, skipped, nothing written" || ko "no secret ($RC) $LOG"

# 2. success -> encrypted file, excluded tables passed, decrypts to the same bytes
run ok "$FAKE_URL"
F="$(sed -n 's/^file=//p' <<< "$GO")"
if [ $RC -eq 0 ] && grep -q "status=ok" <<< "$GO" && [ -f "$F" ]; then ok "success: exit 0, file $(basename "$F")"; else ko "success ($RC) $LOG"; fi
grep -q -- "--exclude-table=auth.mfa_factors" "$W/dump-args" && grep -q -- "--exclude-table=storage.s3_multipart_uploads" "$W/dump-args" && grep -q -- "--schema=auth" "$W/dump-args" && ok "pg_dump got schemas + exclusions" || ko "dump args: $(cat "$W/dump-args")"
head -c 21 "$F" | grep -q "^age-encryption.org/v1" && ok "file is age-encrypted" || ko "not age"
age -d -i "$KEY" "$F" | cmp -s - "$W/plain" && ok "decrypts with the private key to the exact dump bytes" || ko "decrypt mismatch"
noleak && ok "success log has no URL/host/user/password" || ko "leak in success log"
[ -z "$(ls "$W/out" | grep -v '\.dump\.age$')" ] && ok "no plaintext or .partial left in output dir" || ko "leftover: $(ls "$W/out")"

# 3. pg_dump failure -> exit 1, sanitized message
run dumpfail "$FAKE_URL"
[ $RC -eq 1 ] && grep -q "status=failed" <<< "$GO" && ok "pg_dump failure: exit 1" || ko "dumpfail ($RC)"
noleak && ok "failure message sanitized" || ko "LEAK: $LOG"
[ -z "$(ls "$W/out" 2>/dev/null)" ] && ok "failure leaves no file" || ko "file left after failure"

# 4. psql (connection) failure -> exit 1, sanitized
run psqlfail "$FAKE_URL"
[ $RC -eq 1 ] && noleak && ok "connection failure: exit 1, sanitized" || ko "psqlfail ($RC): $LOG"

# 5. wrong pg_dump version -> refused
VER=16.4 run ok "$FAKE_URL"
[ $RC -eq 1 ] && grep -q "must be version 17" <<< "$LOG" && ok "pg_dump 16 refused" || ko "version ($RC) $LOG"

# 6. too small -> refused
run small "$FAKE_URL"
[ $RC -eq 1 ] && grep -q "too small" <<< "$LOG" && ok "too-small dump refused" || ko "small ($RC) $LOG"

echo "---- $pass passed, $failn failed"
[ $failn -eq 0 ]
