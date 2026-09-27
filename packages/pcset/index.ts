import { compact, range, rotate } from "@tonaljs/collection";
import { NotFound, edoChroma } from "@tonaljs/pitch";
import { transpose } from "@tonaljs/pitch-distance";
import { Interval, IntervalName, interval } from "@tonaljs/pitch-interval";
import { Note, NoteName, note } from "@tonaljs/pitch-note";

/**
 * The properties of a pitch class set
 * @param {number} num - a number between 1 and 4095 (both included) that
 * uniquely identifies the set. It's the decimal number of the chroma.
 * @param {string} chroma - a string representation of the set: a 12-char string
 * with either "1" or "0" as characters, representing a pitch class or not
 * for the given position in the octave. For example, a "1" at index 0 means 'C',
 * a "1" at index 2 means 'D', and so on...
 * @param {string} normalized - the chroma but shifted to the first 1
 * @param {number} length - the number of notes of the pitch class set
 * @param {IntervalName[]} intervals - the intervals of the pitch class set
 * *starting from C*
 * @param {number} edo - the number of equal divisions of the octave of the
 * set, which is the length of the chroma (12 for traditional sets)
 *
 * Sets of other equal divisions of the octave (EDOs) have a chroma of that
 * length: a 24-char chroma is a set of quarter tones. For those, `setNum` is
 * only exact up to 53-EDO; use the chroma to identify larger sets.
 */
export interface Pcset {
  readonly name: string;
  readonly empty: boolean;
  readonly setNum: number;
  readonly chroma: PcsetChroma;
  readonly normalized: PcsetChroma;
  readonly intervals: IntervalName[];
  readonly edo: number;
}

export const EmptyPcset: Pcset = {
  empty: true,
  name: "",
  setNum: 0,
  chroma: "000000000000",
  normalized: "000000000000",
  intervals: [],
  edo: 12,
};

/**
 * Options to build a pitch class set from a note, interval or set number:
 * - edo: the number of equal divisions of the octave (12 by default)
 */
export interface PcsetOptions {
  edo: number;
}

export type PcsetChroma = string;
export type PcsetNum = number;

// UTILITIES
const setNumToChroma = (num: number, edo = 12): string =>
  Number(num).toString(2).padStart(edo, "0");
const chromaToNumber = (chroma: string): number => parseInt(chroma, 2);
const REGEX = /^[01]+$/;
const emptyChroma = (edo: number) => "0".repeat(edo);

// Options may come from untrusted places, like the index when `get` is used
// as a `map` callback: only a positive integer edo is accepted
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edoOf = (options: any): number => {
  const edo = options && typeof options === "object" ? options.edo : undefined;
  return Number.isInteger(edo) && edo > 0 ? edo : 12;
};

/**
 * Test if a value is a chroma: a string of "0" and "1" of length `edo`
 * (12 by default)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isChroma(set: any, edo = 12): set is PcsetChroma {
  return typeof set === "string" && set.length === edo && REGEX.test(set);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPcsetNum = (set: any, edo = 12): set is PcsetNum =>
  typeof set === "number" && set >= 0 && set <= 2 ** edo - 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPcset = (set: any): set is Pcset =>
  set &&
  typeof set.chroma === "string" &&
  isChroma(set.chroma, set.chroma.length);

const cache: { [key in string]: Pcset } = { [EmptyPcset.chroma]: EmptyPcset };

/**
 * A definition of a pitch class set. It could be:
 * - The pitch class set chroma (a 12-length string with only 1s or 0s)
 * - The pitch class set number (an integer between 1 and 4095)
 * - An array of note names
 * - An array of interval names
 */
export type Set =
  Partial<Pcset> | PcsetChroma | PcsetNum | NoteName[] | IntervalName[];

/**
 * Get the pitch class set of a collection of notes or set number or chroma
 *
 * Use the `edo` option to build sets of other equal divisions of the octave.
 * A chroma must have `edo` characters to be valid (so 12 by default), while
 * a pcset object keeps its own edo.
 *
 * @example
 * Pcset.get(["C", "E↓", "G"], { edo: 24 }).chroma
 * // => "100000010000001000000000"
 */
export function get(src: Set, options?: Partial<PcsetOptions>): Pcset {
  const edo = edoOf(options);
  const chroma: PcsetChroma = isChroma(src, edo)
    ? src
    : isPcsetNum(src, edo)
      ? setNumToChroma(src, edo)
      : Array.isArray(src)
        ? listToChroma(src, edo)
        : isPcset(src)
          ? src.chroma
          : emptyChroma(edo);

  return (cache[chroma] = cache[chroma] || chromaToPcset(chroma));
}

/**
 * @use Pcset.get
 * @deprecated
 */
export const pcset = get;

/**
 * Get pitch class set chroma
 * @function
 * @example
 * Pcset.chroma(["c", "d", "e"]); //=> "101010000000"
 */
export const chroma = (set: Set, options?: Partial<PcsetOptions>) =>
  get(set, options).chroma;

/**
 * Get intervals (from C) of a set
 * @function
 * @example
 * Pcset.intervals(["c", "d", "e"]); //=>
 */
export const intervals = (set: Set, options?: Partial<PcsetOptions>) =>
  get(set, options).intervals;

/**
 * Get pitch class set number
 * @function
 * @example
 * Pcset.num(["c", "d", "e"]); //=> 2192
 */
export const num = (set: Set, options?: Partial<PcsetOptions>) =>
  get(set, options).setNum;

const IVLS = [
  "1P",
  "2m",
  "2M",
  "3m",
  "3M",
  "4P",
  "5d",
  "5P",
  "6m",
  "6M",
  "7m",
  "7M",
];

/**
 * Get the intervals of a pcset *starting from C*
 * @private
 * @param {Set} set - the pitch class set
 * @return {IntervalName[]} an array of interval names or an empty array
 * if not a valid pitch class set
 */
function chromaToIntervals(chroma: PcsetChroma): IntervalName[] {
  const names = chroma.length === 12 ? IVLS : edoIntervalNames(chroma.length);
  const intervals = [];
  for (let i = 0; i < chroma.length; i++) {
    // tslint:disable-next-line:curly
    if (chroma.charAt(i) === "1") intervals.push(names[i]);
  }
  return intervals;
}

// Interval spellings tried for each step of an EDO, most preferred first:
// the 12-TET names, then augmented/diminished ones
const EDO_CANDIDATES = [
  ...IVLS,
  "1A",
  "2A",
  "3d",
  "3A",
  "4d",
  "4A",
  "5A",
  "6d",
  "6A",
  "7d",
  "7A",
  "2d",
];

const edoNamesCache: Record<number, IntervalName[]> = {};

/**
 * Name every step of an EDO with an interval (within an octave). The name
 * with the fewest ups or downs wins; then plain qualities (P, M, m) over
 * augmented or diminished; then ups over downs. So, in 24-EDO step 7 (the
 * neutral third) is "↑3m" and in 19-EDO step 1 is "1A".
 *
 * @private
 */
export function edoIntervalNames(edo: number): IntervalName[] {
  if (edoNamesCache[edo]) return edoNamesCache[edo];
  const best: { name: IntervalName; cost: number[] }[] = [];
  EDO_CANDIDATES.forEach((candidate, order) => {
    const ivl = interval(candidate);
    const size = edoChroma(ivl, edo);
    const plain = /^[PMm]$/.test(ivl.q) ? 0 : 1;
    for (let step = 0; step < edo; step++) {
      // ups needed to reach `step` from this interval, the short way round
      const diff = (((step - size) % edo) + edo) % edo;
      const ups = diff > edo / 2 ? diff - edo : diff;
      const cost = [Math.abs(ups), plain, ups < 0 ? 1 : 0, order];
      const current = best[step];
      if (!current || compareCosts(cost, current.cost) < 0) {
        const arrows = ups < 0 ? "↓".repeat(-ups) : "↑".repeat(ups);
        best[step] = { name: arrows + candidate, cost };
      }
    }
  });
  return (edoNamesCache[edo] = best.map((b) => b.name));
}

function compareCosts(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function notes(set: Set): NoteName[] {
  return get(set).intervals.map((ivl) => transpose("C", ivl));
}

/**
 * Get a list of all possible pitch class sets (all possible chromas) *having
 * C as root*. There are 2048 different chromas. If you want them with another
 * note you have to transpose it
 *
 * @see http://allthescales.org/
 * @return {Array<PcsetChroma>} an array of possible chromas from '10000000000' to '11111111111'
 */
export function chromas(): PcsetChroma[] {
  return range(2048, 4095).map((num) => setNumToChroma(num));
}

/**
 * Given a a list of notes or a pcset chroma, produce the rotations
 * of the chroma discarding the ones that starts with "0"
 *
 * This is used, for example, to get all the modes of a scale.
 *
 * @param {Array|string} set - the list of notes or pitchChr of the set
 * @param {boolean} normalize - (Optional, true by default) remove all
 * the rotations that starts with "0"
 * @return {Array<string>} an array with all the modes of the chroma
 *
 * @example
 * Pcset.modes(["C", "D", "E"]).map(Pcset.intervals)
 */
export function modes(set: Set, normalize = true): PcsetChroma[] {
  const pcs = get(set);

  const binary = pcs.chroma.split("");
  return compact(
    binary.map((_, i) => {
      const r = rotate(i, binary);
      return normalize && r[0] === "0" ? null : r.join("");
    }),
  );
}

/**
 * Test if two pitch class sets are equal
 *
 * @param {Array|string} set1 - one of the pitch class sets
 * @param {Array|string} set2 - the other pitch class set
 * @return {boolean} true if they are equal
 * @example
 * Pcset.isEqual(["c2", "d3"], ["c5", "d2"]) // => true
 */
export function isEqual(s1: Set, s2: Set, options?: Partial<PcsetOptions>) {
  return get(s1, options).chroma === get(s2, options).chroma;
}

/**
 * Create a function that test if a collection of notes is a
 * subset of a given set
 *
 * The function is curried.
 *
 * @param {PcsetChroma|NoteName[]} set - the superset to test against (chroma or
 * list of notes)
 * @return{function(PcsetChroma|NoteNames[]): boolean} a function accepting a set
 * to test against (chroma or list of notes)
 * @example
 * const inCMajor = Pcset.isSubsetOf(["C", "E", "G"])
 * inCMajor(["e6", "c4"]) // => true
 * inCMajor(["e6", "c4", "d3"]) // => false
 */
export function isSubsetOf(set: Set) {
  const s = get(set);

  return (notes: Set | Pcset) => {
    const o = get(notes, { edo: s.edo });
    return (
      s.setNum !== 0 && s.chroma !== o.chroma && includesAll(s.chroma, o.chroma)
    );
  };
}

/**
 * Create a function that test if a collection of notes is a
 * superset of a given set (it contains all notes and at least one more)
 *
 * @param {Set} set - an array of notes or a chroma set string to test against
 * @return {(subset: Set): boolean} a function that given a set
 * returns true if is a subset of the first one
 * @example
 * const extendsCMajor = Pcset.isSupersetOf(["C", "E", "G"])
 * extendsCMajor(["e6", "a", "c4", "g2"]) // => true
 * extendsCMajor(["c6", "e4", "g3"]) // => false
 */
export function isSupersetOf(set: Set) {
  const s = get(set);
  return (notes: Set) => {
    const o = get(notes, { edo: s.edo });
    return (
      s.setNum !== 0 && s.chroma !== o.chroma && includesAll(o.chroma, s.chroma)
    );
  };
}

// true if every pitch class of `sub` is in `sup` (same edo only)
function includesAll(sup: PcsetChroma, sub: PcsetChroma): boolean {
  if (sup.length !== sub.length) return false;
  for (let i = 0; i < sub.length; i++) {
    if (sub[i] === "1" && sup[i] !== "1") return false;
  }
  return true;
}

/**
 * Test if a given pitch class set includes a note
 *
 * @param {Array<string>} set - the base set to test against
 * @param {string} note - the note to test
 * @return {boolean} true if the note is included in the pcset
 *
 * Can be partially applied
 *
 * @example
 * const isNoteInCMajor = isNoteIncludedIn(['C', 'E', 'G'])
 * isNoteInCMajor('C4') // => true
 * isNoteInCMajor('C#4') // => false
 */
export function isNoteIncludedIn(set: Set) {
  const s = get(set);

  return (noteName: NoteName): boolean => {
    const n = note(noteName);
    return s && !n.empty && s.chroma.charAt(edoChroma(n, s.edo)) === "1";
  };
}

/** @deprecated use: isNoteIncludedIn */
export const includes = isNoteIncludedIn;

/**
 * Filter a list with a pitch class set
 *
 * @param {Array|string} set - the pitch class set notes
 * @param {Array|string} notes - the note list to be filtered
 * @return {Array} the filtered notes
 *
 * @example
 * Pcset.filter(["C", "D", "E"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "d2", "c3", "d3" ])
 * Pcset.filter(["C2"], ["c2", "c#2", "d2", "c3", "c#3", "d3"]) // => [ "c2", "c3" ])
 */
export function filter(set: Set) {
  const isIncluded = isNoteIncludedIn(set);
  return (notes: NoteName[]) => {
    return notes.filter(isIncluded);
  };
}

/** @deprecated */
export default {
  get,
  chroma,
  num,
  intervals,
  chromas,
  isSupersetOf,
  isSubsetOf,
  isNoteIncludedIn,
  isEqual,
  filter,
  modes,
  notes,
  // deprecated
  pcset,
};

//// PRIVATE ////

function chromaRotations(chroma: string): string[] {
  const binary = chroma.split("");
  return binary.map((_, i) => rotate(i, binary).join(""));
}

function chromaToPcset(chroma: PcsetChroma): Pcset {
  const edo = chroma.length;
  const setNum = chromaToNumber(chroma);
  // the smallest rotation that starts with a pitch class
  const normalized =
    chromaRotations(chroma)
      .filter((r) => r[0] === "1")
      .sort()[0] ?? emptyChroma(edo);

  const intervals = chromaToIntervals(chroma);

  return {
    empty: false,
    name: "",
    setNum,
    chroma,
    normalized,
    intervals,
    edo,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function listToChroma(set: any[], edo = 12): PcsetChroma {
  if (set.length === 0) {
    return emptyChroma(edo);
  }

  let pitch: Note | Interval | NotFound;
  const binary = new Array(edo).fill(0);
  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < set.length; i++) {
    pitch = note(set[i]);
    // tslint:disable-next-line: curly
    if (pitch.empty) pitch = interval(set[i]);
    // tslint:disable-next-line: curly
    if (!pitch.empty) binary[edoChroma(pitch as Note | Interval, edo)] = 1;
  }
  return binary.join("");
}
