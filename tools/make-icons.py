# -*- coding: utf-8 -*-
"""Генерация PNG-иконок приложения из тех же мотивов, что в icon.svg."""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ICONS = os.path.join(ROOT, 'icons')


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def make_icon(size, maskable=False):
    scale = 4
    big = size * scale
    image = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    top = (61, 145, 105)
    bottom = (35, 87, 63)
    radius = int(big * (0.30 if maskable else 0.22))
    for y in range(big):
        color = lerp(top, bottom, y / max(big - 1, 1))
        draw.line([(0, y), (big, y)], fill=color + (255,))
    # маска скругления
    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=255)
    image.putalpha(mask)

    inset = big * (0.20 if maskable else 0.14)
    cx = cy = big / 2
    plate = big * (0.30 if maskable else 0.34)
    draw.ellipse([cx - plate, cy - plate, cx + plate, cy + plate], outline=(242, 247, 243, 235), width=int(big * 0.05))
    draw.ellipse([cx - plate * 0.6, cy - plate * 0.6, cx + plate * 0.6, cy + plate * 0.6], outline=(242, 247, 243, 110), width=int(big * 0.026))

    # лист
    leaf = int(big * 0.30)
    draw.ellipse([cx + big * 0.02, cy - big * 0.33, cx + big * 0.02 + leaf, cy - big * 0.33 + leaf * 0.72], fill=(242, 247, 243, 240))
    draw.ellipse([cx - big * 0.30, cy + big * 0.10, cx - big * 0.30 + leaf * 0.8, cy + big * 0.10 + leaf * 0.52], fill=(242, 247, 243, 170))

    return image.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(ICONS, exist_ok=True)
    make_icon(192).save(os.path.join(ICONS, 'icon-192.png'))
    make_icon(512).save(os.path.join(ICONS, 'icon-512.png'))
    make_icon(512, maskable=True).save(os.path.join(ICONS, 'icon-maskable-512.png'))
    print('icons written to', ICONS)


if __name__ == '__main__':
    main()
