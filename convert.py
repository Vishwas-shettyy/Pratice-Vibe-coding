from PIL import Image
import os

img = Image.open('src/assets/logo_transparent.png')
if img.mode in ('RGBA', 'LA'):
    r, g, b, a = img.split()
    # Invert the RGB channels to make white turn black
    r = r.point(lambda i: 255 - i)
    g = g.point(lambda i: 255 - i)
    b = b.point(lambda i: 255 - i)
    img = Image.merge('RGBA', (r, g, b, a))
else:
    import PIL.ImageOps
    img = PIL.ImageOps.invert(img)

img.save('src/assets/logo_black.png')
print("Conversion complete")
