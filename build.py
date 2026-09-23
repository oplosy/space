"""Build Ecliptic Orrery into a single self-contained HTML file.

    python build.py            # fetch (if needed) + process assets, then bundle
    python build.py --clean    # re-process assets from the cached sources

Outputs
    index.html                  full document, open directly in a browser
    dist/ecliptic-artifact.html body fragment used for the hosted artifact
"""
import base64
import io
import json
import os
import struct
import sys
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
ASSETS = os.path.join(ROOT, "assets")
CACHE = os.path.join(ASSETS, "source")

SSS = "https://www.solarsystemscope.com/textures/download/"
CEL = "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/"
SOURCES = {
    "2k_earth_daymap.jpg": SSS, "2k_earth_nightmap.jpg": SSS, "2k_earth_clouds.jpg": SSS,
    "2k_earth_specular_map.tif": SSS, "2k_moon.jpg": SSS, "2k_mars.jpg": SSS,
    "2k_mercury.jpg": SSS, "2k_venus_atmosphere.jpg": SSS, "2k_jupiter.jpg": SSS,
    "2k_saturn.jpg": SSS, "2k_saturn_ring_alpha.png": SSS, "2k_uranus.jpg": SSS,
    "2k_neptune.jpg": SSS, "8k_stars_milky_way.jpg": SSS,
    "stars.8.json": CEL, "constellations.lines.json": CEL, "constellations.json": CEL,
    "starnames.json": CEL,
}

# name -> (source, size, mode, quality)
TEXTURES = {
    "earthDay": ("2k_earth_daymap.jpg", (2048, 1024), "RGB", 88),
    "earthNight": ("2k_earth_nightmap.jpg", (2048, 1024), "RGB", 86),
    "earthClouds": ("2k_earth_clouds.jpg", (2048, 1024), "L", 84),
    "earthSpec": ("2k_earth_specular_map.tif", (1024, 512), "L", 80),
    "moon": ("2k_moon.jpg", (2048, 1024), "L", 86),
    "mars": ("2k_mars.jpg", (2048, 1024), "RGB", 84),
    "mercury": ("2k_mercury.jpg", (2048, 1024), "L", 84),
    "venus": ("2k_venus_atmosphere.jpg", (1024, 512), "RGB", 86),
    "jupiter": ("2k_jupiter.jpg", (2048, 1024), "RGB", 88),
    "saturn": ("2k_saturn.jpg", (2048, 1024), "RGB", 88),
    "uranus": ("2k_uranus.jpg", (1024, 512), "RGB", 88),
    "neptune": ("2k_neptune.jpg", (1024, 512), "RGB", 88),
    "milkyWay": ("8k_stars_milky_way.jpg", (4096, 2048), "RGB", 82),
}


def fetch():
    os.makedirs(CACHE, exist_ok=True)
    for name, base in SOURCES.items():
        path = os.path.join(CACHE, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        print("  fetch", name)
        req = urllib.request.Request(base + name, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r, open(path, "wb") as f:
            f.write(r.read())


def process_textures(clean):
    out = {}
    for key, (src, size, mode, q) in TEXTURES.items():
        dst = os.path.join(ASSETS, key + ".jpg")
        if clean or not os.path.exists(dst):
            im = Image.open(os.path.join(CACHE, src)).convert(mode)
            if im.size != size:
                im = im.resize(size, Image.LANCZOS)
            im.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
        with open(dst, "rb") as f:
            out[key] = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
    with open(os.path.join(CACHE, "2k_saturn_ring_alpha.png"), "rb") as f:
        out["saturnRing"] = "data:image/png;base64," + base64.b64encode(f.read()).decode()
    return out


def pack_stars(max_mag=7.6):
    with open(os.path.join(CACHE, "stars.8.json"), encoding="utf-8") as f:
        feats = json.load(f)["features"]
    buf = io.BytesIO()
    n = 0
    for ft in feats:
        mag = ft["properties"]["mag"]
        if mag is None or mag > max_mag:
            continue
        ra, dec = ft["geometry"]["coordinates"]
        try:
            bv = float(ft["properties"].get("bv") or 0.6)
        except ValueError:
            bv = 0.6
        ra = (ra + 360.0) % 360.0
        buf.write(struct.pack("<HhBB",
                              int(round(ra / 360.0 * 65535)) % 65536,
                              int(round(max(-90, min(90, dec)) / 90.0 * 32767)),
                              int(round(max(0, min(255, (mag + 2.0) * 20)))),
                              int(round(max(0, min(255, (bv + 0.4) * 100))))))
        n += 1
    print(f"  stars: {n} (mag <= {max_mag})")
    return base64.b64encode(buf.getvalue()).decode()


def sky_data():
    with open(os.path.join(CACHE, "constellations.lines.json"), encoding="utf-8") as f:
        lines = json.load(f)["features"]
    segs = []
    for ft in lines:
        for line in ft["geometry"]["coordinates"]:
            for a, b in zip(line, line[1:]):
                segs += [round(a[0], 2), round(a[1], 2), round(b[0], 2), round(b[1], 2)]
    with open(os.path.join(CACHE, "constellations.json"), encoding="utf-8") as f:
        cons = json.load(f)["features"]
    names = [[c["properties"]["name"], round(c["geometry"]["coordinates"][0], 2),
              round(c["geometry"]["coordinates"][1], 2), int(c["properties"].get("rank", 3))]
             for c in cons]
    with open(os.path.join(CACHE, "starnames.json"), encoding="utf-8") as f:
        sn = json.load(f)
    with open(os.path.join(CACHE, "stars.8.json"), encoding="utf-8") as f:
        feats = json.load(f)["features"]
    bright = []
    for ft in feats:
        mag = ft["properties"]["mag"]
        if mag is None or mag > 1.9:
            continue
        info = sn.get(str(ft["id"]))
        if not info or not info.get("name"):
            continue
        ra, dec = ft["geometry"]["coordinates"]
        bright.append([info["name"], round(ra, 3), round(dec, 3), mag])
    return {"lines": segs, "names": names, "bright": bright}


def bundle(assets, stars, sky):
    with open(os.path.join(SRC, "shell.html"), encoding="utf-8") as f:
        shell = f.read()
    with open(os.path.join(SRC, "style.css"), encoding="utf-8") as f:
        css = f.read()
    js_dir = os.path.join(SRC, "js")
    js = "\n".join(open(os.path.join(js_dir, n), encoding="utf-8").read()
                   for n in sorted(os.listdir(js_dir)) if n.endswith(".js"))
    data = ("const ASSETS = " + json.dumps(assets) + ";\n"
            "const STAR_DATA = " + json.dumps(stars) + ";\n"
            "const SKY_DATA = " + json.dumps(sky, separators=(",", ":")) + ";\n")
    # imports must stay first inside the module
    head_end = js.index("// @@DATA@@")
    module = js[:head_end] + data + js[head_end:]
    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&'
             'family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">')
    importmap = ('<script type="importmap">{"imports":{'
                 '"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",'
                 '"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>')
    title = "<title>Ecliptic Orrery</title>"
    body = f"{shell}\n{importmap}\n<script type=\"module\">\n{module}\n</script>\n"
    fragment = f"{title}\n{fonts}\n<style>\n{css}\n</style>\n{body}"
    full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f"{title}\n{fonts}\n<style>\n{css}\n</style>\n</head>\n<body>\n{body}</body>\n</html>\n")
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(full)
    with open(os.path.join(ROOT, "dist", "ecliptic-artifact.html"), "w", encoding="utf-8") as f:
        f.write(fragment)
    print(f"  index.html: {len(full) / 1e6:.2f} MB")


if __name__ == "__main__":
    clean = "--clean" in sys.argv
    print("assets")
    fetch()
    assets = process_textures(clean)
    stars = pack_stars()
    sky = sky_data()
    print("bundle")
    bundle(assets, stars, sky)
