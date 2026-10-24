# Inicio TV: launcher inspirado en Apple TV (Xiaomi MiTV-MOOQ2)

Launcher nativo en Kotlin para Android TV 11 (API 30), pensado para una TV con ~1,7 GB de RAM y ARMv7 de 32 bits.

**Estado: v0.3.0 (fila de favoritas y fondo nuevo). Medido en la TV: usa menos memoria que el launcher de Google pero la navegacion es menos fluida (ver `docs/MEDICION.md`). En optimizacion.**

## Que hace (v0.3)

- Fila de 4 favoritas grandes (las 4 primeras de tu orden) y cuadricula debajo con el resto de apps lanzables, descubiertas automaticamente.
- Navegacion con el mando (D-pad), foco con escala y sombra, nombre de la app al enfocar.
- Abrir apps con OK. Reordenar: pulsacion larga en OK (o la tecla Menu) y flechas; OK termina. El orden se guarda.
- Reloj, atajo a Ajustes y atajo **Launcher original** (recuperacion).
- Fondo estatico abstracto propio (un JPEG de 27 KB, ~2 MB en memoria).
- Sin servicios, sin WebView, sin sondeo permanente, sin permisos.

## Decisiones de ingenieria

- **Vistas nativas + RecyclerView**, sin Compose ni Leanback: menos runtime y menos heap en una TV de 1,7 GB. Es una decision provisional que se valida con mediciones en el dispositivo.
- Iconos reducidos al tamano de la tarjeta, cargados en segundo plano con 2 hilos que se liberan al estar inactivos, y cache LRU de maximo 8 MB.
- La lista de apps se lee en un hilo aparte y solo se redibuja si cambio.

## Compilar

El APK se compila en GitHub Actions (`.github/workflows/build-launcher.yml`) y se descarga desde la pestana Actions como artefacto `tvhome-launcher-apks` (debug y release, firmados con la clave de depuracion).

Localmente (requiere Android SDK): `cd launcher && ./gradlew assembleRelease`.

## Documentos

- `docs/DISENO.md`: especificacion de diseno.
- `docs/RECUPERACION.md`: como volver al launcher original y desinstalar.
- `docs/MEDICION.md`: protocolo de comparacion de memoria, arranque y fluidez.

## Seguridad de despliegue

- Esta app **no se fija sola como inicio**. Instalarla y cambiar el HOME son pasos separados que requieren aprobacion.
- No desactiva ni modifica el launcher de Google ni ningun servicio de Xiaomi.
