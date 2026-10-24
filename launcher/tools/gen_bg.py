"""Genera el fondo cinematografico abstracto (960x540) para Inicio TV.

Es arte propio generado por codigo: degradado nocturno con luces suaves, un haz diagonal,
vineta y un velo oscuro en la zona de tarjetas. Se anade ruido fino para evitar bandas de color.
Uso: python3 tools/gen_bg.py  (desde launcher/)
"""
import numpy as np
from PIL import Image

W, H = 960, 540
rng = np.random.default_rng(7)

x = np.linspace(0, 1, W)[None, :].repeat(H, 0)
y = np.linspace(0, 1, H)[:, None].repeat(W, 1)

top = np.array([14, 20, 42], dtype=np.float64)
bottom = np.array([4, 5, 11], dtype=np.float64)
img = top[None, None, :] * (1 - y[..., None]) + bottom[None, None, :] * y[..., None]


def glow(cx, cy, rx, ry, color, k):
    g = np.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))
    return g[..., None] * np.array(color, dtype=np.float64) * k


img += glow(0.84, 0.10, 0.45, 0.60, (30, 140, 175), 0.55)    # luz turquesa arriba a la derecha
img += glow(0.12, 0.88, 0.55, 0.45, (100, 62, 175), 0.50)    # luz violeta abajo a la izquierda
img += glow(0.55, 0.45, 0.28, 0.22, (195, 112, 62), 0.12)    # calidez tenue al centro

# Haz diagonal muy suave
ax, ay, bx, by = 0.20, 1.05, 0.95, -0.05
dx, dy = bx - ax, by - ay
dist = np.abs(dx * (ay - y) - (ax - x) * dy) / np.hypot(dx, dy)
img += (np.exp(-(dist / 0.07) ** 2) * 0.10)[..., None] * np.array((120, 150, 205))

# Vineta
r2 = ((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.5
img *= (1 - 0.55 * np.clip(r2, 0, 1))[..., None]

# Velo oscuro progresivo hacia la zona de tarjetas (parte baja), para legibilidad
scrim = np.clip((y - 0.30) / 0.70, 0, 1)
img *= (1 - 0.38 * scrim)[..., None]

img += rng.normal(0, 1.6, img.shape)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(
    "app/src/main/res/drawable-nodpi/bg_cinema.jpg", quality=90, optimize=True
)
print("ok")
