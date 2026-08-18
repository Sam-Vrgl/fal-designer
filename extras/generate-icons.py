"""Regenerate the icon set from the master artwork.

Optional tooling, like generate-insignes-list.js — run it only when the source
artwork changes. Needs Pillow:  pip install Pillow

    python extras/generate-icons.py
"""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets', 'icons', 'icon-source.png')
ICONS = os.path.join(ROOT, 'assets', 'icons')


def load_square():
    """Trim transparent padding and pad back to a square, so the ring stays round."""
    img = Image.open(SOURCE).convert('RGBA')
    box = img.split()[3].getbbox()
    if box:
        img = img.crop(box)
    w, h = img.size
    side = max(w, h)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - w) // 2, (side - h) // 2))
    # The gold loses saturation as it shrinks; lift it so the star still reads.
    return ImageEnhance.Color(square).enhance(1.25)


def main():
    art = load_square()
    resize = lambda n: art.resize((n, n), Image.LANCZOS)

    # Tab icons keep transparency: tab strips are light in one theme, dark in the other.
    # RGBA quantisation requires FASTOCTREE; flat artwork is identical at 256 colours.
    resize(32).quantize(colors=256, method=Image.FASTOCTREE).save(
        os.path.join(ICONS, 'icon-32.png'), optimize=True)
    resize(32).save(os.path.join(ROOT, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32)])

    # iOS composites a home-screen icon onto black, so these get an opaque ground.
    # White, because the artwork is dark red and gold and needs the contrast.
    for size in (180, 192, 512):
        flat = Image.new('RGBA', (size, size), (255, 255, 255, 255))
        flat.alpha_composite(resize(size))
        flat.convert('RGB').quantize(colors=256, method=Image.MEDIANCUT).save(
            os.path.join(ICONS, 'icon-%d.png' % size), optimize=True)

    for name in ('favicon.ico', 'assets/icons/icon-32.png', 'assets/icons/icon-180.png',
                 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'):
        print('%-32s %6d bytes' % (name, os.path.getsize(os.path.join(ROOT, name))))


if __name__ == '__main__':
    main()
