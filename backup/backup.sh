#!/usr/bin/env bash
# Encrypted database backup — run by .github/workflows/backup.yml.
#
# pg_dump 17 (custom format) of the schemas public, auth and storage, piped
# straight into `age -r <public key>`: the dump is encrypted as it streams, so
# no unencrypted copy is ever written to disk. Output: $OUT_DIR/<name>.dump.age
#
# THE REPOSITORY IS PUBLIC, SO ITS ACTIONS LOGS ARE PUBLIC: this script never
# prints the connection string or any part of it (host, user, password).
#
# Environment:
#   SUPABASE_DB_URL  connection string (GitHub secret). Empty -> clean exit 0.
#   PG_BIN           folder with pg_dump/psql 17 (default /usr/lib/postgresql/17/bin)
#   OUT_DIR          output folder (default ./backup-out)
#   MIN_BYTES        smallest acceptable encrypted file (default 20000)
#   GITHUB_OUTPUT / GITHUB_STEP_SUMMARY  set by GitHub Actions (optional)
set -uo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/17/bin}"
OUT_DIR="${OUT_DIR:-./backup-out}"
MIN_BYTES="${MIN_BYTES:-20000}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECIPIENT_FILE="$HERE/age-recipient.txt"

out() { [ -n "${GITHUB_OUTPUT:-}" ] && echo "$1=$2" >> "$GITHUB_OUTPUT"; return 0; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$1" >> "$GITHUB_STEP_SUMMARY"; return 0; }

# Removes anything that could identify the database from tool messages.
sanitize() {
  sed -E \
    -e 's#postgres(ql)?://[^[:space:]"]*#<db-url>#g' \
    -e 's#(server at )"[^"]*"( \([^)]*\))?#\1"<host>"#g' \
    -e 's#(host|hostaddr)=[^[:space:]]*#\1=<host>#g' \
    -e 's#(user|role) "[^"]*"#\1 "<user>"#g' \
    -e 's#(password)=[^[:space:]]*#\1=<hidden>#g'
}

fail() {
  echo "::error title=Backup failed::$1"
  summary "**Backup FAILED:** $1"
  out status failed
  exit 1
}

# 1) No secret yet: nothing to do, and NOT a failure (no daily failure email).
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "::notice title=Backup skipped::Secret SUPABASE_DB_URL is not set yet, so no backup was made. Add it in GitHub -> Settings -> Secrets and variables -> Actions (see docs/BACKUP_RESTORE.md)."
  summary "**Backup skipped:** secret \`SUPABASE_DB_URL\` is not set yet."
  out status skipped
  exit 0
fi

# 2) Tools and public key
for exe in "$PG_BIN/pg_dump" "$PG_BIN/psql"; do
  [ -x "$exe" ] || fail "missing tool: $exe"
done
command -v age >/dev/null || fail "missing tool: age"
DUMP_VERSION="$("$PG_BIN/pg_dump" --version)"
case "$DUMP_VERSION" in
  *" 17."*) ;;
  *) fail "pg_dump must be version 17 (production is PostgreSQL 17), got: $DUMP_VERSION" ;;
esac
RECIPIENT="$(grep -E '^age1[0-9a-z]{58}$' "$RECIPIENT_FILE" | head -n 1)"
[ -n "$RECIPIENT" ] || fail "no valid age public key in backup/age-recipient.txt"

mkdir -p "$OUT_DIR"
umask 077
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="ime-db_${STAMP}.dump.age"
FINAL="$OUT_DIR/$NAME"
TMP="$FINAL.partial"
ERR="$(mktemp)"
trap 'rm -f "$ERR" "$TMP"' EXIT

export PGCONNECT_TIMEOUT=30
export PGAPPNAME=ime-backup

# 3) Tables the role cannot read (Supabase feature tables) are excluded and
#    listed, instead of failing the whole dump.
Q="select quote_ident(n.nspname)||'.'||quote_ident(c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and c.relkind in ('r','p') and not has_table_privilege(c.oid,'SELECT') order by 1"
if ! EXCLUDED="$("$PG_BIN/psql" --dbname="$SUPABASE_DB_URL" --no-psqlrc -At -c "$Q" 2>"$ERR")"; then
  fail "could not connect to the database: $(sanitize < "$ERR" | tr '\n' ' ')"
fi
EXCLUDE_ARGS=()
while IFS= read -r t; do
  [ -n "$t" ] && EXCLUDE_ARGS+=("--exclude-table=$t")
done <<< "$EXCLUDED"

# 4) Dump -> age (no plaintext on disk)
"$PG_BIN/pg_dump" --dbname="$SUPABASE_DB_URL" -Fc -Z 6 \
  --schema=public --schema=auth --schema=storage "${EXCLUDE_ARGS[@]}" 2>"$ERR" \
  | age -r "$RECIPIENT" -o "$TMP"
CODES=("${PIPESTATUS[@]}")
if [ "${CODES[0]}" -ne 0 ] || [ "${CODES[1]}" -ne 0 ]; then
  fail "pg_dump exit ${CODES[0]}, age exit ${CODES[1]}: $(sanitize < "$ERR" | tr '\n' ' ')"
fi

# 5) Sanity checks on the encrypted file
SIZE="$(wc -c < "$TMP" | tr -d ' ')"
[ "$SIZE" -ge "$MIN_BYTES" ] || fail "backup too small ($SIZE bytes < $MIN_BYTES)"
head -c 21 "$TMP" | grep -q '^age-encryption.org/v1' || fail "output is not an age-encrypted file"
mv "$TMP" "$FINAL"

N_EXCL=${#EXCLUDE_ARGS[@]}
echo "Backup OK: $NAME ($SIZE bytes), $DUMP_VERSION, excluded $N_EXCL unreadable tables${EXCLUDED:+: $(echo "$EXCLUDED" | tr '\n' ' ')}"
summary "**Backup OK:** \`$NAME\` — $SIZE bytes — $DUMP_VERSION — $N_EXCL unreadable tables excluded"
out status ok
out file "$FINAL"
out name "$NAME"
exit 0
