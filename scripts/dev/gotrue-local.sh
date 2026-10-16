#!/usr/bin/env bash
# Ambiente LOCAL de Supabase Auth (GoTrue) + Mailpit para validar a Fase C sem tocar produção. Linux x86_64.
# Uso: scripts/dev/gotrue-local.sh setup | start | stop     (requer sudo para instalar o Postgres via apt)
# Nenhum segredo é gravado no repositório: senha do banco e JWT secret são gerados localmente em $DIR (chmod 600).
set -euo pipefail
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
DIR=${GOTRUE_DIR:-$HOME/.kac-gotrue}; V=${GOTRUE_VERSION:-v2.197.0}; mkdir -p "$DIR"; cd "$DIR"
case "${1:-start}" in
setup)
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql >/dev/null; sudo service postgresql start >/dev/null
  [ -x auth ] || curl -fsSL "https://github.com/supabase/auth/releases/download/$V/auth-$V-amd64.tar.xz" | tar xJ
  [ -x mailpit ] || curl -fsSL https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-amd64.tar.gz | tar xz mailpit
  [ -f .dbpw ] || (umask 077; openssl rand -hex 16 > .dbpw); [ -f .jwt ] || (umask 077; openssl rand -hex 32 > .jwt)
  sudo -u postgres psql -qc "do \$\$begin if not exists(select from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin login createrole; end if; end\$\$;"
  sudo -u postgres psql -qc "alter role supabase_auth_admin password '$(cat .dbpw)'"   # senha local descartável
  sudo -u postgres psql -qc "create database authtest owner supabase_auth_admin" 2>/dev/null || true
  sudo -u postgres psql -d authtest -qc "create schema if not exists auth authorization supabase_auth_admin; alter role supabase_auth_admin set search_path=auth;"
  "$SELF" env migrate ;;
env)
  export GOTRUE_DB_DRIVER=postgres DATABASE_URL="postgres://supabase_auth_admin:$(cat .dbpw)@127.0.0.1:5432/authtest?sslmode=disable"
  export GOTRUE_SITE_URL=http://localhost:3000 API_EXTERNAL_URL=http://127.0.0.1:9999 GOTRUE_API_HOST=127.0.0.1 PORT=9999 GOTRUE_DB_MIGRATIONS_PATH="$DIR/migrations"
  export GOTRUE_JWT_SECRET="$(cat .jwt)" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_AUD=authenticated
  export GOTRUE_DISABLE_SIGNUP=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false
  export GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=1025 GOTRUE_SMTP_USER=x GOTRUE_SMTP_PASS=x GOTRUE_SMTP_ADMIN_EMAIL=noreply@komodo.test GOTRUE_SMTP_SENDER_NAME=Komodo GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_SMTP_MAX_FREQUENCY=1s
  exec ./auth "${2:-serve}" ;;
start)
  sudo service postgresql start >/dev/null
  nohup ./mailpit --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025 --smtp-auth-accept-any --smtp-auth-allow-insecure > mailpit.log 2>&1 &
  nohup "$SELF" env serve > gotrue.log 2>&1 & sleep 5; curl -fsS http://127.0.0.1:9999/health >/dev/null && echo "GoTrue: http://127.0.0.1:9999  Mailpit: http://127.0.0.1:8025" ;;
stop) pkill -f "$DIR/auth serve" || true; pkill -f "$DIR/mailpit" || pkill -x mailpit || true; sudo service postgresql stop >/dev/null || true; echo parado ;;
esac
