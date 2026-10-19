#!/usr/bin/env python3
"""WER (tasa de error de palabras) entre una transcripción de referencia y una candidata. Solo librería estándar.

uso: python3 wer.py referencia.txt candidata.txt [--keep-accents]
Normaliza: minúsculas, sin puntuación, sin tildes (salvo --keep-accents).
OJO: la referencia de Notion también tiene errores (p. ej. "LEDs", "tajeo"): el WER mide
diferencia respecto a Notion, no exactitud absoluta. Para exactitud real hace falta una
referencia corregida a mano.
"""
import re
import sys
import unicodedata


def words(text: str, keep_accents: bool) -> list[str]:
    t = unicodedata.normalize("NFD", text.lower())
    if not keep_accents:
        t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9ñ]+", unicodedata.normalize("NFC", t))


def wer(ref: list[str], hyp: list[str]) -> dict:
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i] + [0] * len(hyp)
        for j, h in enumerate(hyp, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h))
        prev = cur
    return {"ref_words": len(ref), "hyp_words": len(hyp), "edits": prev[-1],
            "wer": round(prev[-1] / max(len(ref), 1), 4)}


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    keep = "--keep-accents" in sys.argv
    read = lambda p: words(open(p, encoding="utf8").read(), keep)
    print(wer(read(args[0]), read(args[1])))
