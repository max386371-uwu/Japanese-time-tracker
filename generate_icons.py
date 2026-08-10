"""Generate the Japanese Tracker icon: a plain 時 glyph on a rounded-square
gradient background (no ring, no tick mark). Colors come from the Navy
(default) theme — this is the static fallback baked into the extension
package; at runtime the toolbar icon is re-rendered to match whatever
theme the user has selected (see background.js / shared/iconRender.js)."""
from PIL import Image, ImageDraw, ImageFont

# Navy (default) theme colors
ACCENT = (110, 193, 228)    # #6EC1E4
ACCENT2 = (143, 214, 189)   # #8FD6BD
GLYPH = (245, 247, 250)     # #F5F7FA (theme text color)
FONT_PATH = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"

SIZES = [16, 32, 48, 128]

def make_icon(size):
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # rounded square background, diagonal gradient accent -> accent2
    radius = int(s * 0.24)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)

    grad = Image.new("RGB", (s, s))
    gdraw = ImageDraw.Draw(grad)
    for y in range(s):
        for_row_t = y / s
        # diagonal-ish gradient: blend more of accent2 as we move down+right
        pass
    # build gradient via diagonal interpolation (fast row-based approximation)
    row = Image.new("RGB", (1, s))
    rdraw = ImageDraw.Draw(row)
    for y in range(s):
        t = y / s
        r = int(ACCENT[0] + (ACCENT2[0] - ACCENT[0]) * t)
        g = int(ACCENT[1] + (ACCENT2[1] - ACCENT[1]) * t)
        b = int(ACCENT[2] + (ACCENT2[2] - ACCENT[2]) * t)
        rdraw.point((0, y), fill=(r, g, b))
    grad = row.resize((s, s))
    img.paste(grad, (0, 0), mask)

    # glyph, solid theme-text color, centered
    font = ImageFont.truetype(FONT_PATH, int(s * 0.62), index=0)
    glyph = "\u6642"  # 時
    bbox = draw.textbbox((0, 0), glyph, font=font)
    gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    gx = (s - gw) / 2 - bbox[0]
    gy = (s - gh) / 2 - bbox[1]
    draw.text((gx, gy), glyph, font=font, fill=GLYPH + (255,))

    img = img.resize((size, size), Image.LANCZOS)
    return img

for size in SIZES:
    icon = make_icon(size)
    icon.save(f"/home/claude/japanese-tracker/icons/icon{size}.png")
    print(f"saved icon{size}.png")
