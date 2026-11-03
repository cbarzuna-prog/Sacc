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

## Datos para el total final
- Precio por crédito de Higgsfield: _pendiente_
- Plan de Claude: Max 5x
- Uso extra pagado: ninguno hasta ahora
