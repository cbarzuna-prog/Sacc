# Evaluación de resúmenes MeetFlow vs Notion

Los datos de reuniones van en `data/` y `out/` (ignorados por git; **el repo es público, no los subas**).

## Preparar
`data/audio.mp3` (reunión), `data/transcript_notion.txt` (texto del Word), `data/reference.json`
(compromisos, afirmaciones clave y trampas anotados a partir del resumen de Notion).

## Pasos
1. **Transcripción**: exporta de la app el texto de la transcripción a `out/app_transcript.txt` y corre
   `python3 wer.py data/transcript_notion.txt out/app_transcript.txt`. Repite con cada tamaño de Whisper.
2. **Resumen sobre la MISMA transcripción de Notion**: genera el resumen con MeetFlow a partir de
   `data/transcript_notion.txt` (importar como texto) y guárdalo en `out/summary.md`. Así se aísla el modelo de resumen.
3. **Juez**: `python3 judge.py prompt data/reference.json out/summary.md > out/judge_prompt.txt`, pégalo en otro
   modelo (no el mismo que resumió), guarda el JSON en `out/verdicts.json`, y `python3 judge.py score ...`.
   Muestrea a mano 10 viñetas para comprobar que el juez no se equivoca.
4. **Cadena completa**: audio → resumen, mismas métricas.
5. **Rendimiento**: `./perf.sh <comando>` sin compilaciones ni otras apps, 3 repeticiones; anota tiempo por etapa y pico de memoria.

## Qué cuenta como éxito (a acordar antes de medir)
Sugerencia inicial: recuperación de compromisos = 100 %, falsos compromisos = 0, fidelidad de viñetas ≥ 90 %,
cobertura de afirmaciones ≥ 80 %, la Mac sigue usable durante la generación. Una sola reunión es un caso de prueba,
no una validación: añadir 2–3 reuniones más antes de declarar éxito.
