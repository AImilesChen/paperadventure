"""Regenerate raster brand assets from the Paper Adventure icon and hero image."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BLUE = "#d8f0fc"
NAVY = "#0d294f"
CORAL = "#ec4d35"
CREAM = "#fffaf1"


def icon(size: int) -> Image.Image:
    scale = max(4, 512 // size)
    canvas = Image.new("RGBA", (64 * scale, 64 * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    s = lambda points: [(int(x * scale), int(y * scale)) for x, y in points]
    d.rounded_rectangle((0, 0, 64 * scale - 1, 64 * scale - 1), radius=15 * scale, fill=BLUE)
    plane = s([(10, 30), (52, 12), (39, 53), (31, 39)])
    d.polygon(plane, fill=CORAL)
    d.line(plane + [plane[0]], fill=NAVY, width=max(1, int(2.2 * scale)), joint="curve")
    d.line(s([(31, 39), (52, 12), (22, 34)]), fill=CREAM, width=max(1, int(3.2 * scale)), joint="curve")
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


for size in (16, 32, 180, 512):
    name = "apple-touch-icon.png" if size == 180 else f"favicon-{size}.png" if size < 180 else "icon-512.png"
    icon(size).save(PUBLIC / name)

icon(256).save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

# A purpose-built social card, rather than reusing the square hero image.
card = Image.new("RGB", (1200, 630), CREAM)
d = ImageDraw.Draw(card)
d.rounded_rectangle((0, 0, 1200, 630), radius=0, fill=CREAM)
d.rectangle((0, 0, 1200, 14), fill=CORAL)
d.rounded_rectangle((667, 56, 1192, 622), radius=32, fill="#b8dce9")
hero = Image.open(PUBLIC / "assets" / "hero-workshop.png").convert("RGB")
hero = ImageOps.fit(hero, (500, 540), method=Image.Resampling.LANCZOS, centering=(0.53, 0.48))
mask = Image.new("L", hero.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 499, 539), radius=28, fill=255)
card.paste(hero, (683, 72), mask)
card.paste(icon(56), (55, 54), icon(56))

font_dir = Path(r"C:\Windows\Fonts")
bold = font_dir / "segoeuib.ttf"
regular = font_dir / "segoeui.ttf"
title_font = ImageFont.truetype(str(bold), 70)
label_font = ImageFont.truetype(str(bold), 28)
body_font = ImageFont.truetype(str(regular), 29)
d.text((128, 65), "PAPER ADVENTURE", font=label_font, fill=NAVY)
d.text((58, 183), "Stories to solve", font=title_font, fill=NAVY)
d.text((58, 270), "together.", font=title_font, fill=NAVY)
d.rounded_rectangle((58, 384, 570, 487), radius=20, fill=BLUE)
d.text((80, 398), "Printable adventures for", font=body_font, fill=NAVY)
d.text((80, 438), "home and classroom play", font=body_font, fill=NAVY)
d.text((58, 554), "paperadventure.app", font=label_font, fill=CORAL)
card.save(PUBLIC / "og-image.jpg", format="JPEG", quality=80, optimize=True, subsampling=0)

print("Created favicon, touch icon and 1200x630 social card in public/")
