#!/usr/bin/env bash
# Monta trycompai/crm en localhost (Mac) contra una base de datos Neon gratuita.
# Uso:  bash crm-local-setup.sh            -> instala, configura y arranca
#       bash crm-local-setup.sh --no-start -> solo instala y configura
# Es seguro volver a ejecutarlo: reutiliza el .env que ya exista.
set -euo pipefail

CRM_DIR="${CRM_DIR:-$HOME/crm}"
START=1
[ "${1:-}" = "--no-start" ] && START=0

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ask() { # ask VAR "pregunta" [secreto]
  local var="$1" prompt="$2" secret="${3:-}" value="${!1:-}"
  if [ -z "$value" ]; then
    if [ -n "$secret" ]; then read -r -s -p "$prompt: " value; echo
    else read -r -p "$prompt: " value; fi
  fi
  printf -v "$var" '%s' "$value"
}

say "1/6 Herramientas"
command -v git >/dev/null || { echo "Falta git. Ejecuta: xcode-select --install"; exit 1; }
command -v node >/dev/null || { echo "Falta Node 22+. Ejecuta: brew install node"; exit 1; }
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || { echo "Necesitas Node 22 o superior (tienes $(node -v))."; exit 1; }
if ! command -v bun >/dev/null; then
  echo "Instalando Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

say "2/6 Código"
if [ ! -d "$CRM_DIR/.git" ]; then
  git clone https://github.com/trycompai/crm.git "$CRM_DIR"
fi
cd "$CRM_DIR"

say "3/6 Datos que necesito de ti"
if [ -f .env ] && grep -q '^BETTER_AUTH_SECRET="..*"' .env; then
  echo "Ya existe .env con configuración; lo reutilizo. (Bórralo para empezar de cero.)"
else
  cat <<'TXT'

NEON: entra a https://console.neon.tech, crea un proyecto GRATIS NUEVO y VACÍO
(no uses una base de datos con datos reales) y copia la "connection string".
Ejemplo: postgresql://usuario:clave@ep-xxxx.neon.tech/neondb?sslmode=require

GOOGLE (para iniciar sesión): en https://console.cloud.google.com crea un
"ID de cliente OAuth" tipo "Aplicación web" con esta URI de redirección:
    http://localhost:3001/api/auth/callback/google
Activa las APIs de Gmail y Google Calendar, y añade tu correo como usuario de prueba.
TXT
  ask DATABASE_URL "Neon connection string" secret
  ask ALLOWED_SIGN_IN "Tu correo de Google (quién puede entrar)"
  ask GOOGLE_CLIENT_ID "Google Client ID"
  ask GOOGLE_CLIENT_SECRET "Google Client Secret" secret

  say "4/6 Escribiendo .env"
  cp .env.example .env
  python3 - "$DATABASE_URL" "$ALLOWED_SIGN_IN" "$GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_SECRET" \
    "$(openssl rand -base64 32)" "$(openssl rand -base64 32)" "$(openssl rand -hex 24)" <<'PY'
import re, sys
db, email, gid, gsecret, auth, bridge, cron = sys.argv[1:8]
text = open(".env").read()
def setv(key, value):
    global text
    line = f'{key}="{value}"'
    # Primero la línea activa; si no, la comentada (un solo espacio tras '#',
    # para no pisar los ejemplos de la documentación). Si no, se añade al final.
    for pattern in (re.compile(rf'^{key}=.*$', re.M), re.compile(rf'^# ?{key}=.*$', re.M)):
        if pattern.search(text):
            text = pattern.sub(line, text, count=1)
            return
    text += "\n" + line + "\n"
setv("DATABASE_URL", db)
setv("BETTER_AUTH_SECRET", auth)
setv("ALLOWED_SIGN_IN", email)
setv("GOOGLE_CLIENT_ID", gid)
setv("GOOGLE_CLIENT_SECRET", gsecret)
setv("AGENT_URL", "http://127.0.0.1:2000")
setv("AGENT_BRIDGE_SECRET", bridge)
setv("CRON_SECRET", cron)
setv("CRM_TELEMETRY_DISABLED", "1")
open(".env", "w").write(text)
PY
  chmod 600 .env
fi

say "5/6 Dependencias"
# ALLOW_REMOTE_DB=1: el repo se niega a migrar una base remota salvo que lo confirmes.
# Es seguro aquí porque la base de Neon es nueva y vacía.
export ALLOW_REMOTE_DB=1
bun install
bun run db:deploy

say "6/6 Listo"
cat <<TXT

  App:  http://localhost:3000
  API:  http://localhost:3001

Notas:
  - Google en modo "prueba" muestra un aviso de app no verificada: pulsa
    "Avanzado" -> "Ir a ... (no seguro)". Es normal con tu propio cliente.
  - Para el agente, 'bun run dev' lo arranca en :2000 (puede mostrar una TUI).
  - Detén todo con Ctrl+C. Para volver a arrancar:
        cd $CRM_DIR && ALLOW_REMOTE_DB=1 bun run dev
TXT

if [ "$START" = 1 ]; then
  exec bun run dev
fi
