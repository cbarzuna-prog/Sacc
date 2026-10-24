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
| Fondo | Degradado estatico oscuro (azul noche a negro) con un velo diagonal tenue | Imagen cinematografica estatica opcional, reducida a la resolucion de pantalla |
| Cabecera | Titulo "Inicio" y reloj 24 h | Reloj opcional (ajuste) |
| Apps | Cuadricula con tarjetas 16:9 de esquinas redondeadas | Fila superior de favoritas, mas grande, y cuadricula debajo (estilo Apple TV) |
| Foco | Escala 1,12, elevacion, etiqueta visible solo al enfocar, animacion de 120 ms | Paralaje ligero solo si el presupuesto lo permite |
| Reordenar | Pulsacion larga en OK o Menu, flechas, OK para terminar | Marcar favoritas |
| Pie | Botones "Ajustes" y "Launcher original" | Atajo de recuperacion visible siempre |

## Medidas y color

- Tarjeta: 152 x 86 dp (16:9), margen 12 dp, relleno lateral 48 dp. Las columnas se calculan segun el ancho real de pantalla (3 a 8).
- Colores: fondo `#05060A` a `#0E1424`, tarjeta `#1E2230`, texto `#F2F4F8`, texto secundario `#9AA3B5`.
- Iconos: se usa el banner de TV de cada app; si no existe, el icono cuadrado centrado sobre fondo oscuro.

## Mando

- Flechas: mover el foco. OK: abrir. Pulsacion larga en OK o Menu: reordenar. Atras: volver al inicio de la cuadricula (nunca cierra el launcher). Home: vuelve al inicio.

## Fuera de alcance (a proposito)

Publicidad, filas patrocinadas, recomendaciones, video de fondo, widgets, servicios en segundo plano.
