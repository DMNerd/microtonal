import {
  EmptyPcset,
  get as pcset,
  Pcset,
  PcsetChroma,
  PcsetNum,
  projectTypesToEdo,
} from "@tonaljs/pcset";
import { edoKey, edoOption, isEdo } from "@tonaljs/pitch";
import { interval, intervalFromEdoSteps } from "@tonaljs/pitch-interval";
import data from "./data";
import microtonalData from "./microtonal-data";
import ratioData from "./ratio-data";

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
let ratioChords: RatioChord[] = [];
let ratioCache: Record<string, ChordType | undefined> = {};

interface RatioChord {
  name: string;
  ratios: number[];
  aliases: string[];
}

/**
 * Given a chord name or chroma, return the chord properties
 * @param {string} source - chord name or pitch class set chroma
 * @example
 * import { get } from 'tonaljs/chord-type'
 * get('major') // => { name: 'major', ... }
 * get('har7', { edo: 72 }).intervals // => ["1P", "↓3M", "5P", "↓↓7m"]
 */
export function get(
  type: ChordTypeName,
  options?: Partial<{ edo: number }>,
): ChordType {
  const edo = edoOption(options);
  return (
    (edo !== undefined ? ratioChordIn(String(type), edo) : undefined) ??
    index[type] ??
    NoChordType
  );
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
    const types = projectTypesToEdo(dictionary, microtonal, edo);
    const seen = new Set(types.map((t) => t.chroma));
    for (const { name } of edo === 12 ? [] : ratioChords) {
      const chord = ratioChordIn(name, edo);
      if (chord && !seen.has(chord.chroma)) {
        seen.add(chord.chroma);
        types.push(chord);
      }
    }
    edoCache[key] = types;
  }
  return edoCache[key].slice();
}

/**
 * Add a chord defined by frequency ratios, built in each EDO from the
 * nearest steps (not in 12-EDO, which keeps the traditional dictionary)
 * @example
 * addFromRatios(["1/1", "5/4", "3/2", "7/4"], ["har7"], "harmonic seventh")
 */
export function addFromRatios(
  ratios: string[],
  aliases: string[],
  fullName: string,
) {
  const values = ratios.map((r) => {
    const [n, d = "1"] = r.split("/");
    return Number(n) / Number(d);
  });
  ratioChords.push({ name: fullName, ratios: values, aliases });
  edoCache = {};
  ratioCache = {};
}

function ratioChordIn(name: string, edo: number): ChordType | undefined {
  const chord = ratioChords.find(
    (c) => c.name === name || c.aliases.includes(name),
  );
  if (!chord || !isEdo(edo) || edo === 12) return undefined;
  const key = `${edoKey(edo)}:${chord.name}`;
  if (!(key in ratioCache)) {
    const steps = chord.ratios.map((r) => Math.round(edo * Math.log2(r)));
    // tones that merge in this EDO
    const distinct = steps.every((s, i) => i === 0 || s > steps[i - 1]);
    const intervals = steps.map((s) => intervalFromEdoSteps(s, edo));
    ratioCache[key] = distinct
      ? {
          ...pcset(intervals, { edo }),
          name: chord.name,
          quality: getQuality(intervals),
          intervals,
          aliases: chord.aliases,
        }
      : undefined;
  }
  return ratioCache[key];
}

/**
 * Clear the dictionary
 */
export function removeAll() {
  dictionary = [];
  microtonal = [];
  ratioChords = [];
  index = Object.create(null);
  edoCache = {};
  ratioCache = {};
  tiers = Object.create(null);
}

/**
 * Get how common a chord type is (0 to 2), to rank chord detection results
 * @example
 * ChordType.tier(ChordType.get("major")) // => 0
 */
export function tier(
  type: Pick<ChordType, "intervals"> & { name?: string },
): number {
  if (ratioChords.some((c) => c.name === type.name)) return 0;
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
ratioData.forEach(([fullName, ratios, names]: string[]) =>
  addFromRatios(ratios.split(" "), names.split(" "), fullName),
);

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
  addFromRatios,
  removeAll,
  keys,
  // deprecated
  entries,
  chordType,
};
