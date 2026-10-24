# Especificacion de diseno: Inicio TV

Inspirada en los principios de tvOS (foco claro, profundidad, calma visual). No usa ningun recurso propietario de Apple: iconos, tipografia y colores son propios o del sistema.

## Principios

1. **El foco manda.** Un unico elemento enfocado, claramente elevado.
2. **Profundidad sutil.** Escala + sombra, sin efectos de GPU costosos.
3. **Calma.** Fondo oscuro estatico, sin video, sin parpadeos, sin publicidad.
4. **Barato en una TV con poca RAM.** Cada decision visual se valida contra el presupuesto de memoria.

## Pantalla de inicio (v0.4)

| Elemento | Decision |
|---|---|
| Fondo | Cintas de lineas de luz (turquesa a violeta) sobre cielo nocturno con polvo de luz. JPEG de 1280x720 (~95 KB, ~3,7 MB en memoria), generado por `tools/gen_bg.py` |
| Jerarquia | Titulo de 40 sp con el nombre de la app enfocada, y debajo la seccion ("Favoritas" o "Todas las apps"). Reloj ligero a la derecha |
| Favoritas | 3 tarjetas grandes en la primera fila (las 3 primeras de tu orden) |
| Resto de apps | Cuadricula de 5 por fila con tarjetas pequenas |
| Tarjeta | Tratamiento uniforme: tarjeta oscura con degradado vertical, ligero tinte del color medio del logo, borde de luz fino y el logo centrado (56 % del alto). Si el logo es oscuro y transparente se usa una placa clara para que no desaparezca; los iconos cuadrados a sangre se redondean. Las tarjetas grandes llevan ademas el nombre de la app horneado debajo del logo. Todo horneado en un bitmap |
| Foco | La tarjeta enfocada escala 1,10 y se ve a pleno brillo; las demas se oscurecen con un filtro negro al 30 % (siguen opacas, no dejan ver el fondo). Solo escala y filtro, sin sombras ni desenfoque en tiempo real |
| Reordenar | Pulsacion larga en OK o Menu, flechas, OK para terminar |
| Botones | "Ajustes" y "Launcher original" en la cabecera, junto al reloj (liberan altura para tres filas) |

## Medidas y color

- Tarjetas 16:9 calculadas segun el ancho real de pantalla: grandes = ancho util / 3, pequenas = ancho util / 5 (menos 10 dp de margen por lado); relleno lateral 48 dp.
- Colores: fondo base `#05060A`, texto `#F2F4F8`, texto secundario `#9AA3B5`.
- Tipografia: la del sistema (`sans-serif-medium` para el titulo, `sans-serif-light` para el reloj). No se empaqueta ninguna fuente para no gastar memoria.

## Mando

- Flechas: mover el foco. OK: abrir. Pulsacion larga en OK o Menu: reordenar. Atras: volver al inicio de la cuadricula (nunca cierra el launcher). Home: vuelve al inicio.

## Fuera de alcance (a proposito)

Publicidad, filas patrocinadas, recomendaciones, video de fondo, widgets, servicios en segundo plano.
