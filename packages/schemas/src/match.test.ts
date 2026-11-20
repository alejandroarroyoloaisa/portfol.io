import { describe, expect, it } from 'vitest';
import { computeMatch, jaccard, proximity, requirements, MatchCall } from './match';
import { canTransition, nextStatuses, isFinal, isInProgress } from './status';
import { formatOf } from './catalog';
import { registerSchema, createApplicationSchema, createArtworkSchema, countWords } from './schemas';

const call: MatchCall = {
  techniques: ['acrilico', 'oleo'], themes: ['figuracion', 'interior'], scope: 'regional',
  country: 'ES', maxFormatCm: 150, minYear: 2024, maxArtworks: 3,
};
const artist = {
  techniques: ['acrilico', 'collage'], themes: ['interior', 'figuracion'], country: 'ES',
  artworks: [{ widthCm: 100, heightCm: 81, year: 2025 }],
};

describe('jaccard', () => {
  it('vale 1 si la convocatoria no restringe', () => expect(jaccard(['oleo'], [])).toBe(1));
  it('calcula intersección entre unión', () => expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3));
  it('vale 0 sin coincidencias', () => expect(jaccard(['a'], ['b'])).toBe(0));
});

describe('proximity', () => {
  it('internacional siempre 1', () => expect(proximity(5000, { ...call, scope: 'internacional' })).toBe(1));
  it('nacional en el mismo país vale 1', () => expect(proximity(900, { ...call, scope: 'nacional' }, 'ES')).toBe(1));
  it('regional decrece con la distancia', () => expect(proximity(200, call)).toBeCloseTo(0.5));
  it('no baja de 0', () => expect(proximity(900, call)).toBe(0));
  it('sin ubicación es neutro', () => expect(proximity(null, call)).toBe(0.5));
  it('local usa 100 km', () => expect(proximity(50, { ...call, scope: 'local' })).toBeCloseTo(0.5));
});

describe('requirements', () => {
  it('cumple todo', () => expect(requirements(artist, call)).toBe(1));
  it('obra demasiado grande y antigua', () =>
    expect(requirements({ ...artist, artworks: [{ widthCm: 200, heightCm: 100, year: 2010 }] }, call)).toBe(0));
  it('sin requisitos basta con tener obra', () =>
    expect(requirements(artist, { ...call, maxFormatCm: null, minYear: null })).toBe(1));
});

describe('computeMatch', () => {
  it('aplica las ponderaciones de la ecuación', () => {
    const r = computeMatch(artist, call, 120); // Granada–Málaga ≈ 120 km
    const expected = Math.round(100 * (0.4 * (1 / 3) + 0.25 * 1 + 0.2 * (1 - 120 / 400) + 0.15 * 1));
    expect(r.score).toBe(expected);
    expect(r.parts.tema).toBe(1);
  });
  it('marca encaje a partir de 75', () => {
    const r = computeMatch({ ...artist, techniques: ['acrilico', 'oleo'] }, call, 10);
    expect(r.matches).toBe(true);
    expect(r.reason).toContain('acrílico');
  });
  it('convocatoria abierta a todo puntúa alto', () => {
    const r = computeMatch(artist, { ...call, techniques: [], themes: [], scope: 'internacional' });
    expect(r.score).toBe(100);
  });
});

describe('estados de solicitud', () => {
  it('la artista envía y retira', () => {
    expect(canTransition('borrador', 'enviada', 'artista')).toBe(true);
    expect(canTransition('enviada', 'retirada', 'artista')).toBe(true);
    expect(canTransition('enviada', 'aceptada', 'artista')).toBe(false);
  });
  it('la organización revisa y resuelve', () => {
    expect(nextStatuses('en_revision', 'organizacion').sort()).toEqual(['no_seleccionada', 'preseleccionada']);
    expect(canTransition('preseleccionada', 'aceptada', 'organizacion')).toBe(true);
    expect(canTransition('aceptada', 'retirada', 'artista')).toBe(false);
  });
  it('estados finales y en curso', () => {
    expect(isFinal('aceptada')).toBe(true);
    expect(isInProgress('en_revision')).toBe(true);
    expect(isInProgress('borrador')).toBe(false);
  });
});

describe('formatos y validaciones', () => {
  it('clasifica formatos', () => {
    expect(formatOf(30, 40)).toBe('pequeno');
    expect(formatOf(100, 81)).toBe('mediano');
    expect(formatOf(150, 200)).toBe('grande');
  });
  it('valida el registro', () => {
    expect(registerSchema.safeParse({ name: 'Nora', email: 'NORA@x.es', password: 'corta' }).success).toBe(false);
    const ok = registerSchema.parse({ name: 'Nora Vidal', email: 'NORA@x.es', password: 'segura123' });
    expect(ok.email).toBe('nora@x.es');
  });
  it('limita la carta a 300 palabras', () => {
    expect(countWords('uno  dos\ntres')).toBe(3);
    const long = Array(301).fill('palabra').join(' ');
    expect(createApplicationSchema.safeParse({ artworkIds: [], letter: long }).success).toBe(false);
  });
  it('valida medidas positivas y año', () => {
    const base = { title: 'Limonero', technique: 'acrilico', widthCm: 60, heightCm: 73, year: 2025, status: 'exposicion' };
    expect(createArtworkSchema.safeParse(base).success).toBe(true);
    expect(createArtworkSchema.safeParse({ ...base, widthCm: 0 }).success).toBe(false);
    expect(createArtworkSchema.safeParse({ ...base, year: 1800 }).success).toBe(false);
  });
});
