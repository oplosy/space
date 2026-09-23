/* ------------------------------------------------------------------ *
 *  Catalogue
 *  Planet elements: JPL "Keplerian Elements for Approximate Positions
 *  of the Major Planets" (Standish), table 1, J2000 ecliptic:
 *  a [AU], e, I, L, ϖ, Ω [deg] and their rates per Julian century.
 * ------------------------------------------------------------------ */
const JPL = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
  mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
  pluto:   [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
};

const MU_MOON = 1 / 82.30057;             // Moon / (Earth + Moon)
const CHARON_FRAC = 0.1218 / 1.1218;       // Charon / (Pluto + Charon)
const GM_SUN = 132712440018;

const BODIES = [];
const BY_ID = {};
function def(o) {
  o.children = [];
  BODIES.push(o); BY_ID[o.id] = o;
  if (o.parent) BY_ID[o.parent].children.push(o);
  return o;
}

def({
  id: 'sun', name: 'Sun', kind: 'star', radius: 695700, GM: GM_SUN, color: '#FFC96B', eph: 'sun',
  pole: [286.13, 0, 63.87, 0], W: [84.176, 14.1844],
  surface: { type: 'sun' },
  subtitle: 'G2V main-sequence star',
  blurb: 'A 4.6-billion-year-old ball of hydrogen fusing 600 million tonnes of it into helium every second. It holds 99.86% of the Solar System’s mass.',
  facts: [['Radius', '695,700 km'], ['Mass', '1.989 × 10³⁰ kg'], ['Surface gravity', '274 m/s²'], ['Photosphere', '5,772 K'], ['Rotation', '25.4 d (equator)'], ['Luminosity', '3.83 × 10²⁶ W']],
});

def({
  id: 'mercury', name: 'Mercury', kind: 'planet', parent: 'sun', radius: 2439.7, GM: 22031.8, color: '#B5AEA4', eph: 'jpl',
  pole: [281.0103, -0.0328, 61.4155, -0.0049], W: [329.5988, 6.1385108],
  surface: { type: 'tex', map: 'mercury', bump: 5.0, model: 'regolith', tint: [1.0, 0.96, 0.92] },
  subtitle: 'Terrestrial planet',
  blurb: 'The smallest planet spins exactly three times for every two orbits. With no air to hold heat, its surface swings from −173 °C at night to 427 °C by day.',
  facts: [['Radius', '2,439.7 km'], ['Mass', '3.301 × 10²³ kg'], ['Gravity', '3.70 m/s²'], ['Escape velocity', '4.25 km/s'], ['Sidereal day', '58.65 d'], ['Year', '87.97 d'], ['Axial tilt', '0.03°'], ['Moons', '0']],
});

def({
  id: 'venus', name: 'Venus', kind: 'planet', parent: 'sun', radius: 6051.8, GM: 324858.6, color: '#E9D3A6', eph: 'jpl',
  pole: [272.76, 0, 67.16, 0], W: [160.20, -1.4813688],
  surface: { type: 'tex', map: 'venus', bump: 0, model: 'cloud', tint: [1.0, 0.97, 0.9] },
  atmosphere: { top: 0.028, hR: 0.0026, hM: 0.0017, betaR: [0.0040, 0.0036, 0.0024], betaM: 0.0035, g: 0.7, intensity: 16 },
  subtitle: 'Terrestrial planet',
  blurb: 'Sulphuric-acid clouds hide a surface hot enough to melt lead under 92 bar of CO₂. Venus rotates backwards, and its day is longer than its year.',
  facts: [['Radius', '6,051.8 km'], ['Mass', '4.868 × 10²⁴ kg'], ['Gravity', '8.87 m/s²'], ['Escape velocity', '10.36 km/s'], ['Sidereal day', '−243.0 d'], ['Year', '224.70 d'], ['Axial tilt', '177.4°'], ['Surface', '464 °C · 92 bar']],
});

def({
  id: 'earth', name: 'Earth', kind: 'planet', parent: 'sun', radius: 6371.0, GM: 398600.44, color: '#6EA6FF', eph: 'jpl',
  pole: [0, -0.641, 90, -0.557], W: [190.147, 360.9856235],
  surface: { type: 'earth' },
  atmosphere: { top: 0.0126, hR: 8 / 6371, hM: 1.2 / 6371, betaR: [5.8e-3, 13.5e-3, 33.1e-3], betaM: 21e-3, g: 0.76, intensity: 13 },
  subtitle: 'Terrestrial planet · home',
  blurb: 'The only world known to host life. Liquid water covers 71% of its surface and a nitrogen-oxygen atmosphere scatters blue sunlight across the sky.',
  facts: [['Radius', '6,371.0 km'], ['Mass', '5.972 × 10²⁴ kg'], ['Gravity', '9.81 m/s²'], ['Escape velocity', '11.19 km/s'], ['Sidereal day', '23 h 56 m 4 s'], ['Year', '365.256 d'], ['Axial tilt', '23.44°'], ['Mean surface', '15 °C']],
});

def({
  id: 'moon', name: 'Moon', kind: 'moon', parent: 'earth', radius: 1737.4, GM: 4902.8, color: '#C9C6C0', eph: 'moon',
  pole: [269.9949, 0.0031, 66.5392, 0.0130], W: [38.3213, 13.17635815], periodDays: 27.321661,
  surface: { type: 'tex', map: 'moon', bump: 6.0, model: 'regolith', tint: [1.0, 0.98, 0.95] },
  subtitle: 'Natural satellite of Earth',
  blurb: 'Tidally locked, so the same hemisphere always faces Earth. Its orbit slowly widens by 3.8 cm a year as it steals angular momentum from Earth’s spin.',
  facts: [['Radius', '1,737.4 km'], ['Mass', '7.342 × 10²² kg'], ['Gravity', '1.62 m/s²'], ['Escape velocity', '2.38 km/s'], ['Orbital period', '27.32 d'], ['Mean distance', '384,400 km']],
});

def({
  id: 'mars', name: 'Mars', kind: 'planet', parent: 'sun', radius: 3389.5, GM: 42828.37, color: '#E57C4E', eph: 'jpl',
  pole: [317.68143, -0.1061, 52.88650, -0.0609], W: [176.630, 350.89198226],
  surface: { type: 'tex', map: 'mars', bump: 3.0, model: 'lambert', tint: [1.0, 0.97, 0.94] },
  atmosphere: { top: 0.012, hR: 11.1 / 3389.5, hM: 11.1 / 3389.5, betaR: [0.0019, 0.0011, 0.00075], betaM: 0.0012, g: 0.72, intensity: 22 },
  subtitle: 'Terrestrial planet',
  blurb: 'A cold desert with the tallest volcano in the Solar System, Olympus Mons, and a canyon system as long as the United States is wide. Its red colour is iron oxide dust.',
  facts: [['Radius', '3,389.5 km'], ['Mass', '6.417 × 10²³ kg'], ['Gravity', '3.72 m/s²'], ['Escape velocity', '5.03 km/s'], ['Sidereal day', '24 h 37 m'], ['Year', '686.98 d'], ['Axial tilt', '25.19°'], ['Mean surface', '−63 °C']],
});

def({
  id: 'jupiter', name: 'Jupiter', kind: 'planet', parent: 'sun', radius: 69911, eqR: 71492, flat: 0.06487, GM: 126686534, color: '#DDB892', eph: 'jpl',
  pole: [268.056595, -0.006499, 64.495303, 0.002413], W: [284.95, 870.5360000],
  surface: { type: 'gas', map: 'jupiter', rim: [0.55, 0.6, 0.75] },
  subtitle: 'Gas giant',
  blurb: 'More than twice as massive as all other planets combined. The Great Red Spot is a storm larger than Earth that has raged for at least 190 years.',
  facts: [['Radius (eq.)', '71,492 km'], ['Mass', '1.898 × 10²⁷ kg'], ['Gravity', '24.79 m/s²'], ['Escape velocity', '59.5 km/s'], ['Day', '9 h 55 m 30 s'], ['Year', '11.86 yr'], ['Axial tilt', '3.13°'], ['Known moons', '95']],
});

def({
  id: 'saturn', name: 'Saturn', kind: 'planet', parent: 'sun', radius: 58232, eqR: 60268, flat: 0.09796, GM: 37931187, color: '#E8D39C', eph: 'jpl',
  pole: [40.589, -0.036, 83.537, -0.004], W: [38.90, 810.7939024],
  surface: { type: 'gas', map: 'saturn', rim: [0.7, 0.66, 0.55] },
  ring: { inner: 70560, outer: 140460 },
  subtitle: 'Gas giant',
  blurb: 'Less dense than water. Its rings span 280,000 km yet are mostly only about ten metres thick: countless ice fragments from dust grains to boulders.',
  facts: [['Radius (eq.)', '60,268 km'], ['Mass', '5.683 × 10²⁶ kg'], ['Gravity', '10.44 m/s²'], ['Escape velocity', '35.5 km/s'], ['Day', '10 h 33 m'], ['Year', '29.46 yr'], ['Axial tilt', '26.73°'], ['Known moons', '146']],
});

def({
  id: 'uranus', name: 'Uranus', kind: 'planet', parent: 'sun', radius: 25362, eqR: 25559, flat: 0.02293, GM: 5793939, color: '#A7E4E6', eph: 'jpl',
  pole: [257.311, 0, -15.175, 0], W: [203.81, -501.1600928],
  surface: { type: 'gas', map: 'uranus', rim: [0.55, 0.8, 0.85], bands: 0.05 },
  subtitle: 'Ice giant',
  blurb: 'Knocked on its side, probably by an ancient collision, Uranus rolls around the Sun with each pole facing it for 42 years at a time. Methane gives it its cyan tint.',
  facts: [['Radius (eq.)', '25,559 km'], ['Mass', '8.681 × 10²⁵ kg'], ['Gravity', '8.69 m/s²'], ['Escape velocity', '21.3 km/s'], ['Day', '−17 h 14 m'], ['Year', '84.0 yr'], ['Axial tilt', '97.77°'], ['Known moons', '28']],
});

def({
  id: 'neptune', name: 'Neptune', kind: 'planet', parent: 'sun', radius: 24622, eqR: 24764, flat: 0.01708, GM: 6836529, color: '#5E7FFF', eph: 'jpl',
  pole: [299.36, 0, 43.46, 0], W: [249.978, 541.1397757],
  surface: { type: 'gas', map: 'neptune', rim: [0.45, 0.6, 1.0], bands: 0.08 },
  subtitle: 'Ice giant',
  blurb: 'Found by mathematics before it was seen: Le Verrier predicted its position from Uranus’s wobble in 1846. Its winds reach 2,100 km/h, the fastest measured on any planet.',
  facts: [['Radius (eq.)', '24,764 km'], ['Mass', '1.024 × 10²⁶ kg'], ['Gravity', '11.15 m/s²'], ['Escape velocity', '23.5 km/s'], ['Day', '16 h 6 m'], ['Year', '164.8 yr'], ['Axial tilt', '28.32°'], ['Known moons', '16']],
});

def({
  id: 'pluto', name: 'Pluto', kind: 'dwarf', parent: 'sun', radius: 1188.3, GM: 869.6, color: '#D2B494', eph: 'jpl',
  pole: [132.993, 0, -6.163, 0], W: [302.695, -56.3625225],
  surface: { type: 'proc', style: 5, a: [0.78, 0.63, 0.50], b: [0.95, 0.92, 0.88], crater: 0.25, relief: 0.004 },
  subtitle: 'Dwarf planet · Kuiper belt',
  blurb: 'New Horizons found nitrogen glaciers, water-ice mountains and a heart-shaped plain, Sputnik Planitia. Pluto and Charon are tidally locked to each other.',
  facts: [['Radius', '1,188.3 km'], ['Mass', '1.303 × 10²² kg'], ['Gravity', '0.62 m/s²'], ['Escape velocity', '1.21 km/s'], ['Day', '−6.387 d'], ['Year', '247.9 yr'], ['Axial tilt', '122.5°'], ['Known moons', '5']],
});

/* Comet 1P/Halley — osculating elements for the 1986 apparition */
def({
  id: 'halley', name: 'Halley’s Comet', short: 'Halley', kind: 'comet', parent: 'sun', radius: 5.5, GM: 1.5e-5, color: '#9FD8FF', eph: 'comet',
  comet: { q: 0.586 * AU, e: 0.96714, i: 162.26, node: 58.42, peri: 111.33, tp: 2446470.96 },
  pole: [0, 0, 90, 0], W: [0, 360 / 2.2],
  surface: { type: 'proc', style: 7, a: [0.16, 0.15, 0.14], b: [0.28, 0.27, 0.26], crater: 0.1, irregular: [7.6, 4.0, 3.9], relief: 0.08 },
  subtitle: 'Periodic comet 1P',
  blurb: 'A 15-kilometre nucleus of ice and dust on a 76-year retrograde orbit. Near the Sun its ices boil off into a coma and tails millions of kilometres long.',
  facts: [['Nucleus', '15 × 8 × 8 km'], ['Period', '≈ 75.3 yr'], ['Perihelion', '0.586 AU'], ['Aphelion', '35.1 AU'], ['Inclination', '162.3°'], ['Last perihelion', '9 Feb 1986']],
});

/* Moons: a [km], P [d], i/node [deg] relative to the parent's equator (IAU pole), L0 [deg] at J2000 */
const MOONS = [
  // parent, id, name, R, a, P, i, node, L0, surface
  ['mars', 'phobos', 'Phobos', 11.27, 9376, 0.31891023, 1.08, 0, null, { style: 0, a: [0.30, 0.27, 0.25], b: [0.40, 0.37, 0.34], crater: 1.0, irregular: [13.0, 11.4, 9.1], relief: 0.05 }, 'The larger Martian moon is spiralling inwards and will break into a ring or crash into Mars within about 50 million years.'],
  ['mars', 'deimos', 'Deimos', 6.2, 23463, 1.26244, 1.79, 0, null, { style: 0, a: [0.34, 0.31, 0.28], b: [0.44, 0.41, 0.37], crater: 0.5, irregular: [7.5, 6.1, 5.2], relief: 0.04 }, 'A smooth, dusty 15-km moon; its craters are softened by a thick layer of regolith.'],
  ['jupiter', 'io', 'Io', 1821.6, 421700, 1.769137786, 0.05, 0, 106.07719, { style: 1, a: [0.88, 0.80, 0.42], b: [0.95, 0.93, 0.78], crater: 0, relief: 0.002 }, 'The most volcanic body known. Tidal flexing by Jupiter powers over 400 active volcanoes that resurface it with sulphur.'],
  ['jupiter', 'europa', 'Europa', 1560.8, 671034, 3.551181, 0.47, 0, 175.73161, { style: 2, a: [0.84, 0.78, 0.68], b: [0.55, 0.36, 0.25], crater: 0.05, relief: 0.001 }, 'An ice shell over a global salt-water ocean holding more water than all of Earth’s oceans. Criss-crossed by reddish fractures.'],
  ['jupiter', 'ganymede', 'Ganymede', 2634.1, 1070412, 7.15455296, 0.20, 0, 120.55883, { style: 3, a: [0.36, 0.33, 0.30], b: [0.66, 0.63, 0.58], crater: 0.6, relief: 0.003 }, 'The largest moon in the Solar System, bigger than Mercury, and the only moon with its own magnetic field.'],
  ['jupiter', 'callisto', 'Callisto', 2410.3, 1882709, 16.6890184, 0.19, 0, 84.44459, { style: 4, a: [0.22, 0.20, 0.18], b: [0.62, 0.60, 0.56], crater: 1.3, relief: 0.003 }, 'The most heavily cratered surface known: 4 billion years of impacts on a geologically dead crust.'],
  ['saturn', 'mimas', 'Mimas', 198.2, 185539, 0.942421959, 1.57, 0, null, { style: 6, a: [0.62, 0.62, 0.62], b: [0.78, 0.78, 0.77], crater: 1.4, relief: 0.02 }, 'Its giant crater Herschel, a third of its own width across, gives it a resemblance to the Death Star.'],
  ['saturn', 'enceladus', 'Enceladus', 252.1, 237948, 1.370218, 0.01, 0, null, { style: 8, a: [0.93, 0.95, 0.97], b: [0.80, 0.86, 0.93], crater: 0.35, relief: 0.01 }, 'The most reflective body in the Solar System. Geysers at its south pole vent a subsurface ocean into space.'],
  ['saturn', 'tethys', 'Tethys', 531.1, 294619, 1.887802, 1.12, 0, null, { style: 0, a: [0.80, 0.80, 0.79], b: [0.90, 0.90, 0.90], crater: 1.0, relief: 0.01 }, 'Almost pure water ice, scarred by Ithaca Chasma, a canyon running three-quarters of the way around it.'],
  ['saturn', 'dione', 'Dione', 561.4, 377396, 2.736915, 0.02, 0, null, { style: 0, a: [0.64, 0.64, 0.64], b: [0.85, 0.85, 0.86], crater: 0.9, relief: 0.01 }, 'Bright ice cliffs hundreds of metres high streak across its trailing hemisphere.'],
  ['saturn', 'rhea', 'Rhea', 763.8, 527108, 4.518212, 0.35, 0, null, { style: 0, a: [0.66, 0.65, 0.64], b: [0.86, 0.86, 0.86], crater: 1.2, relief: 0.01 }, 'Saturn’s second-largest moon, an ancient icy snowball saturated with craters.'],
  ['saturn', 'titan', 'Titan', 2574.7, 1221870, 15.945, 0.35, 0, null, { style: 9, a: [0.80, 0.55, 0.25], b: [0.62, 0.42, 0.20], crater: 0, relief: 0 }, 'The only moon with a thick atmosphere, 1.5 bar of nitrogen, hiding lakes and seas of liquid methane and ethane.', { top: 0.23, hR: 40 / 2575, hM: 40 / 2575, betaR: [0.0013, 0.0008, 0.00036], betaM: 0.00065, g: 0.75, intensity: 16 }],
  ['saturn', 'iapetus', 'Iapetus', 734.5, 3560820, 79.3215, 15.47, 0, null, { style: 10, a: [0.08, 0.06, 0.05], b: [0.78, 0.76, 0.72], crater: 0.9, relief: 0.02 }, 'Two-faced: its leading side is coal-dark, its trailing side bright as snow, and an equatorial ridge 20 km tall girdles it.'],
  ['uranus', 'miranda', 'Miranda', 235.8, 129390, 1.413479, 184.2, 0, null, { style: 11, a: [0.58, 0.58, 0.60], b: [0.74, 0.74, 0.76], crater: 0.6, relief: 0.03 }, 'A patchwork of chevrons and 20-km cliffs, as if it had been shattered and reassembled.'],
  ['uranus', 'ariel', 'Ariel', 578.9, 191020, 2.520379, 180.3, 0, null, { style: 0, a: [0.58, 0.58, 0.59], b: [0.72, 0.72, 0.73], crater: 0.7, relief: 0.01 }, 'The brightest and perhaps youngest surface among Uranus’s major moons, cut by long rift valleys.'],
  ['uranus', 'umbriel', 'Umbriel', 584.7, 266300, 4.144177, 180.4, 0, null, { style: 0, a: [0.26, 0.26, 0.27], b: [0.40, 0.40, 0.42], crater: 1.2, relief: 0.01 }, 'The darkest of Uranus’s large moons, except for a mysterious bright ring called Wunda.'],
  ['uranus', 'titania', 'Titania', 788.4, 435910, 8.705872, 180.1, 0, null, { style: 0, a: [0.42, 0.40, 0.39], b: [0.60, 0.58, 0.56], crater: 1.0, relief: 0.01 }, 'Uranus’s largest moon, with canyons longer than the Grand Canyon.'],
  ['uranus', 'oberon', 'Oberon', 761.4, 583520, 13.463239, 180.1, 0, null, { style: 0, a: [0.38, 0.35, 0.34], b: [0.55, 0.52, 0.50], crater: 1.3, relief: 0.01 }, 'An old, heavily cratered moon whose crater floors hold dark material.'],
  ['neptune', 'triton', 'Triton', 1353.4, 354759, 5.876854, 156.885, 0, null, { style: 12, a: [0.80, 0.72, 0.68], b: [0.64, 0.66, 0.60], crater: 0.1, relief: 0.004 }, 'Orbits backwards, so it is probably a captured Kuiper-belt object. Nitrogen geysers streak its pink south polar cap.'],
  ['pluto', 'charon', 'Charon', 606, 19591, 6.3872304, 180.0, 0, 0, { style: 13, a: [0.52, 0.51, 0.50], b: [0.36, 0.22, 0.17], crater: 0.5, relief: 0.004 }, 'Half Pluto’s size. The pair orbit a point in empty space between them, and each always shows the other the same face.'],
];

for (const m of MOONS) {
  const [parent, id, name, R, a, P, i, node, L0, surf, blurb, atm] = m;
  const par = BY_ID[parent];
  def({
    id, name, kind: 'moon', parent, radius: surf.irregular ? Math.cbrt(surf.irregular[0] * surf.irregular[1] * surf.irregular[2]) : R,
    GM: 0, color: '#BFC4CC', eph: 'circ', tidal: true,
    orbit: { a, P, i, node, L0: L0 ?? hashStr(id) * 360 },
    periodDays: P,
    surface: Object.assign({ type: 'proc' }, surf),
    atmosphere: atm,
    subtitle: `Moon of ${par.name}`,
    blurb,
    facts: [['Radius', surf.irregular ? `${surf.irregular.join(' × ')} km (semi-axes)` : nf(R, 1) + ' km'], ['Orbital radius', nf(a, 0) + ' km'], ['Orbital period', P < 2 ? nf(P * 24, 2) + ' h' : nf(P, 3) + ' d'], ['Rotation', 'synchronous'], ['Inclination', `${nf(i > 90 ? 180 - i : i, 2)}° to ${par.name}’s equator${i > 90 ? ' (retrograde)' : ''}`]],
  });
}
BY_ID.charon.tidal = true;

const PLANET_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
for (const id of PLANET_IDS) {
  const b = BY_ID[id], el = JPL[id];
  b.aKm = el[0] * AU;
  b.periodDays = 36525 * 360 / el[7];
  b.soi = b.aKm * Math.pow(b.GM / GM_SUN, 0.4);
}
BY_ID.moon.soi = 384400 * Math.pow(4902.8 / 398600.44, 0.4);
BY_ID.halley.periodDays = 365.25 * Math.pow(BY_ID.halley.comet.q / (1 - BY_ID.halley.comet.e) / AU, 1.5);
for (const b of BODIES) b.eqRadius = b.eqR || b.radius;

/* Events worth jumping to. Times are UTC. */
const EVENTS = [
  { title: 'Total solar eclipse', note: 'North America · 2024-04-08 18:17', jd: jdFromMs(Date.UTC(2024, 3, 8, 18, 17)), focus: 'earth', from: 'sun', dist: 3.2 },
  { title: 'Total lunar eclipse', note: 'Blood Moon · 2025-09-07 18:12', jd: jdFromMs(Date.UTC(2025, 8, 7, 18, 12)), focus: 'moon', from: 'earth', dist: 4.5 },
  { title: 'Total lunar eclipse', note: '2026-03-03 11:34', jd: jdFromMs(Date.UTC(2026, 2, 3, 11, 34)), focus: 'moon', from: 'earth', dist: 4.5 },
  { title: 'Total solar eclipse', note: 'Greenland · Iceland · Spain · 2026-08-12 17:46', jd: jdFromMs(Date.UTC(2026, 7, 12, 17, 46)), focus: 'earth', from: 'sun', dist: 3.2 },
  { title: 'Total solar eclipse', note: 'North Africa · 2027-08-02 10:07', jd: jdFromMs(Date.UTC(2027, 7, 2, 10, 7)), focus: 'earth', from: 'sun', dist: 3.2 },
  { title: 'Saturn’s rings edge-on', note: 'Ring-plane crossing seen from Earth · 2025-03-23', jd: jdFromMs(Date.UTC(2025, 2, 23, 12, 0)), focus: 'saturn', from: 'earth', dist: 5.5 },
  { title: 'Mars at its closest', note: '55.76 million km from Earth · 2003-08-27', jd: jdFromMs(Date.UTC(2003, 7, 27, 9, 51)), focus: 'mars', from: 'earth', dist: 4 },
  { title: 'Halley at perihelion', note: '1986-02-09', jd: 2446470.96 - TT_MINUS_UTC, focus: 'halley', from: 'side', dist: 6e6, absolute: true },
  { title: 'Halley returns', note: 'Next perihelion, mid-2061 (two-body model)', jd: 2446470.96 - TT_MINUS_UTC + BY_ID.halley.periodDays, focus: 'halley', from: 'side', dist: 6e6, absolute: true },
];
