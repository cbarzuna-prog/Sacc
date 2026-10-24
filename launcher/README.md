# Inicio TV: launcher inspirado en Apple TV (Xiaomi MiTV-MOOQ2)

Launcher nativo en Kotlin para Android TV 11 (API 30), pensado para una TV con ~1,7 GB de RAM y ARMv7 de 32 bits.

**Estado: v0.5.0 (ocultar y mostrar apps desde el mando; botones en la cabecera; atenuado opaco, nombre en tarjetas grandes, iconos redondeados). Medido en la TV (v0.4.0): menos memoria y mejor fluidez que el launcher de Google en la prueba de teclas por ADB (ver `docs/MEDICION.md`).**

## Que hace (v0.5)

- Fila de 3 favoritas grandes (las 3 primeras de tu orden) y cuadricula de 5 por fila con el resto de apps lanzables, descubiertas automaticamente. Todas con el mismo tratamiento: tarjeta oscura con el logo centrado.
- Titulo grande con el nombre de la app enfocada; las demas tarjetas se atenuan.
- Navegacion con el mando (D-pad), foco con escala y sombra, nombre de la app al enfocar.
- Abrir apps con OK. Pulsacion larga en OK (o la tecla Menu) abre un menu: **Mover** (flechas; OK termina; el orden se guarda) u **Ocultar**.
- El boton **Ocultas (n)** de la cabecera muestra las apps ocultas; con pulsacion larga se pueden **Mostrar en inicio** otra vez. Atras vuelve a la vista normal.
- Reloj, atajo a Ajustes y atajo **Launcher original** (recuperacion).
- Fondo estatico abstracto propio de lineas de luz (un JPEG de ~95 KB, ~3,7 MB en memoria; su efecto en la RAM esta por medir).
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
