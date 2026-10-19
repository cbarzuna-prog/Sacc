#!/usr/bin/env python3
"""Mini AI meeting notes: record -> transcribe (local Whisper) -> summarize with citations."""
import argparse
import json
import sys
import time
from pathlib import Path

MODEL = "claude-sonnet-5-5"

TEMPLATES = {
    "auto": "Resume la reunión: contexto, puntos clave, decisiones.",
    "ventas": "Resume como llamada de ventas: necesidades del cliente, objeciones, presupuesto, próximos pasos.",
    "standup": "Resume como stand-up: avances, planes y bloqueos por persona.",
    "equipo": "Resume como reunión de equipo: temas, decisiones, responsables.",
}


def fmt(t: float) -> str:
    return f"{int(t // 60):02d}:{int(t % 60):02d}"


def record(out: Path) -> Path:
    """Graba el micrófono hasta Ctrl-C. Para audio del sistema usa BlackHole como dispositivo de entrada."""
    import numpy as np
    import sounddevice as sd
    import soundfile as sf

    rate, chunks = 16000, []
    print("Grabando... Ctrl-C para detener.")
    try:
        with sd.InputStream(samplerate=rate, channels=1, callback=lambda d, *_: chunks.append(d.copy())):
            while True:
                time.sleep(0.2)
    except KeyboardInterrupt:
        pass
    sf.write(out, np.concatenate(chunks), rate)
    return out


def transcribe(audio: Path, language: str | None) -> list[dict]:
    from faster_whisper import WhisperModel

    model = WhisperModel("small", compute_type="int8")  # corre bien en CPU / Apple Silicon
    segments, _ = model.transcribe(str(audio), language=language, vad_filter=True)
    return [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments]


def summarize(segments: list[dict], template: str, instructions: str = "") -> str:
    import anthropic

    transcript = "\n".join(f"[{fmt(s['start'])}] {s['text']}" for s in segments)
    prompt = (
        f"{TEMPLATES[template]}\n{instructions}\n\n"
        "Responde en español con secciones: Resumen, Decisiones, Tareas (responsable si se menciona). "
        "Cada punto debe terminar con una cita del momento, como [03:12], usando solo marcas de la transcripción. "
        "No inventes nada que no esté en la transcripción.\n\nTranscripción:\n" + transcript
    )
    msg = anthropic.Anthropic().messages.create(
        model=MODEL, max_tokens=2000, messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("audio", nargs="?", help="archivo de audio; si se omite, graba del micrófono")
    p.add_argument("--template", choices=TEMPLATES, default="auto")
    p.add_argument("--instructions", default="", help="instrucciones personalizadas para el resumen")
    p.add_argument("--language", default=None, help="código de idioma, ej. es (por defecto autodetecta)")
    p.add_argument("--out", default="out", help="carpeta de salida")
    a = p.parse_args()

    out = Path(a.out)
    out.mkdir(exist_ok=True)
    audio = Path(a.audio) if a.audio else record(out / "meeting.wav")
    segments = transcribe(audio, a.language)
    (out / "transcript.json").write_text(json.dumps(segments, ensure_ascii=False, indent=2))
    if not segments:
        sys.exit("No se detectó voz en el audio.")
    notes = summarize(segments, a.template, a.instructions)
    (out / "notes.md").write_text(notes)
    print(notes)


if __name__ == "__main__":
    main()
