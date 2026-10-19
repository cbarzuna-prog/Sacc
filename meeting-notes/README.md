# meeting-notes

Prototipo mínimo de notas de reunión con IA: graba, transcribe en local (Whisper) y resume con citas de tiempo.

```bash
cd meeting-notes
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...        # clave de la API de Anthropic

python notes.py                                  # graba del micrófono (Ctrl-C para terminar)
python notes.py reunion.mp3 --template ventas    # o procesa un archivo
```

Salida en `out/`: `transcript.json` y `notes.md`.

- **Audio del sistema (Zoom/Meet):** instala BlackHole y úsalo como dispositivo de entrada.
- **Plantillas:** `auto`, `ventas`, `standup`, `equipo`; `--instructions` añade instrucciones propias.
- **Pendiente:** separar hablantes (pyannote), enlazar citas al audio, preguntas sobre la reunión.
