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
