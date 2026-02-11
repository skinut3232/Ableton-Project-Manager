// Easter egg: random song name generator for when you can't think of a title

const adjectives = [
  'Velvet', 'Broken', 'Frozen', 'Liquid', 'Hollow', 'Silent', 'Neon',
  'Faded', 'Golden', 'Distant', 'Electric', 'Analog', 'Digital', 'Phantom',
  'Crimson', 'Woven', 'Fractured', 'Drifting', 'Sunken', 'Astral',
  'Amber', 'Buried', 'Chrome', 'Deep', 'Endless', 'Glass', 'Hidden',
  'Inner', 'Last', 'Molten', 'Northern', 'Pale', 'Quiet', 'Silver',
  'Stereo', 'Thermal', 'Ultra', 'Vivid', 'Warm', 'Zero',
  'Lucid', 'Spectral', 'Nocturnal', 'Weightless', 'Synthetic',
];

const nouns = [
  'Thunder', 'Satellite', 'Signal', 'Archive', 'Cascade', 'Meridian',
  'Prism', 'Eclipse', 'Horizon', 'Voltage', 'Frequency', 'Resonance',
  'Orbit', 'Circuit', 'Pulse', 'Haze', 'Mirage', 'Bloom',
  'Current', 'Phosphor', 'Lattice', 'Monolith', 'Rapture', 'Siren',
  'Cipher', 'Glacier', 'Helix', 'Ivory', 'Jade', 'Labyrinth',
  'Nebula', 'Oasis', 'Pendulum', 'Quartz', 'Relic', 'Solstice',
  'Tempest', 'Umbra', 'Vertex', 'Wavelength', 'Zenith', 'Aurora',
  'Cosmos', 'Dusk', 'Ember', 'Flux', 'Grove', 'Hymn',
];

const verbsIng = [
  'Chasing', 'Burning', 'Falling', 'Crossing', 'Drowning', 'Breaking',
  'Floating', 'Waking', 'Losing', 'Finding', 'Tracing', 'Bending',
  'Folding', 'Drifting', 'Fading', 'Glowing', 'Hunting', 'Leaving',
  'Melting', 'Reaching', 'Sinking', 'Turning', 'Watching', 'Yielding',
];

const singleWords = [
  'Dissolve', 'Undertow', 'Parallax', 'Afterglow', 'Reverie', 'Elsewhere',
  'Fugue', 'Liminal', 'Peripheral', 'Threshold', 'Automata', 'Catharsis',
  'Daybreak', 'Entropy', 'Freefall', 'Gossamer', 'Interlude', 'Kinetic',
  'Lustre', 'Monochrome', 'Nocturne', 'Overture', 'Polaris', 'Refraction',
  'Simulacra', 'Transient', 'Undercurrent', 'Vestiges', 'Wanderlust',
  'Zeroth', 'Aether', 'Chrysalis',
];

const romanNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type PatternFn = () => string;

const patterns: PatternFn[] = [
  // Adjective + Noun — "Velvet Thunder"
  () => `${pick(adjectives)} ${pick(nouns)}`,

  // The + Adjective + Noun — "The Last Signal"
  () => `The ${pick(adjectives)} ${pick(nouns)}`,

  // Noun + of + Noun — "Echoes of Static"
  () => `${pick(nouns)} of ${pick(nouns)}`,

  // Verb-ing + Noun — "Chasing Phosphenes"
  () => `${pick(verbsIng)} ${pick(nouns)}`,

  // Single evocative word — "Dissolve"
  () => pick(singleWords),

  // Noun + Roman numeral — "Phase IV"
  () => `${pick(nouns)} ${pick(romanNumerals)}`,

  // Noun + Number — "Signal 9"
  () => `${pick(nouns)} ${Math.floor(Math.random() * 12) + 1}`,
];

export function generateSongName(): string {
  return pick(patterns)();
}
