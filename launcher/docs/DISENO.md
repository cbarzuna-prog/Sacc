# Especificacion de diseno: Inicio TV

Inspirada en los principios de tvOS (foco claro, profundidad, calma visual). No usa ningun recurso propietario de Apple: iconos, tipografia y colores son propios o del sistema.

## Principios

1. **El foco manda.** Un unico elemento enfocado, claramente elevado.
2. **Profundidad sutil.** Escala + sombra, sin efectos de GPU costosos.
3. **Calma.** Fondo oscuro estatico, sin video, sin parpadeos, sin publicidad.
4. **Barato en una TV con poca RAM.** Cada decision visual se valida contra el presupuesto de memoria.

## Pantalla de inicio

| Elemento | v0.1 | Siguiente iteracion |
|---|---|---|
| Fondo | v0.3: arte abstracto propio (aurora oscura turquesa y violeta con haz diagonal), un JPEG de 960x540 (~27 KB), generado por `tools/gen_bg.py` | Variantes de color |
| Cabecera | Titulo "Inicio" y reloj 24 h | Reloj opcional (ajuste) |
| Apps | v0.3: fila superior de 4 favoritas grandes (las 4 primeras de tu orden) y cuadricula de 5 por fila debajo, tarjetas 16:9 de esquinas redondeadas | Marcar favoritas por separado del orden |
| Foco | Escala 1,12, elevacion, etiqueta visible solo al enfocar, animacion de 120 ms | Paralaje ligero solo si el presupuesto lo permite |
| Reordenar | Pulsacion larga en OK o Menu, flechas, OK para terminar | Marcar favoritas |
| Pie | Botones "Ajustes" y "Launcher original" | Atajo de recuperacion visible siempre |

## Medidas y color

- Tarjetas 16:9 calculadas segun el ancho real de pantalla: grandes = ancho util / 4, pequenas = ancho util / 5 (menos el margen de 10 dp por lado); relleno lateral 48 dp.
- Colores: fondo base `#05060A`, tarjeta `#1E2230`, texto `#F2F4F8`, texto secundario `#9AA3B5`.
- Iconos: se usa el banner de TV de cada app; si no existe, el icono cuadrado centrado sobre fondo oscuro.

## Mando

- Flechas: mover el foco. OK: abrir. Pulsacion larga en OK o Menu: reordenar. Atras: volver al inicio de la cuadricula (nunca cierra el launcher). Home: vuelve al inicio.

## Fuera de alcance (a proposito)

Publicidad, filas patrocinadas, recomendaciones, video de fondo, widgets, servicios en segundo plano.
