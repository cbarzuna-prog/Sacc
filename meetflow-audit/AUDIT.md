# MeetFlow AI — auditoría (Claude, 19 oct 2026)

Base: `MeetFlow-Mac-codigo-prototipo.zip`. Solo lectura de código + `vitest run` (56/56 pasan, confirmado). **No** se ejecutó la app, ni Ollama, ni Whisper, ni el DMG: todo lo de calidad/rendimiento abajo es análisis de código, no medición.

## 1. Descripción vs implementación

| Afirmación | Realidad en el código |
|---|---|
| "Separar acuerdos confirmados, propuestas y pendientes" | **No existe en la ruta nativa.** `assembleDocument` fija `decisions:[]` y `pending:[]`. El esquema nativo solo tiene `commitments` y `topics`. |
| "Se eliminó el límite de 180 caracteres y 2 viñetas" | Hay otros límites: `commitments` ≤ 8, `topics` ≤ 8, viñetas ≤ 5 por tema, `num_predict` 6000. Cualquier reunión larga se recorta. |
| "Casillas de compromisos" | Se filtran con una lista fija de ~35 verbos en infinitivo (`document-summary.ts`, regex `action`). Un compromiso válido que empiece con otro verbo ("Asignar", "Mantener", "Cambiar", "Pasar"…) se **descarta en silencio**. |
| "Referencias reconstruidas del texto real" | Cierto, pero solo prueban que la cita **existe**, no que **sustenta** la síntesis (`evidence.ts` hace `indexOf` de la cita normalizada). Es la causa de "referencias que no sustentan". |
| `localSchema()` en `native/evidence.ts` | **Código muerto**: nadie lo importa. |
| Reuniones largas | `lib.rs` rechaza prompts > 30.000 caracteres. Una reunión de ~1 h (≈50–60 k caracteres) falla; el mensaje pide "dividir la reunión". |
| Pruebas | Las 2 pruebas del generador usan **un segmento sintético**. Ninguna mide calidad ni recuperación de compromisos. 56 verdes no dicen nada sobre el resumen. |

## 2. Causas probables de la mala calidad (hipótesis ordenadas, sin medir)

1. **Modelo**: llama3.2 (3B) con una sola pasada sobre toda la reunión, JSON restringido por esquema y cita literal obligatoria. Es la causa más probable de omisiones y confusión asentimiento↔decisión. Un modelo pequeño no sigue 6 instrucciones a la vez.
2. **Transcripción de entrada**: Whisper **tiny/base** (`useWhisper.ts`), en trozos de 30 s sin solapamiento. Nombres propios y términos salen mal y los cortes parten palabras. Un resumen no puede ser mejor que su transcripción; hoy no se ha medido el WER contra la transcripción Word de Notion.
3. **Descarte silencioso**: toda viñeta cuya cita no coincida *exactamente* se elimina sin registro. Es una fuente directa de omisiones y nadie la ve.
4. **Segunda pasada mal diseñada**: la pasada de "cierre" reutiliza `documentPrompt` completo (pide también temas) sobre los últimos ~2400 caracteres, y se descartan sus temas. Genera tokens inútiles y duplica el coste. La recuperación depende además del filtro de verbos (punto anterior).
5. **Deduplicación** solo por texto idéntico en minúsculas; paráfrasis repetidas pasan.

## 3. Causas probables del consumo de recursos (sin medir)

- Dos llamadas secuenciales a Ollama con `num_ctx 16384` y hasta 6000 tokens de salida cada una, sin `keep_alive` (el modelo se descarga/recarga).
- Whisper en el webview con WebGPU `fp32` o WASM `q8`: normalmente el paso más pesado. Si se ejecutan seguidos transcripción + resumen + compilación, la Mac se satura.
- **No hay medición aislada.** Hay que tomarla (ver §6) antes de optimizar.

## 4. Arquitectura propuesta (separando hecho de suposición)

**Comprobado en código:** hoy todo es local (Whisper en webview + Ollama), sin backend, sin claves.

**Propuesta** (pendiente de aprobación de coste):
1. Pipeline en etapas con datos intermedios guardados: transcripción → limpieza/segmentación por tema → extracción de candidatos (compromisos, decisiones, propuestas, pendientes) con una pregunta por pasada → redacción → verificación.
2. Verificación **semántica** además de la literal: segundo paso que recibe (síntesis, cita) y responde "¿la cita sustenta la síntesis? sí/no". Lo que falle se **marca**, no se borra en silencio.
3. Proveedor de resumen intercambiable (`MinutesProvider`): local (Ollama), y uno remoto opcional. Local queda como modo privado/offline.
4. Transcripción: probar primero `whisper-small`/`large-v3-turbo` en local (whisper.cpp vía sidecar de Tauri es más rápido que Transformers.js en webview — **suposición**, a medir).

## 5. Servicios que ya tienes (verificado solo en búsquedas web; confirmar en la página oficial antes de gastar)

- **Claude**: la suscripción de chat y la API se facturan por separado; la API usa la consola con créditos prepago. Según el centro de ayuda, los planes Max/Team traen algún crédito de API: el monto no figura en lo que vi. → Confirmar en tu consola.
- **ChatGPT**: Plus no incluye clave ni créditos de API (facturación separada; mínimo de recarga reportado US$5 por foros, no por OpenAI). Referencia oficial: help.openai.com/en/articles/7039783.
- **Abacus.AI**: sus páginas dicen que la API RouteLLM **viene con la suscripción ChatLLM** y consume créditos (20K en el plan básico); los modelos "ilimitados" aplican al chat, y un hilo de Reddit (no oficial) dice que no a la API. → Es la opción con más probabilidad de ser "sin gasto extra", pero hay que probar con una llamada real y mirar el log de créditos.
- **Lovable**: el gateway de IA se paga con créditos de Lovable. No encontré documentación oficial de que una clave sea utilizable desde una app instalada fuera de Lovable. Además la clave **no debe ir dentro de una app distribuida**.
- **Gemini (alternativa)**: existe un nivel gratuito con límites por minuto/día, pero el contenido del nivel gratuito puede usarse para mejorar productos de Google — no apto para reuniones de clientes sin revisar los términos.

## 6. Prueba reproducible (propuesta)

Entrada fija: la **misma transcripción** de Notion (Word) → luego el MP3 de 9:06.
1. **Referencia**: extraer del resumen de Notion una lista de afirmaciones y compromisos (anotada a mano, una vez, versionada).
2. **Recuperación de compromisos**: recall y precisión contra la lista de referencia (un juez distinto del generador, con revisión humana de una muestra).
3. **Fidelidad**: % de viñetas cuya cita sustenta la síntesis (juez + muestra humana). Meta inicial a acordar, p. ej. ≥ 90 %.
4. **Falsos compromisos**: asentimientos/propuestas convertidos en compromiso (debe ser ~0).
5. **Transcripción**: WER contra la transcripción Word, por separado.
6. **Rendimiento**: una sola ejecución, sin compilar ni abrir otras apps; registrar tiempo por etapa, pico de RAM y tiempo de CPU (`/usr/bin/time -l`, Monitor de Actividad). Repetir 3 veces.
7. Todo se corre con un script (`eval/`) y guarda JSON de resultados; ningún resumen escrito a mano.

**Faltan insumos**: transcripción Word y capturas del resumen de Notion; el MP3 de 9:06.

## 7. Coordinación con Codex (archivos propuestos; un dueño por archivo)

| Orden | Cambio | Archivos | Dueño propuesto |
|---|---|---|---|
| 1 | Harness de evaluación (sin tocar la app) | `eval/*` (nuevo) | Claude |
| 2 | Medir baseline actual (transcripción + resumen + recursos) | ninguno | Usuario ejecuta, Claude analiza |
| 3 | Quitar descarte silencioso, filtro de verbos y límites; marcar en vez de borrar | `native/document-summary.ts`, `native/evidence.ts` | Codex |
| 4 | Pasada de cierre específica + extracción por categoría | `native/document-summary.ts`, `native/minutes.functions.ts` | Codex (después de 3) |
| 5 | `keep_alive`, un solo modelo, límite de contexto/fragmentación para reuniones largas | `src-tauri/src/lib.rs` | Codex |
| 6 | Proveedor remoto opcional | `native/minutes.functions.ts`, `src-tauri/src/lib.rs` | tras aprobar coste |

Regla: nadie toca un archivo de la lista de otro hasta que su cambio esté mergeado.
