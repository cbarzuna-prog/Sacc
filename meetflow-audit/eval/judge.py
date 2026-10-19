#!/usr/bin/env python3
"""Evaluación de resúmenes con juez externo (sin API de pago).

1) python3 judge.py prompt data/reference.json out/summary.md > out/judge_prompt.txt
   Pega ese texto en un chat con un modelo DISTINTO del que generó el resumen (Claude, ChatGPT...)
   y guarda la respuesta JSON como out/verdicts.json.
2) python3 judge.py score data/reference.json out/verdicts.json

reference.json: {"commitments":[str], "claims":[str], "traps":[str]}
 - commitments: compromisos reales (del cierre de la reunión)
 - claims: afirmaciones clave que un buen resumen debe cubrir
 - traps: cosas que NO son compromiso (propuestas, "lo evaluamos", asentimientos)
verdicts.json: {"commitments":[bool], "claims":[bool], "traps_as_commitment":[bool],
                "bullets":[{"text":str,"supported":bool}]}
"""
import json
import sys


def prompt(ref: dict, summary: str) -> str:
    return f"""Eres un evaluador estricto de minutas de reunión. Responde SOLO con JSON válido.
Te doy una LISTA DE REFERENCIA y una MINUTA candidata. No tienes la transcripción: juzga solo por la minuta.

COMPROMISOS DE REFERENCIA (en orden):
{json.dumps(ref["commitments"], ensure_ascii=False, indent=1)}

AFIRMACIONES CLAVE DE REFERENCIA (en orden):
{json.dumps(ref["claims"], ensure_ascii=False, indent=1)}

TRAMPAS: ítems que NO son compromisos (en orden):
{json.dumps(ref["traps"], ensure_ascii=False, indent=1)}

MINUTA CANDIDATA:
<<<
{summary}
>>>

Devuelve:
{{"commitments":[true/false por cada compromiso de referencia: ¿la minuta lo recoge con el mismo sentido?],
 "claims":[true/false por cada afirmación clave: ¿la minuta la recoge sin cambiar el sentido?],
 "traps_as_commitment":[true si la minuta presenta esa trampa como compromiso/decisión confirmada, si no false],
 "bullets":[{{"text":"viñeta de la minuta","supported":true/false}}]}}
En "bullets" lista TODAS las viñetas de la minuta; supported=false si afirma algo no presente en la referencia o distorsiona su sentido."""


def score(ref: dict, v: dict) -> dict:
    def rate(xs):
        return round(sum(xs) / len(xs), 3) if xs else None
    b = [x["supported"] for x in v.get("bullets", [])]
    assert len(v["commitments"]) == len(ref["commitments"]), "longitud de commitments"
    assert len(v["claims"]) == len(ref["claims"]), "longitud de claims"
    assert len(v["traps_as_commitment"]) == len(ref["traps"]), "longitud de traps"
    return {
        "commitment_recall": rate(v["commitments"]),
        "claim_coverage": rate(v["claims"]),
        "false_commitments": sum(v["traps_as_commitment"]),
        "bullet_fidelity": rate(b),
        "bullets": len(b),
    }


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("prompt", "score"):
        sys.exit(__doc__)
    ref = json.load(open(sys.argv[2], encoding="utf8"))
    if sys.argv[1] == "prompt":
        print(prompt(ref, open(sys.argv[3], encoding="utf8").read()))
    else:
        print(json.dumps(score(ref, json.load(open(sys.argv[3], encoding="utf8"))), indent=1))
