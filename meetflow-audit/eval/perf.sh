#!/bin/bash
# Mide una ejecución aislada en macOS: tiempo, CPU y pico de memoria.
# uso: ./perf.sh <comando...>      ej.: ./perf.sh python3 ../../meeting-notes/notes.py data/audio.mp3
# Antes: cierra compilaciones y otras apps pesadas; conecta la Mac a la corriente. Repite 3 veces.
set -euo pipefail
echo "# $(date -u +%FT%TZ)  $(sysctl -n machdep.cpu.brand_string 2>/dev/null || uname -m)  swap: $(sysctl -n vm.swapusage 2>/dev/null || echo n/a)"
pgrep -fl 'cargo|rustc|vite|tauri|xcodebuild' && echo "AVISO: hay compilaciones en marcha; la medición no es válida" >&2 || true
/usr/bin/time -l "$@" 2>&1 | tee /dev/stderr | grep -E "real|user|sys|maximum resident set size|peak memory footprint" || true
