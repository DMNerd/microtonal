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
 * Whether a value is a usable equal division of the octave: a positive whole
 * number. Functions given anything else return their empty result (NaN, an
 * empty list, an empty name or set) instead of guessing.
 *
 * @example
 * isEdo(31) // => true
 * isEdo(0) // => false
 * isEdo(2.5) // => false
 */
export function isEdo(edo: unknown): edo is number {
  return typeof edo === "number" && Number.isSafeInteger(edo) && edo > 0;
}

/**
 * The edo of an `{ edo }` options object: undefined when none is given, NaN
 * when it is given but is not an EDO (see `isEdo`). Only a real object counts:
 * functions are often `map` callbacks, which pass the array index next.
 *
 * @example
 * edoOption({ edo: 24 }) // => 24
 * edoOption({}) // => undefined
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
 * Size of the fifth, in steps, of an equal division of the octave (EDO).
 * It uses the closest approximation to a just 3/2 (the "patent" fifth), so
 * 12 => 7, 19 => 11, 24 => 14, 31 => 18. The fifth notes are spelled with can
 * differ (see `edoProfile`).
 */
export function edoFifth(edo: number): number {
  if (!isEdo(edo)) return NaN;
  return Math.round(edo * Math.log2(3 / 2));
}

/**
 * Size, in steps, of a sharp (the chromatic semitone: seven fifths up, four
 * octaves down) in an EDO, using the fifth of its profile (`edoProfile`).
 * 12 => 1, 19 => 1, 24 => 2, 31 => 2, 28 => 0, 16 => -1
 */
export function edoSharp(edo: number): number {
  return edoProfile(edo).sharp;
}

const JUST_FIFTH_CENTS = 1200 * Math.log2(3 / 2);

/**
 * How EDOs without an override are spelled (see `setEdoSpelling`):
 * - "fifths" (default): by stacking fifths, as the Xenharmonic Wiki notates
 *   them. Only EDOs below 5, 6-EDO and 8-EDO (written as subsets of 12- and
 *   24-EDO) are proportional.
 * - "proportional-fallback": by fifths only when a sharp is at least one step
 *   and the fifth is within 15 cents of 3/2; other EDOs are proportional, so
 *   that, say, a major and a minor triad stay apart in 28-EDO.
 */
export type EdoSpelling = "fifths" | "proportional-fallback";

/** Per-EDO choices that win over the global spelling (see `setEdoProfile`) */
export interface EdoProfileOverride {
  spelling?: "fifths" | "proportional";
  /** the fifth to spell by, in steps */
  fifth?: number;
}

let globalSpelling: EdoSpelling = "fifths";
const overrides: Record<number, EdoProfileOverride> = {};
let profileCache: Record<string, EdoProfile> = {};

/**
 * Set how EDOs are spelled (see `EdoSpelling`), for every function that
 * takes an EDO. EDOs with an override (`setEdoProfile`) keep it.
 *
 * @example
 * setEdoSpelling("proportional-fallback")
 * edoProfile(28).spelling // => "proportional"
 */
export function setEdoSpelling(spelling: EdoSpelling): void {
  if (spelling !== "fifths" && spelling !== "proportional-fallback") return;
  globalSpelling = spelling;
  profileCache = {};
}

/** The current global spelling (see `setEdoSpelling`) */
export function edoSpelling(): EdoSpelling {
  return globalSpelling;
}

/**
 * Override how one EDO is spelled, whatever the global spelling: by fifths
 * or proportionally, and with which fifth. Call it without options to remove
 * the override. A fifth that isn't a whole number of steps between 0 and the
 * EDO is ignored.
 *
 * @example
 * setEdoProfile(28, { spelling: "proportional" })
 * setEdoProfile(57, { fifth: 34 }) // 57-EDO by its sharp fifth (34\57)
 * setEdoProfile(28) // back to the global spelling
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
 * A key for caching anything computed for an EDO: it changes when the EDO's
 * profile can change (global spelling or override).
 */
export function edoKey(edo: number): string {
  const o = overrides[edo];
  return o
    ? `${edo}/${o.spelling ?? globalSpelling}/${o.fifth ?? ""}`
    : `${edo}/${globalSpelling}`;
}

/**
 * How pitches are sized in an EDO:
 * - fifth: steps of the fifth notes are spelled by: the best fifth
 *   (`edoFifth`), except where it makes the minor second descend (13- and
 *   18-EDO), which use the next narrower one, as the Xenharmonic Wiki does
 * - sharp: steps of a sharp (`edoSharp`): seven of those fifths less four
 *   octaves. It can be 0 (7, 14, 21, 28, 35-EDO: sharps don't move the pitch)
 *   or negative (9, 11, 16, 23-EDO: a sharp lowers it)
 * - fifthErrorCents: how far that fifth is from a just 3/2
 * - spelling: "fifths" when notes and intervals are sized by stacking that
 *   fifth, "proportional" when the 12-TET size is scaled to the EDO (ups and
 *   downs are still one step). Which EDOs are proportional depends on the
 *   global spelling (`setEdoSpelling`) and overrides (`setEdoProfile`).
 *
 * @example
 * edoProfile(22) // => { edo: 22, fifth: 13, sharp: 3, fifthErrorCents: 7.1, spelling: "fifths" }
 * edoProfile(13).fifth // => 7 (the best fifth, 8, makes the minor 2nd descend)
 * edoProfile(6).spelling // => "proportional"
 */
export interface EdoProfile {
  edo: number;
  fifth: number;
  sharp: number;
  fifthErrorCents: number;
  spelling: "fifths" | "proportional";
}

const MAX_FIFTH_ERROR_CENTS = 15;
// Written as subsets of 12- and 24-EDO on the Xenharmonic Wiki
const SUBSET_EDOS = [6, 8];

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
  // a minor second (3 octaves less 5 fifths) must not descend; the
  // proportional fallback keeps the best fifth, as before it existed
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

// Round half away from zero, so descending sizes mirror ascending ones
const roundSymmetric = (n: number) => Math.sign(n) * Math.round(Math.abs(n));

/**
 * Signed size of a pitch, in steps of the given EDO. For notes with octave
 * it is the absolute height (C0 = 0), for pitch classes it's the distance
 * above C, and for intervals the (directed) size.
 *
 * In 12-EDO this equals `height` for notes and `semitones` for intervals.
 * In "proportional" EDOs (see `edoProfile`) the 12-TET size is scaled to the
 * EDO instead of stacking fifths.
 */
export function edoSteps(pitch: Pitch, edo = 12): number {
  if (!isEdo(edo)) return NaN;
  const [f, o = 0] = coordinates(pitch);
  const ups = (pitch.dir ?? 1) * (pitch.ups ?? 0);
  let steps: number;
  if (edoProfile(edo).spelling === "proportional") {
    // pitch classes are reduced to one octave before scaling, so each one
    // rounds like its own interval above C
    const semitones = pitch.oct === undefined ? mod(f * 7, 12) : f * 7 + o * 12;
    steps = roundSymmetric((semitones * edo) / 12) + ups;
  } else {
    steps = f * edoProfile(edo).fifth + o * edo + ups;
  }
  // pitch classes have no octave: reduce to 0..edo-1 above C
  return pitch.oct === undefined ? mod(steps, edo) : steps;
}

/**
 * Pitch class of a pitch in an EDO: a number between 0 and edo - 1
 */
export function edoChroma(pitch: Pitch, edo = 12): number {
  return mod(edoSteps(pitch, edo), edo);
}

/**
 * Whether a spelling lands on or past a neighbouring natural: "B#" one step
 * above C in 41-EDO, "Fb" one step below E in 53-EDO, "E#" on F in 12-EDO.
 * Such spellings read as the wrong letter, so EDO spellings avoid them. For
 * intervals the naturals are the degrees of the major scale.
 *
 * @example
 * edoCrossesNatural({ step: 6, alt: 1 }, 41) // => true (B# is above C)
 * edoCrossesNatural({ step: 2, alt: 1 }, 19) // => false (E# is below F)
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
