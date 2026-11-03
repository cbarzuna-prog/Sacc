# My AI Village — Notas

## Reglas del proyecto
- El usuario es el director; Claude construye.
- Página web que corre en la computadora del usuario. Todo en la carpeta `ai-village`.
- Solo suscripciones del usuario. Sin API keys ni servicios de pago por uso. Se confirma antes de construir algo que corra solo.
- Antes de gastar créditos de Higgsfield en una tanda: decir cuántos créditos aproximadamente y esperar el sí.
- Mostrar cada pieza terminada antes de pasar a la siguiente.
- Antes de crear, sobrescribir o borrar archivos, ejecutar algo o gastar: explicarlo en palabras simples y esperar el sí.

## Decisiones
1. Proyecto: un pueblito de personajes de IA que hablan; se irá moldeando poco a poco.
2. Estilo: RPG de 16 bits, vista desde arriba.
3. Cada agente de IA vive y trabaja en su propia casa.
4. Primera etapa: construir el pueblo **vacío** (sin personajes): casas, caminos, árboles, plaza central y ayuntamiento. Todas las casas se pueden entrar.
5. Trabajamos en la nube (sesión de Claude Code en el contenedor, repo `cbarzuna-prog/Sacc`, rama `claude/wonderful-tesla-kux33u`).
7. Estilo elegido: Lejano Oeste tipo Red Dead Redemption. 10 casas (3 a cada lado, 2 arriba, 2 abajo), ayuntamiento al norte, plaza central con bomba de agua. Todo dibujado con código (sin imágenes externas, sin API keys, sin nada que corra solo).
6. Higgsfield: la conexión de Claude solo puede ver saldo, modelos y generaciones; no genera. Plan Starter.

## Registro de construcción

### Día 1 — 2026-11-02 (hora de Costa Rica; en UTC ya era 2026-11-03)
- **Inicio:** 18:42 hora de Costa Rica (00:42 UTC), tomada del reloj de la nube con `date`
- **Higgsfield al inicio:** 200 créditos (plan Starter)
- **Uso de Claude al inicio** (captura de pantalla del usuario): sesión actual 4% (se restablece 8:00 p.m.); semana 4% (se restablece jueves 11:00 p.m.); crédito de sesiones en la nube incluido: quedan USD 230 de USD 250 (vence 5 de noviembre, 1:59 a.m. GMT-6); créditos de uso comprados: USD 0. El interruptor de créditos de uso (uso extra) aparece ACTIVADO.
- **Fin:** hora: _pendiente_
- **Higgsfield al final:** _pendiente_
- **Uso de Claude al final:** _pendiente_
- **Límite de uso / uso extra pagado:** ninguno hasta ahora
- **Qué se construyó:**
  - 6 imágenes de prueba en Canva (2 futuristas, medieval, renacimiento, lejano oeste, victoriana). No se usó Higgsfield (sigue en 200 créditos). Gasto en Canva: no medido.
  - El usuario eligió el **Lejano Oeste**, estilo "Red Dead Redemption" (ambiente polvoriento, pixel art 16 bits visto desde arriba).
  - Pieza 1 (pueblo vacío y recorrible): `ai-village/index.html`, `style.css`, `game.js`. 10 casas numeradas, ayuntamiento, plaza con bomba de agua, caminos hasta cada puerta, jardines despejados, cactus y árboles secos. Todas las casas y el ayuntamiento se pueden entrar. Un "visitante" (vaquero pequeño) se mueve con flechas/WASD; Esc sale de una casa.
  - Comprobado con navegador automático: las 10 casas y el ayuntamiento se entran y se sale de ellos, sin errores.
  - Pieza 3 (cada edificio según el trabajo del agente). Distribución aprobada por el usuario: 1 Banco (Dinero), 2 Bolsa (Trading), 3 Archivo (Investigación), 4 Correo (Bandeja y email), 5 Gaceta (Noticias de IA), 6 Meta Ads, 7 Promotora (Marketing inmobiliario), 8 Tierras (Inmobiliaria), 9 Express (Outreach), 10 Mansión del Director (casa del usuario, más grande, estilo mansión de la época con torre, balcón y cráneo de toro), Ayuntamiento = jefe de gabinete. Telégrafo: cables con pulsos de luz salen del ayuntamiento a cada edificio. Los jardines de enfrente siguen despejados; el detalle va solo en fachada, techo y porche. Interiores sin tematizar todavía. Los interiores muestran el nombre de cada edificio.
  - Pieza 4 (edificios con arte de Canva, mismo estilo de las habitaciones): cada edificio se genera por separado en Canva (pixel art 16 bits, fondo blanco), se le quita el fondo en Canva y se coloca sobre el pueblo conservando mapa, puertas, colisiones y zoom. Los nombres de los carteles se escriben con código (nítidos). Si falta un archivo en `ai-village/sprites/`, se usa el dibujo hecho con código. Los 11 edificios ya están integrados (Ayuntamiento, Banco, Bolsa, Archivo, Correo, Gaceta, Meta Ads, Promotora, Tierras, Express y Mansión del Director). Auditoría de caminos repetida con los nuevos edificios: las 11 puertas siguen despejadas y alcanzables. El entorno en la nube no puede descargar archivos de Canva (bloqueado por la red): los archivos los adjunta el usuario en el chat. Canva: plan Pro del usuario.
  - Pieza 5 (objetos pequeños): 3 hojas de Canva (bancas, faroles y máquina expendedora POP sin marca real; barriles, cajas y cercas; jardineras, arbustos y fuente), cortadas en 28 objetos sueltos en `ai-village/props/`. La fuente reemplaza la bomba de agua del centro de la plaza. Se colocan con una lista de posiciones que solo se aplica si el sitio está libre (nunca sobre caminos, jardines frente a las puertas ni otros objetos); los objetos sólidos bloquean el paso. Auditoría de caminos con los objetos puestos: las 11 puertas siguen despejadas y alcanzables.
  - Interiores de Canva (11 imágenes, 1680×944): aprobados por el usuario. Ya integrados los 11 (Banco incluido, el último en llegar): Ayuntamiento (tamaño normal; contadas 12 sillas: 5 por lado + cabecera para el usuario + pie), Bolsa, Archivo, Correo, Gaceta, Meta Ads, Promotora, Tierras, Express y Mansión del Director (estas 9 agrandadas a 3840×2160, solo agrandado, sin detalle nuevo). Cada habitación mide 512×288 unidades en el juego (la persona de pie es 1/12 del alto), se carga al entrar y se suelta al salir. Colisiones: suelo, puerta centrada abajo y un rectángulo por mueble. Se sale caminando por la puerta de abajo. Ya no queda ningún interior pendiente; el interior dibujado con código queda solo como respaldo si falta un archivo.
  - Pieza 6 (tu personaje, Chief Human Officer): hoja de personaje hecha por el usuario en ChatGPT con sus fotos (más parecida que las 3 versiones de Canva hechas solo con texto; la subida de fotos a Canva está bloqueada por la red del entorno). Estilo pixel art de 16 bits, camisa blanca, chaleco de cuero marrón y estrella de sheriff dorada. Se le quitó el fondo con código (rellenado desde el borde), se cortaron las 16 poses de caminata (4 direcciones x 4 cuadros) y se armó `ai-village/chief/walk.png` (celdas 120×170 px); el retrato está en `ai-village/chief/portrait.png` (para diálogos futuros). En el juego mide ~24 unidades (1/12 del alto de una habitación) y reemplaza al vaquero de prueba; si falta el archivo se usa el vaquero. También: copia de las habitaciones ya ajustada al tamaño de pantalla para que dibujar el interior sea más rápido (de ~21 ms a ~6 ms por cuadro en la prueba).
  - Pieza 2 (alta resolución, opción B): el usuario aprobó el Lejano Oeste y pidió la máxima calidad para hacer mucho zoom. Todo se redibuja con código a la resolución real de la pantalla (Retina incluido) en cada cuadro, así que nunca se ve borroso. Arte rediseñado con más detalle (tejas y tablas individuales, ventanas con postigos, faroles con luz, humo de chimenea, bandera, interiores con muebles, luz de ventanas y fuego en la estufa). Zoom de 59% (todo el pueblo) a 800%: rueda/pellizco, teclas + y −, arrastrar para mover la cámara, 0 para volver. Pantalla completa. Probado a 2x de densidad de píxeles: sin errores, ~5 ms por cuadro.

## Datos para el total final
- Precio por crédito de Higgsfield: _pendiente_
- Plan de Claude: Max 5x
- Uso extra pagado: ninguno hasta ahora
