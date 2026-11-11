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

## Cómo funciona el equipo (lo dijo el usuario; guardado tal cual)
Jerarquía, de arriba hacia abajo:
1. **El usuario** (Chief Human Officer), arriba de todo.
2. **El jefe de gabinete** (chief of staff), vive en el ayuntamiento.
3. **Los directores.** Cada director es dueño de **un área de la vida del usuario y de una casa**. Solo los directores tienen casa propia.
4. **Los trabajadores**, debajo de los directores. Son como pasantes: **su director revisa cada pieza de su trabajo antes de que quede completa**. Cada tarea de un trabajador viene de su director. No tienen casa.

Modelos (nombres como los escribió el usuario):
- **Directores:** Opus 5.5, con el **advisor activado**, para consultar a **Fable 5.1** cuando algo es difícil.
- **Trabajadores:** Sonnet 5.5.

Aplicación al pueblo hoy: los 9 agentes con casa (Dinero, Trading, Investigación, Bandeja y email, Noticias de IA, Meta Ads, Marketing inmobiliario, Inmobiliaria y Outreach) son directores; la Alcaldesa es el jefe de gabinete (ayuntamiento); todavía no hay trabajadores en el pueblo.

Reglas de movimiento (pedidas por el usuario; pendientes de construir, faltan 3 decisiones: cómo saber quién trabaja, si se ensanchan los caminos de un carril y cómo se "anotan" las charlas):
- Quien trabaja camina a su casa, entra, camina hasta su escritorio y se sienta.
- Un director sin trabajo se queda en su propio jardín y puede caminar un poco.
- Cuando el usuario camina cerca de alguien, esa persona se detiene y se voltea a verlo.
- Los trabajadores recorren todo el pueblo. Si se topan con alguien con quien no hablaron ese día, se detienen, preguntan en qué trabaja y ambos toman notas; si ya hablaron hoy, siguen de largo.
- Todos se quedan en los caminos, se rodean entre ellos y nunca atraviesan paredes.
- Nadie se teletransporta: para entrar a una casa caminan hasta la puerta.
- Nadie se para sobre muebles, cercas ni encima de otro.

## Los directores (aprobados por el usuario, opción A: se reutilizaron las 9 hojas de caminata)
Datos completos (nombre, cargo, personalidad, manía, look) en `ai-village/directors.js`: Augustus Whitcombe (Dinero, Banco), Philippa "Pip" Calloway (Trading, Bolsa), Profesora Ottoline Marsh (Investigación, Archivo), Cassius Adeyemi (Bandeja y email, Correo), Billie Fairweather (Noticias de IA, Gaceta), Salvador "Sal" Quintero (Meta Ads), Clementine Hartwell (Marketing inmobiliario, Promotora), Barnaby Crowe (Inmobiliaria, Tierras) y Everett Ridgeway (Outreach, Express). La jefa de gabinete (ayuntamiento) todavía no tiene nombre propio.

Cómo se mueven los directores (construido): casi siempre sentados en su escritorio (caminan de la puerta al escritorio dentro de la habitación y se dibujan detrás del mueble) o en su propio jardín, donde caminan de lado a lado; de vez en cuando, una salida corta por el pueblo. Nadie aparece de golpe: para entrar o salir caminan hasta la puerta. Se detienen y te miran cuando te acercas (y se muestra su nombre y cargo). Se rodean entre ellos y se quedan en caminos, plaza y su propio jardín. Probado: 90 s con los 10 agentes, 0 saltos, 0 salidas del camino, distancia mínima entre agentes ~40 unidades. Pendiente para cuando haya trabajadores: charlas entre trabajadores con notas, y el panel o horario de "trabajando".

Cada director es un agente real con su carpeta: `ai-village/team/<director>/CLAUDE.md` (quién es, su trabajo, a quién reporta y quién le reporta, su "superpoder" basado en métodos públicos de expertos reales, reglas duras) y `ai-village/team/<director>/notes.md` (su memoria). Hecho primero el de Trading (`team/trader/`) para revisión; el usuario dio el visto bueno y se crearon los otros 8 (`banker`, `scholar`, `postman`, `reporter`, `adman`, `promoter`, `broker`, `driver`) y el de la jefa de gabinete (`team/chief/`). Cada director tiene tres "lentes" basadas en métodos públicos de expertos reales (Dinero: Bogle, Munger, Sethi; Trading: Simons, Buffett, Soros; Investigación: Feynman, Tetlock, Sagan; Bandeja: Allen, Mann, Newport; Noticias de IA: Thompson, Karpathy, Kovach y Rosenstiel; Meta Ads: Godin, Ogilvy, Hopkins; Marketing inmobiliario: Corcoran, Serhant, Vaynerchuk; Inmobiliaria: Zell, Shiller, Keller; Outreach: Carnegie, Cialdini, Voss; Jefa de gabinete: Grove, Drucker, Eisenhower). No imitan ni citan a nadie. La jefa de gabinete se llama **Eleanor Sato** (el usuario dejó la elección del nombre a Claude y aprobó el nombre; el 2026-11-03 dijo "dale el nombre que quieras a Eleanor"). Su modelo quedó pendiente de decidir (propuesta: igual que los directores). Estos archivos son instrucciones y memoria; no hay nada corriendo solo (se confirma con el usuario antes de construir algo que corra solo).

## Puestos de director y trabajadores (regla del usuario, 2026-11-03)
- Hay solo **10 puestos de director** (los 9 directores con casa y la jefa de gabinete; `window.DIRECTOR_SPOTS = 10` en `directors.js`). **Todo agente agregado después es un trabajador.**
- **Todo trabajador lleva un chaleco amarillo de seguridad dibujado en su hoja de personaje**, para distinguirlo a primera vista.
- A **cada director se le dio un trabajador** para empezar, **sin tareas todavía** (carpeta `team/<director>/worker/` con `CLAUDE.md`, `notes.md` y `tasks.md` vacío; datos en `workers.js`): Tomás Villaverde (Dinero), Naomi Okafor (Trading), Ravi Menon (Investigación), Lucía Ferreyra (Bandeja y email), Dmitri Volkov (Noticias de IA), Priya Nair (Meta Ads), Mateo Alvarado (Marketing inmobiliario), Olu Bankole (Inmobiliaria) y Freya Lindqvist (Outreach). Modelo Sonnet 5.5; cada tarea viene de su director y su director revisa cada pieza antes de que sea completa. Sin casa propia.
- Las 9 hojas de caminata (4 filas × 3 columnas, con chaleco amarillo) están generadas en Canva a partir de la hoja del banquero. Pendiente: que el usuario las descargue y las adjunte para cortarlas y ponerlas en el pueblo. IDs de Canva: Tomás MAHZ3jU0exo, Naomi MAHZ3h4B2Ms, Ravi MAHZ3npDD9U, Lucía MAHZ3t598r8, Dmitri MAHZ3qEzcYU, Priya MAHZ3jNeHbI, Mateo MAHZ3gT9yF8, Olu MAHZ3qeheh0, Freya MAHZ3pSdO4I.
- Pedido nuevo del usuario (pendiente de construir, esperan 2 decisiones): poses sentadas para que cada personaje se siente en su silla de la mesa del ayuntamiento (el usuario en la cabecera), un botón "Convocar reunión" en la barra de menú (todos van al ayuntamiento con el usuario; al terminar, los directores vuelven a sus jardines y la jefa de gabinete y el usuario quedan frente al ayuntamiento).

## Registro de construcción

### Día 1 — 2026-11-02 (hora de Costa Rica; en UTC ya era 2026-11-03)
- **Inicio:** 18:42 hora de Costa Rica (00:42 UTC), tomada del reloj de la nube con `date`
- **Higgsfield al inicio:** 200 créditos (plan Starter)
- **Uso de Claude al inicio** (captura de pantalla del usuario): sesión actual 4% (se restablece 8:00 p.m.); semana 4% (se restablece jueves 11:00 p.m.); crédito de sesiones en la nube incluido: quedan USD 230 de USD 250 (vence 5 de noviembre, 1:59 a.m. GMT-6); créditos de uso comprados: USD 0. El interruptor de créditos de uso (uso extra) aparece ACTIVADO.
- **Fin:** 00:50 hora de Costa Rica del 2026-11-03 (06:50 UTC), tomada del reloj de la nube con `date`. Duración: 6 h 08 min (incluye esperas entre mensajes).
- **Higgsfield al final:** 200 créditos (plan Starter), leído por la conexión de solo lectura. Créditos gastados en el Día 1: **0**.
- **Uso de Claude al final** (captura de pantalla del usuario, ya pasada la medianoche): "Nueva semana. 4% de tu límite semanal utilizado"; sesión actual 0% (comienza con el primer mensaje); semana 4% (se restablece el jueves 11:00 p.m.). Crédito de sesiones en la nube incluido: quedan **USD 203 de USD 250** (al inicio quedaban USD 230, así que el Día 1 consumió unos **USD 27** de ese crédito incluido; vence el 5 de noviembre, 1:59 a.m. GMT-6). Créditos de uso comprados: **USD 0**.
- **Límite de uso / uso extra pagado:** ninguno. Créditos de uso en USD 0, o sea, no se cobró nada extra. El interruptor de créditos de uso sigue ACTIVADO (si se alcanzara el límite del plan, se cobraría uso extra).
- **Canva (plan Pro del usuario):** unas 50 generaciones y recortes de fondo en el día (6 pruebas del pueblo, 11 habitaciones, 11 edificios con sus 11 recortes, 3 hojas de objetos con sus 3 recortes, 3 hojas de personaje con 1 recorte; conteo aproximado hecho por Claude). Consumo del plan: no medido (Canva no lo expone a Claude).
- **ChatGPT:** el usuario generó la hoja de su personaje con su propia suscripción; Claude no lo usó.
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
  - Pieza 7 (agentes caminando): regla del usuario: cada personaje nuevo después del primero se redibuja a partir de una hoja existente como referencia (Canva, no Higgsfield; no solo palabras), misma cuadrícula 4 filas × 3 columnas (frente, derecha, izquierda, espaldas; pie izquierdo, de pie, pie derecho). La hoja del banquero fue la base; se generaron las otras 9 en Canva con esa referencia. Recibidas y procesadas con código (fondo quitado, 12 cuadros alineados por los pies, celdas de 240×340 px) en `ai-village/agents/`: banquero (Dinero), trader (Trading), erudita (Investigación), reportera (Noticias de IA) y publicista (Meta Ads); después llegaron alcaldesa (Jefe de gabinete), conductor de diligencia (Outreach), corredor (Inmobiliaria) y promotora (Marketing inmobiliario). Por último llegó el cartero (Correo): ya están los 10 agentes (9 en `agents/` más el banquero; archivos: banker, trader, scholar, postman, reporter, adman, promoter, broker, driver, mayor). Ya están puestos en el pueblo (decisión del usuario): cada agente vive en su casa (la alcaldesa en el ayuntamiento; la Mansión del Director es la casa del usuario y no tiene agente), sale a pasear por los caminos y la plaza, vuelve a su casa, se detiene y mira al usuario cuando este se acerca (a menos de ~30 unidades) y nunca se detiene frente a una puerta (solo se detienen en caminos y plaza fuera de los jardines de las casas). Dentro de su habitación se ve parado junto a su escritorio mientras está en casa; no se puede atravesar a un agente. Los agentes que faltan en la ruta de salida no bloquean puertas. El título de los interiores ya no dice "(vacío)".
  - Pieza 2 (alta resolución, opción B): el usuario aprobó el Lejano Oeste y pidió la máxima calidad para hacer mucho zoom. Todo se redibuja con código a la resolución real de la pantalla (Retina incluido) en cada cuadro, así que nunca se ve borroso. Arte rediseñado con más detalle (tejas y tablas individuales, ventanas con postigos, faroles con luz, humo de chimenea, bandera, interiores con muebles, luz de ventanas y fuego en la estufa). Zoom de 59% (todo el pueblo) a 800%: rueda/pellizco, teclas + y −, arrastrar para mover la cámara, 0 para volver. Pantalla completa. Probado a 2x de densidad de píxeles: sin errores, ~5 ms por cuadro.

## Datos para el total final
- Precio por crédito de Higgsfield: _pendiente_
- Plan de Claude: Max 5x
- Uso extra pagado: ninguno hasta ahora

## Reunión, chat y programita (construido)
Decisiones del usuario: asientos con la mitad de arriba del sprite de perfil (opción A, sin arte nuevo, piernas ocultas); los trabajadores se quedan de pie junto a las paredes cerca de su director durante la reunión; sí al programita local que usa su Claude Code (sin llaves de API).
- Menú superior: Convocar/Terminar reunión, Jefa de gabinete (también doble M), Registro (izquierda).
- Reunión: el usuario camina solo al ayuntamiento y se sienta a la cabecera (de frente, piernas bajo la mesa). Izquierda: Eleanor, Augustus, Ottoline, Cassius, Billie. Derecha: Pip, Sal, Clementine, Barnaby, Everett. Silla del pie vacía. Al terminar: los directores vuelven a su jardín; Eleanor y el usuario quedan frente al ayuntamiento.
- Trabajadores: aparecen solo cuando existe `agents/w_<director>.png`; viven en el jardín de su director, pasean seguido y en la reunión se paran junto a la pared. Faltan las 9 hojas con chaleco amarillo.
- Chat: T junto a alguien abre la caja de la derecha; doble M abre la de la jefa de gabinete y el registro. Órdenes a la jefa se reparten a directores (máx. 3 por mensaje).
- Programita: `node helper/server.js` (o `--fake`). Ver `helper/LEEME.md`. Probado en modo prueba; las llamadas reales a Claude Code no se pueden probar en la nube.

### Llamadas, charlas y acceso (siguiente tanda)
- "Eleanor, llama a X" (teléfono con ondas y línea en el Registro), "X, ven aquí", "vuelve al trabajo": las entiende el juego por palabras clave, sin gastar Claude.
- Panel izquierdo con pestañas Reunión / Registro / Charlas (tecla C), tamaño ajustable (arrastrar esquina, A− / A+). En la reunión: lista con retratos y "Todos" (cada uno contesta por separado, 3 a la vez).
- Charlas entre vecinos: modelo local (Ollama), apagado por defecto, solo si hay algo real que decir; no gasta el plan.
- Acceso de Cassius (Bandeja y email): Gmail + Google Calendar, solo lectura, vía conectores. Supuesto: el mensaje del usuario traía los corchetes sin llenar ([director], [inbox y calendario], [Gmail]); se interpretó como el director de Bandeja y email. Sin probar con Claude real.

### Pendientes y recordatorios
- Los directores avisan lo que les falta con [[NECESITO: …]]; el programita guarda la lista; pestaña Pendientes; "!" sobre quien te necesita; Eleanor te recuerda cada 5 min y un director te busca cada 4 min (solo con la página abierta, sin gastar plan; se pueden apagar o posponer).

## Cambio de tema: aldea de superhéroes (2026-11-03)
Decisión del usuario: los personajes pasan a ser **superhéroes**, cada uno con un superpoder que representa su trabajo. Nombres reemplazados por el nombre de héroe (se aceptan los viejos al hablar). Se rehacen: personajes (9 directores, jefa de gabinete y el usuario; los **trabajadores quedan igual**) y la aldea (**las casas deben representar el poder de su héroe**). Efecto sencillo en el juego (brillo y chispas del color del poder mientras usan su poder).
| Antes | Héroe | Superpoder |
|---|---|---|
| Augustus Whitcombe | Capitán Balance | Rayos X de Cuentas |
| Pip Calloway | Flash Ticker | Visión de Probabilidades |
| Ottoline Marsh | Doctora Archivo | Mente Biblioteca |
| Cassius Adeyemi | Cartero Relámpago | Triaje Instantáneo |
| Billie Fairweather | Detectora Fuente | Detector de Verdad |
| Sal Quintero | Capitán Eslogan | Doble Yo (A/B) |
| Clementine Hartwell | Luz Narradora | Da Vida a los Lugares |
| Barnaby Crowe | Piedra Angular | Sentido Sísmico |
| Everett Ridgeway | Mensajero Imparable | Entrega Garantizada |
| Eleanor Sato | Comandante Cinta | Visión de Tablero |
Hecho (texto, gratis): nombres, poderes, CLAUDE.md con sección "Mi identidad de héroe", EQUIPO.md, tarjeta al pasar el ratón, efecto de aura.
Pendiente (arte, necesita el sí del usuario antes de generar): hojas de caminata nuevas (Canva, a partir de las existentes; primero una de prueba), edificios y, después, interiores.

### Trabajadores recibidos (5 de 9)
- Llegaron y se cortaron con `scratchpad/make_sheet.py` (fondo blanco → transparente, 12 cuadros alineados por los pies, celdas 240×340): Freya Lindqvist (`w_driver`), Olu Bankole (`w_broker`), Mateo Alvarado (`w_promoter`), Priya Nair (`w_adman`), Dmitri Volkov (`w_reporter`). Faltan: Tomás (`w_banker`), Naomi (`w_trader`), Ravi (`w_scholar`) y Lucía (`w_postman`). El usuario pidió esperar a los otros 4 antes de subir.
- Probado en modo prueba: aparecen en el jardín de su director, pasean y en la reunión se paran junto a la pared de su lado.
- Llegaron las 4 que faltaban: Lucía (`w_postman`), Ravi (`w_scholar`), Naomi (`w_trader`) y Tomás (`w_banker`). Ya están los 9 trabajadores en `agents/w_*.png` (cortados con `make_sheet.py`, que ahora también limpia restos de sombra bajo los pies). Probado en modo prueba: 9 activos, sin errores.

### Héroes nuevos recibidos (ChatGPT)
- Una hoja con 8 héroes y otra con el héroe del usuario (Capitán Humano). Se cortaron con `scratchpad/hero_sheets.py` (asigna cada pieza al cuadro más cercano, así las capas no se cortan) y se guardaron SIN borrar los sprites anteriores: `agents/h_<id>.png` y `chief/hero.png`. El juego usa el `h_` si existe y, si no, el anterior.
- Asignación (por el aspecto): trader=pelo rojo y antifaz verde, scholar=moño gris y traje morado, reporter=gorra café y traje rojo/azul, promoter=sombrero de paja y traje crema, postman=piel oscura y gorra verde, mayor=sombrero de copa, driver=sombrero ocre y barba blanca, banker=lentes y bigote. Por confirmar con el usuario.
- Faltan: Capitán Eslogan (`adman`) y Piedra Angular (`broker`) (siguen con el dibujo anterior).
- Resolución: los 8 vienen más pequeños que el héroe solo (píxeles más gruesos al acercar). Mejor uno por imagen.

### Héroes: los 10 en versión individual (+ el del usuario)
- Cortados con `scratchpad/hero_sheets.py` y guardados como `agents/h_<id>.png` (banker, trader, scholar, postman, reporter, adman, promoter, broker, driver, mayor) y `chief/hero.png` (Capitán Humano, tuyo). Los sprites anteriores siguen en `agents/` como respaldo (el juego usa `h_` si existe).
- Pendiente: una hoja de 4 columnas (hombre joven de pelo castaño, armadura marrón, capa turquesa, brújula) que no se identificó; podría ser una alternativa para el héroe del usuario.
- Siguiente fase: aldea (casas) que represente cada poder, con aprobación antes de generar.

## Villa moderna (2026-11-11)
- Decisión del usuario: estilo **futurista cercano + eco-moderno**, aspecto **ilustrado limpio**; las casas finales salen de Canva (13 casas: 9 héroes, mansión de Capitán Humano, ayuntamiento de Comandante Cinta, Knock Knock y SACC). Las casas del Lejano Oeste (7 ya generadas) quedan sin uso.
- Código: mapa de 40×36 con dos casas nuevas abajo (Knock Knock = casa 11, SACC = casa 12); suelo de pasto con caminos y plaza de adoquín; árboles, arbustos, flores y maceteros modernos; fuente moderna; monorriel arriba; luz de día. Los objetos del Oeste (barriles, cajas, cercas) ya no se colocan.
- Casas: el juego busca `sprites/m_<clave>.png` (lienzo completo con fondo transparente). Claves: banco=Capitán Balance, bolsa=Flash Ticker, archivo=Doctora Archivo, correo=Cartero Relámpago, gaceta=Detectora Fuente, metaads=Capitán Eslogan, promotora=Luz Narradora, tierras=Piedra Angular, express=Mensajero Imparable, mansion=Capitán Humano, hall=Comandante Cinta, knock=Knock Knock, sacc=SACC. El nombre se escribe sobre el cartel en blanco (posición en `MPLATE`).
- Los `m_*.png` actuales son **miniaturas de baja resolución (200×161)** de las vistas previas de Canva: sirven para ver la villa ya. Se reemplazan por las imágenes descargadas del usuario (que él va cargando).
- Siguiente: objetos modernos (bancas, farolas, etc.), interiores modernos (13), y los dos héroes nuevos (Knock Knock y SACC) con su carpeta, hoja de personaje y habitación. Canva gastado en esta línea: ~26 acciones (13 generaciones + 13 recortes) más las referencias y las 4 muestras.
- Casas en alta calidad recibidas del usuario (1408×1136, fondo transparente): SACC, Knock Knock, Comandante Cinta (ayuntamiento), Capitán Humano (mansión) y Mensajero Imparable → `sprites/m_sacc|knock|hall|mansion|express.png`. Faltan 8 por recibir: banco, bolsa, archivo, correo, gaceta, metaads, promotora, tierras (siguen con la miniatura).
- Segunda tanda de casas en alta calidad: Piedra Angular, Luz Narradora, Capitán Eslogan, Detectora Fuente y Cartero Relámpago → `sprites/m_tierras|promotora|metaads|gaceta|correo.png`. Ya hay 10 de 13. Faltan Capitán Balance (`banco`), Flash Ticker (`bolsa`) y Doctora Archivo (`archivo`): llegaron dos (Flash Ticker y Capitán Balance) mientras yo trabajaba y no se guardaron; hay que reenviarlas en un mensaje nuevo.
