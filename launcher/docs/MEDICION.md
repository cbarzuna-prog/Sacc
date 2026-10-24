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

## Prueba de fluidez reproducible (teclas por ADB)

Mismo patron en todos los launchers: 30 pulsaciones (derecha x4, abajo, izquierda x4, arriba, tres veces), 0,4 s entre teclas.

```bash
./adb shell dumpsys gfxinfo <paquete> reset >/dev/null
for r in 1 2 3; do for k in 22 22 22 22 20 21 21 21 21 19; do ./adb shell input keyevent $k; sleep 0.4; done; done
./adb shell dumpsys gfxinfo <paquete> | grep -E "Total frames|Janky|percentile|Number"
```

Una muestra con pocos frames (menos de ~100) no es valida. Los percentiles de GPU de 4950 ms son un artefacto del driver de esta TV y se ignoran.

## Variantes de Inicio TV (desde v0.2)

La app lee parametros solo al arrancar; `-S` reinicia el proceso:

```bash
./adb shell am start -S -n app.tvhome.launcher/.MainActivity --ez shadow <true|false> --ez clip <true|false> --ez bg <true|false>
```

- `bg`: `false` oculta el fondo de imagen (para medir su coste).
- `shadow`: sombra por elevacion al enfocar.
- `clip`: recorte de esquinas por contorno. Con `false`, las esquinas redondeadas se hornean en el bitmap.

## Resultados (TV real, Xiaomi MiTV-MOOQ2)

Prueba de fluidez: 30 teclas por ADB, mismo patron en todos. Una corrida por launcher.

| Medida | Google TV launcher | Projectivy (mejor caso) | Inicio TV v0.1 | Inicio TV v0.4.0 |
|---|---|---|---|---|
| PSS en reposo | 98,9 MB | 136 MB (174-250 MB con otras opciones) | 76,9 MB | 74,9 MB |
| Servicios activos | n/a | 0 | 0 | 0 |
| Frames medidos | 130 | por medir | 222 | 244 |
| Janky | 2,3 % | por medir | 21,6 % | 0 % |
| p50 / p90 / p99 | 5 / 6 / 19 ms | por medir | 14 / 17 / 30 ms | 5 / 5 / 7 ms |
| Dibujo lento | 1 | por medir | 20 | 0 |
| Arranque en caliente | 321 ms (1 muestra valida) | por medir | por medir | por medir |

Conclusion: lo que hacia lento a Inicio TV v0.1 eran las sombras por elevacion y el recorte de esquinas en tiempo real. Con tarjetas horneadas y solo escala (v0.4.0) la navegacion mide mejor que el launcher de Google en esta prueba y usa menos memoria. Limites: una corrida, teclas inyectadas por ADB, 30 pulsaciones; no sustituye la sensacion con el mando.
