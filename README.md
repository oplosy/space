# Ecliptic Orrery

A real-time, true-to-scale 3D simulation of the Solar System — and beyond — running entirely in the browser.

Open `index.html` and fly from Earth's city lights to Saturn's rings, out past Voyager, through the Milky Way, to the edge of the observable universe. No build step, no server required.

> Live ephemeris · True scale · Physically-based eclipses, atmospheres and black-hole lensing

---

## Demo

**Run locally (zero setup):**

1. Download or clone this repo
2. Open `index.html` directly in a desktop browser (Chrome / Edge / Firefox recommended)
3. That's it. Three.js loads from jsDelivr CDN; everything else is inlined.

```bash
git clone https://github.com/oplosy/space.git
cd space
# then open index.html in your browser
```

For best performance use a desktop with WebGL2 and hardware acceleration enabled.

---

## Features

### Solar System — live ephemeris

- **Planets** positioned from JPL's approximate Keplerian elements (Standish), accurate to arc-minutes for 1800–2050
- **Moon** from the main terms of Meeus's lunar theory (ch. 47), precessed to J2000 — eclipses reproduce to within minutes
- **Clock runs on UTC**, ephemerides on TT (Terrestrial Time)
- **Earth** offset from the Earth–Moon barycentre, **Pluto** from the Pluto–Charon barycentre
- **Orientation**: poles and spin from IAU WGCCRE rotation models; synchronous moons tidally locked
- **True scale**: sizes and distances are 1:1 unless you enlarge bodies with the *Body size* slider

### Rendering

- Ray-marched **Rayleigh + Mie scattering** atmospheres (Earth, Venus, Mars, Titan)
- Per-pixel **eclipse shadows** with exact solar-disc overlap — including the red umbra of a lunar eclipse
- **Saturn**: ring shadows on the planet + planet shadow on the rings
- **Earth**: city lights on the night side, ocean specular glint, cloud shadows
- Animated **photosphere with sunspots and limb darkening**
- **28,000 catalogue stars** (HYG, to mag 7.6) coloured by B−V, constellation figures, Milky Way panorama in galactic coordinates

### Small bodies

GPU-propagated populations with real structure:

- Main belt with **Kirkwood gaps**
- Hildas, Jupiter **Trojans at L4/L5**, Kuiper belt
- **Halley's Comet** grows its ion/dust tails with heliocentric distance

### Beyond the Solar System

Zoom out far enough and the star sky gives way to deep space:

- **Milky Way** particle model — barred spiral, bar tilted 27° to the Sun–centre line, four logarithmic arms at 12° pitch, dust lanes + star-forming regions, Sun at 26,670 ly in the Orion Spur
- **Sagittarius A\*** (4.3M solar masses) ray-traced through Schwarzschild spacetime: lensing, 5.2 Rₛ shadow, photon ring, thin accretion disc with Doppler beaming + gravitational redshift
- **Local Group**: Magellanic Clouds, Andromeda, Triangulum at measured distances/orientations
- **Cosmic web** anchored by real clusters: Virgo, Fornax, Centaurus, Norma, Perseus, Hydra, Coma, Leo, Hercules, Shapley
- **CMB** in false colour at 46.5 billion ly
- **30 nearby/famous stars** (Proxima → Betelgeuse → VY Canis Majoris) at measured distances, radii, temperatures
- **Stellar black holes**: Gaia BH1 + Cygnus X-1 with companion, ray-traced like Sgr A*

### Spacecraft & mission planner

- Probes integrated with **adaptive RK4** under Sun + planets + Moon + Pluto
- **Lambert solver**, launch-window search, differential-correction aim refinement
- **Voyager 1 & 2**: heliocentric Lambert arcs between real launch/flyby dates (Jupiter, Saturn, Uranus, Neptune), pinned to measured 2025 positions, with live distance / signal delay / speed + 3D model. Heliopause shell at ~120 AU
- **TRAPPIST-1**: M8 dwarf + 7 planets with measured periods, radii, transit epochs (Agol et al. 2021), tidally locked, habitable-zone orbits in green

---

## Controls

| Input | Action |
|---|---|
| Drag | Orbit focused body |
| Scroll / pinch | Zoom (altitude-aware) |
| Click body / label | Fly to it |
| Space | Pause / resume |
| `,` / `.` | Slower (then reverse) / faster |
| N | Return to present |
| `0`–`9` | Sun, Mercury … Pluto |
| O / L / B / C | Orbits / labels / small bodies / constellations |
| H | Hide / show all panels |
| G / X / A / U | Milky Way / Sgr A* / Andromeda / observable universe |

In-app panels: **Bodies** list, per-body **dossier** (live + physical data), **Events** (ephemeris-computed jumps), **Mission planner**, display **Layers**.

---

## Project structure

```text
space/
├── index.html                  # Full standalone build — open in browser
├── build.py                    # Asset pipeline + bundler (src/ → index.html)
├── src/
│   ├── shell.html              # DOM / UI markup
│   ├── style.css               # Night-instrument UI theme
│   └── js/
│       ├── 01-core.js          # Constants, frames, Kepler solver, formatting
│       ├── 02-data.js          # Body catalogue (JPL elements, IAU poles)
│       ├── 03-ephem.js         # Ephemeris propagation
│       ├── 04-glsl.js          # Shaders (atmosphere, eclipses, rings, BH)
│       ├── 05-scene.js         # Three.js scene, bodies, labels
│       ├── 05b-deep.js         # Milky Way model
│       ├── 05c-cosmos.js       # Local Group → cosmic web → CMB
│       ├── 05d-stars.js        # Star catalogue, constellations
│       ├── 05e-extra.js        # Voyager, TRAPPIST-1, special objects
│       ├── 06-probe.js         # N-body integrator, Lambert, planner
│       ├── 07-ui.js            # Panels, transport, events, dossier
│       └── 08-main.js          # Boot, main loop, floating origin
├── assets/
│   ├── *.jpg                   # Processed textures (generated)
│   └── source/                 # Downloaded originals (cache, git-ignored)
└── dist/
    └── ecliptic-artifact.html  # Body fragment for embedding (generated)
```

Runtime source lives in `src/` (`shell.html` + `style.css` + `js/` concatenated in filename order). The build inlines textures, star data and sky data into a single file.

---

## Building

Requires Python 3 + Pillow:

```bash
pip install pillow
python build.py
```

What it does:

1. Downloads missing textures / star data into `assets/source/` (Solar System Scope, d3-celestial CDN)
2. Re-encodes textures to size-capped progressive JPEGs in `assets/`
3. Packs HYG stars (mag ≤ 7.6) + constellation lines/names into compact blobs
4. Inlines everything into:
   - `index.html` — full page
   - `dist/ecliptic-artifact.html` — embeddable body fragment

```bash
python build.py --clean   # re-process assets from cached sources
```

---

## Tech stack

- **three.js r160** (via jsDelivr import map) — WebGL rendering, post-processing (UnrealBloom)
- **Vanilla JS + GLSL** — no framework; CPU ephemeris in float64 with floating-origin re-basing
- **Python build** — Pillow texture pipeline, base64/star packing, single-file bundling

---

## Accuracy & limits

- Planet positions: JPL approximate elements — arc-minute level 1800–2050, degrading slowly outside
- Moon: main Meeus terms — good enough for minute-level eclipses
- Poles/spin: IAU WGCCRE models
- Non-Earth moons: mean circular orbits in planet equatorial plane (phases approximate)
- Small-body belts: statistical populations preserving real structure (gaps, resonances, L4/L5)
- TRAPPIST-1 surfaces: illustrative; orbits/epochs measured

---

## Credits

- Planet textures: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0), based on NASA mission data
- Star catalogue + constellation lines: [d3-celestial](https://github.com/ofrohn/d3-celestial) (HYG data)
- Rendering: [three.js](https://threejs.org)
- Orbital elements: JPL / Standish; lunar theory: Meeus; rotation: IAU WGCCRE; TRAPPIST-1: Agol et al. 2021

---

## License

Code in `src/` and `build.py`: MIT (unless noted otherwise).
Textures and star catalogues belong to their respective owners — see Credits. Check upstream licenses before commercial redistribution.
