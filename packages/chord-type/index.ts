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
import { accToAlt, arrowsToUps, upsToArrows } from "@tonaljs/pitch-note";
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
let byIntervals: Record<string, ChordType> = Object.create(null);
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
    (typeof type === "string" ? kiteChord(type) : undefined) ??
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

// Kite's chord names: "↓7", "m↓7", "↓,M7(↓5)"
const ARROWS = "(?:[↑^]+|[↓v]+)?";
const NOTE = `,?(${ARROWS})(~?)(M|m|A|a|d|##?|bb?)?(\\d{1,2})|,?no(\\d{1,2})`;
const GLOBAL_REGEX = new RegExp(`^(${ARROWS})(~?)(.*)$`);
const NOTE_REGEX = new RegExp(`^(?:${NOTE})`);
// Kite's chord types where Tonal has none or another meaning ("C4" stays
// Tonal's quartal chord; "C↓4" is a suspended fourth)
const KITE_TYPES: Record<string, string> = {
  "2": "sus2",
  "4": "sus4",
  a: "aug",
  a7: "aug7",
  d: "dim",
  d7: "dim7",
  M9: "maj9",
  M13: "maj13",
};
// Kite's 11th and 13th chords have every lower degree (Tonal's leave out the
// 3rd of an 11th and the 11th of a 13th)
const KITE_STACKS: Record<string, string> = {
  "11": "1P 3M 5P 7m 9M 11P",
  "13": "1P 3M 5P 7m 9M 11P 13M",
  maj13: "1P 3M 5P 7M 9M 11P 13M",
  m13: "1P 3m 5P 7m 9M 11P 13M",
};
// only valid names are cached, so arbitrary input can't grow the cache
let kiteCache: Record<string, ChordType> = Object.create(null);

type KiteNote = { ups: number; mid: boolean; q: string; num: number };

function kiteChord(symbol: string): ChordType | undefined {
  const cached = kiteCache[symbol];
  if (cached) return cached;
  const chord = parseKite(symbol);
  if (chord) kiteCache[symbol] = chord;
  return chord;
}

function parseKite(symbol: string): ChordType | undefined {
  const [, globalArrows, globalMid, rest] = GLOBAL_REGEX.exec(symbol)!;
  const global = { ups: arrowsToUps(globalArrows), mid: globalMid === "~" };
  // the longest known chord type that leaves a valid rest
  for (let end = rest.length; end >= 0; end--) {
    const head = rest.slice(0, end);
    const tail = rest.slice(end);
    const alias = KITE_TYPES[head] ?? head;
    const base = index[alias];
    if (!base || microtonal.includes(base) || !base.aliases.includes(alias))
      continue;
    // a major 7th written after another quality is an added note the global
    // arrow doesn't reach ("CvmM7" is C vEb G B), and a mid can't be major
    const marker = /M|maj|Δ|\^/.exec(alias);
    const keep = [...alias.matchAll(/[#b](\d+)/g)].map((m) => +m[1]);
    if (marker && (global.mid || marker.index > 0)) keep.push(7);
    const stack = KITE_STACKS[base.aliases[0]];
    const intervals = kiteIntervals(
      stack ? { ...base, intervals: stack.split(" ") } : base,
      global,
      tail,
      keep,
    );
    if (intervals) {
      const known = byIntervals[intervals.join(" ")];
      if (known) return known;
      const name =
        upsToArrows(global.ups) +
        globalMid +
        head +
        tail.replace(/\^/g, "↑").replace(/v/g, "↓");
      return {
        ...pcset(intervals),
        name,
        quality: getQuality(intervals),
        intervals,
        aliases: [name],
      };
    }
  }
  return undefined;
}

function kiteIntervals(
  base: ChordType,
  global: { ups: number; mid: boolean },
  rest: string,
  keep: number[] = [],
): string[] | undefined {
  let notes: KiteNote[] = base.intervals.map((name) => {
    const i = interval(name);
    return { ups: i.ups, mid: false, q: i.q, num: i.num };
  });
  if (global.ups || global.mid) {
    const hasThird = notes.some((n) => simple(n.num) === 3);
    // the 3rd, 6th (not the 13th), 7th and 11th, but not a note the chord
    // type writes with its own accidental ("C^9#11") or a major 7th after
    // another quality
    const affected = notes.filter(
      (n) =>
        !keep.includes(n.num) &&
        !(keep.includes(7) && simple(n.num) === 7) &&
        ([3, 7].includes(simple(n.num)) ||
          n.num === 6 ||
          n.num === 11 ||
          (!hasThird && n.num < 8 && [2, 4].includes(n.num))),
    );
    // a global arrow needs a note to change (no "C↓5")
    if (!affected.length) return undefined;
    affected.forEach((n) => {
      n.ups += global.ups;
      n.mid = n.mid || global.mid;
    });
  }
  // added notes and (alterations), in any order: "Cv(v5)7", "C6(v5)9"
  let m: RegExpExecArray | null;
  while (rest) {
    const group = /^\(([^()]*)\)/.exec(rest);
    if (group) {
      let list = group[1].replace(/ /g, ",");
      while ((m = NOTE_REGEX.exec(list)) && m[0]) {
        list = list.slice(m[0].length);
        if (m[5]) return undefined;
        notes = alter(notes, kiteNote(m, true));
      }
      if (list) return undefined;
      rest = rest.slice(group[0].length);
      continue;
    }
    m = NOTE_REGEX.exec(rest);
    if (!m || !m[0]) return undefined;
    rest = rest.slice(m[0].length);
    if (m[5]) notes = notes.filter((n) => simple(n.num) !== simple(+m![5]));
    else {
      // an added note on a degree the chord has replaces it, unless it is
      // the same note ("C↓5" is not C↓ with its own 5th)
      const added = kiteNote(m);
      const same = notes.find((n) => n.num === added.num);
      if (same && same.q === added.q && same.ups === added.ups && !same.mid)
        return undefined;
      notes = notes.filter((n) => n.num !== added.num).concat(added);
    }
  }
  notes.sort((a, b) => a.num - b.num);
  const names = notes.map(
    (n) => interval(upsToArrows(n.ups) + n.num + (n.mid ? "~" : n.q)).name,
  );
  const valid = names.every((n) => n) && new Set(names).size === names.length;
  return valid ? names : undefined;
}

const simple = (num: number) => ((num - 1) % 7) + 1;

// an alteration replaces the note's ups and downs ("Cvm9(^7)" has ^Bb) and,
// if it has one, its quality; a 2nd or 4th replaces a missing 3rd
function alter(notes: KiteNote[], change: KiteNote): KiteNote[] {
  const same =
    notes.find((n) => n.num === change.num) ??
    notes.find((n) => simple(n.num) === simple(change.num));
  if (same) {
    same.ups = change.ups;
    if (change.mid) same.mid = true;
    else if (change.q) [same.q, same.mid] = [change.q, false];
    return notes;
  }
  const rest = [2, 4].includes(change.num)
    ? notes.filter((n) => simple(n.num) !== 3)
    : notes;
  return [...rest, change];
}

// an accidental is relative to the major scale; a 7th alone is minor
function kiteNote(m: RegExpExecArray, altering = false): KiteNote {
  const num = +m[4];
  const spec = m[3] ?? "";
  const step = (num - 1) % 7;
  const q = /^[MmAd]$/.test(spec)
    ? spec
    : spec === "a"
      ? "A"
      : spec
        ? interval({ step, alt: accToAlt(spec), oct: 0, dir: 1 }).q
        : altering
          ? ""
          : step === 6
            ? "m"
            : interval(String(num)).q;
  return { ups: arrowsToUps(m[1]), mid: m[2] === "~", q, num };
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
  byIntervals = Object.create(null);
  kiteCache = Object.create(null);
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
  kiteCache = Object.create(null);
  byIntervals[intervals.join(" ")] ??= chord;
  if (chord.name) {
    index[chord.name] = chord;
  }
  const hasUps = intervals.some((ivl) => {
    const i = interval(ivl);
    return i.ups || i.q === "~";
  });
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
  "quartal triad",
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
