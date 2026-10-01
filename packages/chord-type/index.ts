import {
  EmptyPcset,
  get as pcset,
  Pcset,
  PcsetChroma,
  PcsetNum,
  projectTypesToEdo,
} from "@tonaljs/pcset";
import { edoKey, isEdo } from "@tonaljs/pitch";
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
// chords with ups or downs: in 12-EDO they would clash with other chords
let microtonal: ChordType[] = [];
let index: Record<ChordTypeName, ChordType> = Object.create(null);
let edoCache: Record<string, ChordType[]> = {};
let tiers: Record<string, number> = Object.create(null);

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
 * Get the chord types of an EDO, with their pitch class sets in that EDO
 * @example
 * ChordType.forEdo(24).find(t => t.name === "downmajor").chroma
 */
export function forEdo(edo: number): ChordType[] {
  if (!isEdo(edo)) return [];
  const key = edoKey(edo);
  if (!edoCache[key]) {
    edoCache[key] = projectTypesToEdo(dictionary, microtonal, edo);
  }
  return edoCache[key].slice();
}

/**
 * Clear the dictionary
 */
export function removeAll() {
  dictionary = [];
  microtonal = [];
  index = Object.create(null);
  edoCache = {};
  tiers = Object.create(null);
}

/**
 * Get how common a chord type is (0 to 2), to rank chord detection results
 * @example
 * ChordType.tier(ChordType.get("major")) // => 0
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
