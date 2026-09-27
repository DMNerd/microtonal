export interface NamedPitch {
  readonly name: string;
}

/*** @deprecated use NamedPitch */
export interface Named {
  readonly name: string;
}

export interface NotFound extends NamedPitch {
  readonly empty: true;
  readonly name: "";
}

export function isNamedPitch(src: unknown): src is NamedPitch {
  return src !== null &&
    typeof src === "object" &&
    "name" in src &&
    typeof src.name === "string"
    ? true
    : false;
}

type Fifths = number;
type Octaves = number;
export type Direction = 1 | -1;

export type PitchClassCoordinates = [Fifths];
export type NoteCoordinates = [Fifths, Octaves];
export type IntervalCoordinates = [Fifths, Octaves, Direction];
export type PitchCoordinates =
  PitchClassCoordinates | NoteCoordinates | IntervalCoordinates;

/**
 * Pitch properties
 *
 * - {number} step - The step number: 0 = C, 1 = D, ... 6 = B
 * - {number} alt - Number of alterations: -2 = 'bb', -1 = 'b', 0 = '', 1 = '#', ...
 * - {number} [oct] = The octave (undefined when is a coord class)
 * - {number} [dir] = Interval direction (undefined when is not an interval)
 * - {number} [ups] = Ups (positive) or downs (negative): each one raises or
 *   lowers the pitch by a single step of the equal division in use
 *   (ups and downs notation). Undefined means 0.
 */
export interface Pitch {
  readonly step: number;
  readonly alt: number;
  readonly oct?: number; // undefined for pitch classes
  readonly dir?: Direction; // undefined for notes
  readonly ups?: number; // undefined means no ups or downs
}

const SIZES = [0, 2, 4, 5, 7, 9, 11];
export const chroma = ({ step, alt, ups = 0 }: Pitch) =>
  (((SIZES[step] + alt + ups) % 12) + 12) % 12;

export const height = ({ step, alt, oct, dir = 1, ups = 0 }: Pitch) =>
  dir * (SIZES[step] + alt + ups + 12 * (oct === undefined ? -100 : oct));

export const midi = (pitch: Pitch) => {
  const h = height(pitch);
  return pitch.oct !== undefined && h >= -12 && h <= 115 ? h + 12 : null;
};

export function isPitch(pitch: unknown): pitch is Pitch {
  return pitch !== null &&
    typeof pitch === "object" &&
    "step" in pitch &&
    typeof pitch.step === "number" &&
    "alt" in pitch &&
    typeof pitch.alt === "number" &&
    !isNaN(pitch.step) &&
    !isNaN(pitch.alt)
    ? true
    : false;
}

// The number of fifths of [C, D, E, F, G, A, B]
const FIFTHS = [0, 2, 4, -1, 1, 3, 5];
// The number of octaves it span each step
const STEPS_TO_OCTS = FIFTHS.map((fifths: number) =>
  Math.floor((fifths * 7) / 12),
);

/**
 * Get coordinates from pitch object
 */
export function coordinates(pitch: Pitch): PitchCoordinates {
  const { step, alt, oct, dir = 1 } = pitch;
  const f = FIFTHS[step] + 7 * alt;
  if (oct === undefined) {
    return [dir * f];
  }
  const o = oct - STEPS_TO_OCTS[step] - 4 * alt;
  return [dir * f, dir * o];
}

// We need to get the steps from fifths
// Fifths for CDEFGAB are [ 0, 2, 4, -1, 1, 3, 5 ]
// We add 1 to fifths to avoid negative numbers, so:
// for ["F", "C", "G", "D", "A", "E", "B"] we have:
const FIFTHS_TO_STEPS = [3, 0, 4, 1, 5, 2, 6];

/**
 * Get pitch from coordinate objects
 */
export function pitch(coord: PitchCoordinates): Pitch {
  const [f, o, dir] = coord;
  const step = FIFTHS_TO_STEPS[unaltered(f)];
  const alt = Math.floor((f + 1) / 7);
  if (o === undefined) {
    return { step, alt, dir };
  }
  const oct = o + 4 * alt + STEPS_TO_OCTS[step];
  return { step, alt, oct, dir };
}

// Return the number of fifths as if it were unaltered
function unaltered(f: number): number {
  const i = (f + 1) % 7;
  return i < 0 ? 7 + i : i;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Size of the fifth, in steps, of an equal division of the octave (EDO).
 * It uses the closest approximation to a just 3/2 (the "patent" fifth), so
 * 12 => 7, 19 => 11, 24 => 14, 31 => 18
 */
export function edoFifth(edo: number): number {
  return Math.round(edo * Math.log2(3 / 2));
}

/**
 * Size, in steps, of a sharp (the chromatic semitone: seven fifths up, four
 * octaves down) in an EDO. 12 => 1, 19 => 1, 24 => 2, 31 => 2
 */
export function edoSharp(edo: number): number {
  return 7 * edoFifth(edo) - 4 * edo;
}

/**
 * Signed size of a pitch, in steps of the given EDO. For notes with octave
 * it is the absolute height (C0 = 0), for pitch classes it's the distance
 * above C, and for intervals the (directed) size.
 *
 * In 12-EDO this equals `height` for notes and `semitones` for intervals.
 */
export function edoSteps(pitch: Pitch, edo = 12): number {
  const [f, o = 0] = coordinates(pitch);
  const ups = (pitch.dir ?? 1) * (pitch.ups ?? 0);
  const steps = f * edoFifth(edo) + o * edo + ups;
  // pitch classes have no octave: reduce to 0..edo-1 above C
  return pitch.oct === undefined ? mod(steps, edo) : steps;
}

/**
 * Pitch class of a pitch in an EDO: a number between 0 and edo - 1
 */
export function edoChroma(pitch: Pitch, edo = 12): number {
  return mod(edoSteps(pitch, edo), edo);
}
