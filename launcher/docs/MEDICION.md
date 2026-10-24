# Protocolo de medicion (comparativa de launchers)

Todas las mediciones se hacen en la TV real, con la TV en reposo en la pantalla de inicio, por ADB (solo lectura). **Sin evidencia no se declara exito.**

## Presupuesto

| Objetivo | Valor |
|---|---|
| PSS en reposo | <= 100 MB (el launcher de Google ya mide ~99 MB; para que valga la pena, apuntar a ~60-70 MB) |
| Arranque en caliente | <= 1,5 s |
| Navegacion con el mando | Sin tirones visibles |
| Servicios en segundo plano | Ninguno |

## Comandos

```bash
# Memoria del launcher (PSS) y del sistema
./adb shell dumpsys meminfo app.tvhome.launcher | grep -E "TOTAL|Java Heap|Native Heap|Code|Graphics"
./adb shell "grep -E 'MemTotal|MemFree|SwapTotal|SwapFree' /proc/meminfo"

# Fluidez: reiniciar contadores, navegar ~20 s con el mando, leer
./adb shell dumpsys gfxinfo app.tvhome.launcher reset
./adb shell dumpsys gfxinfo app.tvhome.launcher | grep -E "Total frames|Janky|percentile"

# Servicios y procesos
./adb shell dumpsys activity services app.tvhome.launcher | grep -c ServiceRecord
./adb shell ps -A -o PID,RSS,NAME | grep -i tvhome
```

## Comparativa a rellenar

| Medida | Google TV launcher | Projectivy | Inicio TV |
|---|---|---|---|
| PSS en reposo | 98,9 MB | 136-250 MB segun configuracion (174 MB con fondo liso) | por medir |
| Gráficos | 18 MB | 37-112 MB | por medir |
| Arranque en caliente | 321 ms (1 muestra valida) | por medir | por medir |
| Frames janky (navegacion controlada) | por medir (26 % acumulado, no controlado) | por medir | por medir |
| Servicios activos | n/a | 0 | por medir |
