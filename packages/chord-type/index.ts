import {
  EmptyPcset,
  get as pcset,
  Pcset,
  PcsetChroma,
  PcsetNum,
  projectTypesToEdo,
} from "@tonaljs/pcset";
import { interval } from "@tonaljs/pitch-interval";
import data from "./data";
import microtonalData from "./microtonal-data";

export type ChordQuality =
  "Major" | "Minor" | "Augmented" | "Diminished" | "Unknown";

export interface ChordType extends Pcset {
  name: string;
  quality: ChordQuality;
  aliases: string[];
}
const NoChordType: ChordType = {
  ...EmptyPcset,
  name: "",
  quality: "Unknown",
  intervals: [],
  aliases: [],
};

type ChordTypeName = string | PcsetChroma | PcsetNum;

let dictionary: ChordType[] = [];
// Chords with ups or downs: kept apart because their 12-EDO sizes clash with
// traditional chords ("↓3M" is "3m" in 12-EDO). See `forEdo`.
let microtonal: ChordType[] = [];
let index: Record<ChordTypeName, ChordType> = {};
let edoCache: Record<number, ChordType[]> = {};
// How established each chord type is, by interval spelling. See `tier`.
let tiers: Record<string, number> = {};

/**
 * Given a chord name or chroma, return the chord properties
 * @param {string} source - chord name or pitch class set chroma
 * @example
 * import { get } from 'tonaljs/chord-type'
 * get('major') // => { name: 'major', ... }
 */
export function get(type: ChordTypeName): ChordType {
  return index[type] || NoChordType;
}

/** @deprecated */
export const chordType = get;

/**
 * Get all chord (long) names
 */
export function names() {
  return dictionary.map((chord) => chord.name).filter((x) => x);
}

/**
 * Get all chord symbols
 */
export function symbols() {
  return dictionary.map((chord) => chord.aliases[0]).filter((x) => x);
}

/**
 * Keys used to reference chord types
 */
export function keys() {
  return Object.keys(index);
}

/**
 * Return a list of all chord types
 */
export function all(): ChordType[] {
  return dictionary.slice();
}

/** @deprecated */
export const entries = all;

/**
 * Return the list of chord types with ups or downs
 */
export function allMicrotonal(): ChordType[] {
  return microtonal.slice();
}

/**
 * Get the chord types of an equal division of the octave (EDO), with their
 * pitch class set (chroma, setNum, normalized) computed in that EDO.
 *
 * - Chords whose tones merge in that EDO are left out.
 * - Chords with ups or downs are only included in EDOs where an up is
 *   smaller than a sharp (edoSharp >= 2: 17, 22, 24, 31, 41, 53-EDO...) and
 *   when they are not the same set as a traditional chord. When two of them
 *   are the same set, only the first one is kept.
 *
 * @example
 * ChordType.forEdo(24).find(t => t.name === "downmajor").chroma
 * // => "100000010000001000000000"
 */
export function forEdo(edo: number): ChordType[] {
  if (!edoCache[edo]) {
    edoCache[edo] = projectTypesToEdo(dictionary, microtonal, edo);
  }
  return edoCache[edo].slice();
}

/**
 * Clear the dictionary
 */
export function removeAll() {
  dictionary = [];
  microtonal = [];
  index = {};
  edoCache = {};
  tiers = {};
}

/**
 * How established a chord type is, used to rank chord detection results:
 *
 * - 0: core chords (the named major, minor, diminished, dominant and
 *   suspended chords of the dictionary, and the microtonal chords)
 * - 1: other named chords (fifth, augmented, minor augmented...) and chords
 *   added with `add`
 * - 2: legacy chords (the unnamed ones, like "7no5" or "Madd9")
 *
 * @example
 * ChordType.tier(ChordType.get("major")) // => 0
 * ChordType.tier(ChordType.get("m#5")) // => 1
 */
export function tier(type: Pick<ChordType, "intervals">): number {
  return tiers[type.intervals.join(" ")] ?? 1;
}

/**
 * Add a chord to the dictionary.
 * @param intervals
 * @param aliases
 * @param [fullName]
 */
export function add(intervals: string[], aliases: string[], fullName?: string) {
  const quality = getQuality(intervals);
  const chord = {
    ...pcset(intervals),
    name: fullName || "",
    quality,
    intervals,
    aliases,
  };
  edoCache = {};
  if (chord.name) {
    index[chord.name] = chord;
  }
  const hasUps = intervals.some((ivl) => interval(ivl).ups);
  if (hasUps) {
    // only reachable by name: its 12-EDO chroma would shadow another chord
    microtonal.push(chord);
  } else {
    dictionary.push(chord);
    index[chord.setNum] = chord;
    index[chord.chroma] = chord;
  }
  chord.aliases.forEach((alias) => addAlias(chord, alias));
}

export function addAlias(chord: ChordType, alias: string) {
  index[alias] = chord;
}

function getQuality(intervals: string[]): ChordQuality {
  // ups and downs don't change the quality: "↓3M" is still a major third
  const plain = intervals.map((ivl) => ivl.replace(/[↑↓^v]/g, ""));
  const has = (interval: string) => plain.indexOf(interval) !== -1;
  return has("5A")
    ? "Augmented"
    : has("3M")
      ? "Major"
      : has("5d")
        ? "Diminished"
        : has("3m")
          ? "Minor"
          : "Unknown";
}

// The named chords of the dictionary's "Other" section: named, but less
// common than the core chords.
const OTHER_CHORDS = [
  "fifth",
  "augmented",
  "minor augmented",
  "augmented seventh",
  "major sharp eleventh (lydian)",
];
data.forEach(([ivls, fullName, names]: string[]) => {
  add(ivls.split(" "), names.split(" "), fullName);
  tiers[ivls] = !fullName ? 2 : OTHER_CHORDS.includes(fullName) ? 1 : 0;
});
dictionary.sort((a, b) => a.setNum - b.setNum);
microtonalData.forEach(([ivls, fullName, names]: string[]) => {
  add(ivls.split(" "), names.split(" "), fullName);
  tiers[ivls] = 0;
});

/** @deprecated */
export default {
  names,
  symbols,
  get,
  all,
  allMicrotonal,
  forEdo,
  tier,
  add,
  removeAll,
  keys,
  // deprecated
  entries,
  chordType,
};
