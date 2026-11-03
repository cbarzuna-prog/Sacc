# El programita de My AI Village

Sirve para que los personajes **contesten de verdad** cuando les hablas (tecla T) y para que la jefa de gabinete reparta tus órdenes a los directores.

## Qué hace (y qué no)
- Corre **solo en tu computadora** (127.0.0.1). Nadie más de tu red puede usarlo.
- Para cada mensaje abre **tu propio Claude Code** (`claude -p`) con tu suscripción. **No usa llaves de API ni servicios de pago por uso**; si tienes una llave de API en tu entorno, el programita se la quita al abrir Claude.
- Los personajes solo pueden **leer** su carpeta (`Read, Grep, Glob`). No pueden ejecutar comandos, escribir archivos, mandar correos ni mover dinero.
- El programita (no el personaje) agrega una línea a `team/<director>/notes.md` después de cada charla.
- **Cuenta contra tu plan Max 5x.** Antes de usarlo, apaga el interruptor de "créditos de uso / extra usage" en tu cuenta de Claude, para que nunca cobre de más.
- No arranca solo: tú lo abres y lo cierras (Ctrl+C).

## Cómo abrirlo
1. Necesitas Node.js y Claude Code instalados, con sesión iniciada (`claude`).
2. En una terminal, dentro de la carpeta `ai-village`:
   ```
   node helper/server.js
   ```
3. Abre http://localhost:8787 en el navegador (no abras index.html directo, o el chat no tendrá conexión).

## Probar sin gastar nada
```
node helper/server.js --fake
```
Las respuestas son de mentira (dicen "modo prueba"), no se usa Claude.

## Ajustes
`helper/config.json`: puerto, modelos (`claude-opus-5-5` directores, `claude-sonnet-5-5` trabajadores) y tiempo máximo por respuesta.
El "advisor" (Fable 5.1) no se puede encender desde la línea de comandos; los directores usan solo su modelo.

## Acceso a tu Gmail y tu calendario (solo lectura)
- Cassius Adeyemi (director de Bandeja y email) puede **leer** tu Gmail y ver tu Google Calendar a través de **tus conectores de claude.ai**. Está en `helper/config.json`, sección `access`.
- Solo se permiten herramientas de lectura: buscar y leer correos, ver etiquetas, ver calendarios y eventos. **No puede** enviar, responder, borrar, archivar, crear borradores ni crear o cambiar eventos.
- Para que funcione: en claude.ai → Ajustes → Conectores, conecta **Gmail** y **Google Calendar**, y usa Claude Code con la misma cuenta. Al abrir el programita verás la línea "Acceso a conectores: …".
- Si Cassius dice que sigue sin acceso, casi seguro el conector no está conectado o Claude Code no tiene sesión con esa cuenta. No lo puedo probar desde la nube.
- Lo que Claude lee de tus correos pasa por tu suscripción de Claude, como cualquier otro mensaje.

## Charlas entre vecinos con un modelo local (gratis)
- Cuando dos vecinos se cruzan, un **modelo que corre en tu computadora** (Ollama) puede escribir una charla corta. Solo se guarda si tienen algo real que decirse; si no, el modelo responde SKIP y no pasa nada. Límite: una cada 60 s y 12 por día.
- **No usa tu plan de Claude, ni llaves de API, ni internet.** Solo habla con `127.0.0.1`.
- Viene **apagado**: lo enciendes tú en el panel de **Charlas** (tecla C), y solo si el modelo está instalado.
- Para instalarlo (una vez): instala Ollama desde ollama.com y en una terminal escribe `ollama pull llama3.2:3b` (unos 2 GB). Puedes cambiar de modelo en `helper/config.json` → `smallTalk.model`.

## Internet para los directores
- Los 10 (los 9 directores y Eleanor) pueden **buscar en la web y abrir páginas** con las herramientas de Claude Code (`WebSearch` y `WebFetch`), incluidas en tu plan, sin llaves de API. Está en `helper/config.json` → `webAccess` (quita un nombre de la lista para quitárselo).
- Cada dato de internet debe traer **fuente y fecha**. Si no lo encuentran, deben decirlo.
- Nunca deben poner datos privados tuyos en una búsqueda. Cassius tiene una regla extra: nada de contenido de tus correos en búsquedas.
- Gasta más plan que una charla normal, y lo que buscan sale de tu computadora hacia las páginas y hacia Anthropic.
