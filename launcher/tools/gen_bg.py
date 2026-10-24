"""Genera el fondo de Inicio TV: cintas de lineas de luz sobre un cielo nocturno.

Arte propio generado por codigo. Cada linea es una curva fina; las cintas se abren y se cruzan
como seda, con un color que cambia de turquesa a violeta y un resplandor suave. Se dibuja al doble
de resolucion para suavizar los bordes y se reduce al final. Se anade ruido fino contra las bandas.
Uso (desde launcher/): python3 tools/gen_bg.py [salida.jpg]
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1280, 720          # tamano final
S = 2                      # sobremuestreo
OUT = sys.argv[1] if len(sys.argv) > 1 else "app/src/main/res/drawable-nodpi/bg_cinema.jpg"
rng = np.random.default_rng(11)


def lerp(a, b, t):
    return a + (b - a) * t


def palette(t):
    """turquesa -> azul -> violeta -> magenta suave"""
    stops = [
        (0.00, (35, 190, 205)),
        (0.35, (50, 120, 225)),
        (0.70, (130, 80, 220)),
        (1.00, (205, 90, 190)),
    ]
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0)
            return tuple(lerp(np.array(c0, float), np.array(c1, float), u))
    return stops[-1][1]


# --- cielo nocturno -----------------------------------------------------------
y = np.linspace(0, 1, H)[:, None].repeat(W, 1)
x = np.linspace(0, 1, W)[None, :].repeat(H, 0)
top = np.array([10, 15, 34], float)
bot = np.array([3, 4, 9], float)
base = top * (1 - y[..., None]) + bot * y[..., None]
halo = np.exp(-(((x - 0.62) / 0.55) ** 2 + ((y - 0.42) / 0.30) ** 2))
base += halo[..., None] * np.array([18, 38, 70], float)

# --- cintas de lineas ---------------------------------------------------------
BW, BH = W * S, H * S
acc = np.zeros((BH, BW, 3), float)
xs = np.linspace(0, 1, BW)


def center(u):
    return 0.30 + 0.09 * np.sin(2 * np.pi * (0.75 * u) + 0.9) + 0.045 * np.sin(2 * np.pi * (1.9 * u) + 2.1)


def spread(u):
    return 0.05 + 0.34 * (0.5 + 0.5 * np.sin(2 * np.pi * (0.55 * u) + 2.3))


def ribbon(n, offset, tilt, bright, hue_shift, width):
    global acc
    for i in range(n):
        t = i / (n - 1)
        wob = 0.012 * np.sin(2 * np.pi * (2.6 * xs + 1.7 * t + offset))
        yy = (center(xs + 0.04 * offset) + tilt + (t - 0.5) * spread(xs) + wob) * BH
        mask = Image.new("L", (BW, BH), 0)
        d = ImageDraw.Draw(mask)
        d.line(list(zip(np.arange(BW), yy)), fill=255, width=width, joint="curve")
        a = np.asarray(mask, float) / 255.0
        # los extremos se desvanecen, y el centro de la cinta brilla mas
        edge = np.exp(-((t - 0.5) / 0.38) ** 2)
        col = np.array(palette(min(1.0, max(0.0, t * 0.8 + hue_shift))), float)
        acc += a[..., None] * col * (bright * (0.35 + 0.65 * edge))


ribbon(90, 0.0, 0.00, 0.52, 0.10, 2)
ribbon(60, 1.3, 0.07, 0.34, 0.00, 2)
ribbon(40, 2.1, -0.06, 0.26, 0.20, 2)

ribbons = Image.fromarray(np.clip(acc, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
rib = np.asarray(ribbons, float)
glow = np.asarray(ribbons.filter(ImageFilter.GaussianBlur(9)), float)
glow2 = np.asarray(ribbons.filter(ImageFilter.GaussianBlur(26)), float)

img = base + rib * 0.75 + glow * 0.85 + glow2 * 1.0

# --- polvo de luz: puntos diminutos, muy tenues -------------------------------
dust = Image.new("L", (W, H), 0)
dd = ImageDraw.Draw(dust)
for _ in range(110):
    px, py = rng.uniform(0, W), rng.uniform(0, H * 0.75)
    r = rng.uniform(0.6, 1.5)
    dd.ellipse([px - r, py - r, px + r, py + r], fill=int(rng.uniform(60, 150)))
dust = np.asarray(dust.filter(ImageFilter.GaussianBlur(0.7)), float) / 255.0
img += dust[..., None] * np.array([150, 190, 230], float) * 0.7

# --- vineta y velo para legibilidad de las tarjetas ---------------------------
r2 = ((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.5
img *= (1 - 0.50 * np.clip(r2, 0, 1))[..., None]
scrim = np.clip((y - 0.38) / 0.62, 0, 1)
img *= (1 - 0.50 * scrim)[..., None]

img += rng.normal(0, 1.4, img.shape)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, quality=88, optimize=True)
print("ok", OUT)
