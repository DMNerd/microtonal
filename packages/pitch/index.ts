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
 * - {number} [ups] = Ups (positive) or downs (negative), one EDO step each
 */
export interface Pitch {
  readonly step: number;
  readonly alt: number;
  readonly oct?: number; // undefined for pitch classes
  readonly dir?: Direction; // undefined for notes
  readonly ups?: number;
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
  // half a sharp off a quality: a mid interval
  if (!Number.isInteger(f)) {
    const p =
      o === undefined ? pitch([f + 3.5]) : pitch([f + 3.5, o - 2, dir!]);
    return { ...p, alt: p.alt - 0.5, dir };
  }
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
 * Test if a value is a valid EDO (a positive integer)
 * @example
 * isEdo(31) // => true
 * isEdo(2.5) // => false
 */
export function isEdo(edo: unknown): edo is number {
  return typeof edo === "number" && Number.isSafeInteger(edo) && edo > 0;
}

/**
 * Get the edo of an options object: undefined if not given, NaN if invalid
 * @example
 * edoOption({ edo: 24 }) // => 24
 * edoOption({ edo: 0 }) // => NaN
 */
export function edoOption(options: unknown): number | undefined {
  const edo =
    options && typeof options === "object"
      ? (options as { edo?: unknown }).edo
      : undefined;
  return edo === undefined ? undefined : isEdo(edo) ? edo : NaN;
}

/**
 * Get the best fifth of an EDO, in steps
 * @example
 * edoFifth(31) // => 18
 */
export function edoFifth(edo: number): number {
  if (!isEdo(edo)) return NaN;
  return Math.round(edo * Math.log2(3 / 2));
}

/**
 * Get the size of a sharp in an EDO, in steps
 * @example
 * edoSharp(24) // => 2
 */
export function edoSharp(edo: number): number {
  return edoProfile(edo).sharp;
}

const JUST_FIFTH_CENTS = 1200 * Math.log2(3 / 2);

export type EdoSpelling = "fifths" | "proportional-fallback";

export interface EdoProfileOverride {
  spelling?: "fifths" | "proportional";
  fifth?: number;
}

let globalSpelling: EdoSpelling = "fifths";
const overrides: Record<number, EdoProfileOverride> = {};
let profileCache: Record<string, EdoProfile> = {};

/**
 * Set how EDOs without an override are spelled
 * @example
 * setEdoSpelling("proportional-fallback")
 * edoProfile(28).spelling // => "proportional"
 */
export function setEdoSpelling(spelling: EdoSpelling): void {
  if (spelling !== "fifths" && spelling !== "proportional-fallback") return;
  globalSpelling = spelling;
  profileCache = {};
}

/**
 * Get the current EDO spelling (see `setEdoSpelling`)
 */
export function edoSpelling(): EdoSpelling {
  return globalSpelling;
}

/**
 * Override the spelling or the fifth of an EDO. Without options, remove it.
 * @example
 * setEdoProfile(57, { fifth: 34 })
 * setEdoProfile(57) // remove the override
 */
export function setEdoProfile(edo: number, override?: EdoProfileOverride) {
  if (!isEdo(edo)) return;
  const clean: EdoProfileOverride = {};
  if (override?.spelling === "fifths" || override?.spelling === "proportional")
    clean.spelling = override.spelling;
  const fifth = override?.fifth;
  if (Number.isInteger(fifth) && fifth! > 0 && fifth! < edo)
    clean.fifth = fifth;
  if (clean.spelling || clean.fifth) overrides[edo] = clean;
  else delete overrides[edo];
  profileCache = {};
}

/**
 * Get a cache key for an EDO that changes with its profile
 */
export function edoKey(edo: number): string {
  const o = overrides[edo];
  return o
    ? `${edo}/${o.spelling ?? globalSpelling}/${o.fifth ?? ""}`
    : `${edo}/${globalSpelling}`;
}

export interface EdoProfile {
  edo: number;
  fifth: number;
  sharp: number;
  fifthErrorCents: number;
  spelling: "fifths" | "proportional";
}

const MAX_FIFTH_ERROR_CENTS = 15;
// notated as subsets of 12 and 24-EDO
const SUBSET_EDOS = [6, 8];

/**
 * Get how pitches are sized in an EDO: by stacking fifths or proportionally
 * @example
 * edoProfile(22) // => { edo: 22, fifth: 13, sharp: 3, fifthErrorCents: 7.1, spelling: "fifths" }
 */
export function edoProfile(edo: number): EdoProfile {
  if (!isEdo(edo)) {
    return {
      edo,
      fifth: NaN,
      sharp: NaN,
      fifthErrorCents: NaN,
      spelling: "proportional",
    };
  }
  const key = edoKey(edo);
  if (profileCache[key]) return profileCache[key];
  const override = overrides[edo] ?? {};
  const best = edoFifth(edo);
  let fifth = override.fifth ?? best;
  // the minor second must not descend (13 and 18-EDO)
  if (
    override.fifth === undefined &&
    globalSpelling === "fifths" &&
    3 * edo - 5 * best < 0
  )
    fifth = best - 1;
  const sharp = 7 * fifth - 4 * edo;
  const fifthErrorCents =
    Math.round(((fifth * 1200) / edo - JUST_FIFTH_CENTS) * 10) / 10;
  const spelling =
    override.spelling ??
    (globalSpelling === "fifths"
      ? edo < 5 || SUBSET_EDOS.includes(edo)
        ? "proportional"
        : "fifths"
      : sharp >= 1 && Math.abs(fifthErrorCents) <= MAX_FIFTH_ERROR_CENTS
        ? "fifths"
        : "proportional");
  return (profileCache[key] = { edo, fifth, sharp, fifthErrorCents, spelling });
}

const roundSymmetric = (n: number) => Math.sign(n) * Math.round(Math.abs(n));

/**
 * Get the size of a pitch in steps of an EDO (C0 = 0 for notes)
 */
export function edoSteps(pitch: Pitch, edo = 12): number {
  if (!isEdo(edo)) return NaN;
  const [f, o = 0] = coordinates(pitch);
  const ups = (pitch.dir ?? 1) * (pitch.ups ?? 0);
  let steps: number;
  if (edoProfile(edo).spelling === "proportional") {
    const semitones = pitch.oct === undefined ? mod(f * 7, 12) : f * 7 + o * 12;
    steps = roundSymmetric((semitones * edo) / 12) + ups;
  } else {
    steps = f * edoProfile(edo).fifth + o * edo + ups;
  }
  // a mid between two steps: its first up or down reaches the nearest one
  if (!Number.isInteger(steps)) {
    if (!ups) return NaN;
    steps -= Math.sign(ups) / 2;
  }
  return pitch.oct === undefined ? mod(steps, edo) : steps;
}

/**
 * Get the pitch class of a pitch in an EDO (0 to edo - 1)
 */
export function edoChroma(pitch: Pitch, edo = 12): number {
  return mod(edoSteps(pitch, edo), edo);
}

/**
 * Test if a pitch lands on or past a neighbouring natural in an EDO
 * @example
 * edoCrossesNatural({ step: 6, alt: 1 }, 41) // => true (B# is above C)
 */
export function edoCrossesNatural(
  pitch: Pick<Pitch, "step" | "alt" | "ups">,
  edo: number,
): boolean {
  if (!isEdo(edo)) return false;
  const natural = (step: number) =>
    edoChroma({ step: mod(step, 7), alt: 0 }, edo);
  const own = natural(pitch.step);
  const diff = mod(edoChroma(pitch, edo) - own, edo);
  const offset = diff > edo / 2 ? diff - edo : diff;
  if (offset === 0) return false;
  return offset > 0
    ? offset >= mod(natural(pitch.step + 1) - own, edo)
    : -offset >= mod(own - natural(pitch.step - 1), edo);
}
