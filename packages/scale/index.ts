/**
 * References:
 * - https://www.researchgate.net/publication/327567188_An_Algorithm_for_Spelling_the_Pitches_of_Any_Musical_Scale
 * @module scale
 */
import {
  all as chordTypes,
  forEdo as chordTypesForEdo,
} from "@tonaljs/chord-type";
import { range as nums, rotate } from "@tonaljs/collection";
import { enharmonic, fromMidi, sortedUniqNames } from "@tonaljs/note";
import {
  chroma,
  isChroma,
  isSubsetOf,
  isSupersetOf,
  modes,
  get as pcset,
} from "@tonaljs/pcset";
import { edoChroma, edoOption, edoSteps, isEdo } from "@tonaljs/pitch";
import { tonicIntervalsTransposer, transpose } from "@tonaljs/pitch-distance";
import { note, NoteName } from "@tonaljs/pitch-note";
import {
  all,
  get as getScaleType,
  ScaleType,
  names as scaleTypeNames,
  all as scaleTypes,
  forEdo as scaleTypesForEdo,
} from "@tonaljs/scale-type";

export interface EdoOptions {
  edo: number;
}

const edoOf = (options?: Partial<EdoOptions>): number =>
  edoOption(options) ?? 12;
const scaleTypesIn = (edo: number) =>
  edo === 12 ? scaleTypes() : scaleTypesForEdo(edo);
const chordTypesIn = (edo: number) =>
  edo === 12 ? chordTypes() : chordTypesForEdo(edo);
const scaleChroma = (name: string, edo: number) => {
  const s = get(name);
  return edo === 12 || s.empty ? s.chroma : pcset(s.intervals, { edo }).chroma;
};

type ScaleName = string;
type ScaleNameTokens = [string, string]; // [TONIC, SCALE TYPE]

export interface Scale extends ScaleType {
  tonic: string | null;
  type: string;
  notes: NoteName[];
}

const NoScale: Scale = {
  empty: true,
  name: "",
  type: "",
  tonic: null,
  setNum: NaN,
  chroma: "",
  normalized: "",
  aliases: [],
  notes: [],
  intervals: [],
};

/**
 * Given a string with a scale name and (optionally) a tonic, split
 * that components.
 *
 * It returns an array with the form [ name, tonic ] where tonic can be a
 * note name or null and name can be any arbitrary string
 * (this function doesn't check if that scale name exists)
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array} an array [tonic, name]
 * @example
 * tokenize("C mixolydian") // => ["C", "mixolydian"]
 * tokenize("anything is valid") // => ["", "anything is valid"]
 * tokenize() // => ["", ""]
 */
export function tokenize(name: ScaleName): ScaleNameTokens {
  if (typeof name !== "string") {
    return ["", ""];
  }
  const i = name.indexOf(" ");
  const tonic = note(name.substring(0, i));
  if (tonic.empty) {
    const n = note(name);
    return n.empty ? ["", name.toLowerCase()] : [n.name, ""];
  }

  const type = name.substring(tonic.name.length + 1).toLowerCase();
  return [tonic.name, type.length ? type : ""];
}

/**
 * Get all scale names
 * @function
 */
export const names = scaleTypeNames;

/**
 * Get a Scale from a scale name.
 */
export function get(src: ScaleName | ScaleNameTokens): Scale {
  const tokens = Array.isArray(src) ? src : tokenize(src);
  const tonic = note(tokens[0]).name;
  const st = getScaleType(tokens[1]);
  if (st.empty) {
    return NoScale;
  }

  const type = st.name;
  const notes: string[] = tonic
    ? st.intervals.map((i) => transpose(tonic, i))
    : [];

  const name = tonic ? tonic + " " + type : type;

  return { ...st, name, type, tonic, notes };
}

/**
 * @deprecated
 * @use Scale.get
 */
export const scale = get;

export function detect(
  notes: string[],
  options: { tonic?: string; match?: "exact" | "fit"; edo?: number } = {},
): string[] {
  const edo = edoOf(options);
  if (!isEdo(edo)) return [];
  const notesChroma = chroma(notes, { edo });
  const tonic = note(options.tonic ?? notes[0] ?? "");
  const tonicChroma = edo === 12 ? tonic.chroma : edoChroma(tonic, edo);
  if (tonicChroma === undefined) {
    return [];
  }

  const pitchClasses = notesChroma.split("");
  pitchClasses[tonicChroma] = "1";
  const scaleChroma = rotate(tonicChroma, pitchClasses).join("");
  const types = edo === 12 ? all() : scaleTypesForEdo(edo);
  const match = types.find((scaleType) => scaleType.chroma === scaleChroma);

  const results: string[] = [];
  if (match) {
    results.push(tonic.name + " " + match.name);
  }
  if (options.match === "exact") {
    return results;
  }

  extended(scaleChroma, { edo }).forEach((scaleName) => {
    results.push(tonic.name + " " + scaleName);
  });

  return results;
}

/**
 * Get all chords that fits a given scale
 *
 * @function
 * @param {string} name - the scale name
 * @return {Array<string>} - the chord names
 *
 * @example
 * scaleChords("pentatonic") // => ["5", "64", "M", "M6", "Madd9", "Msus2"]
 */
export function scaleChords(
  name: string,
  options?: Partial<EdoOptions>,
): string[] {
  const edo = edoOf(options);
  if (!isEdo(edo)) return [];
  const inScale = isSubsetOf(pcset(scaleChroma(name, edo), { edo }));
  return chordTypesIn(edo)
    .filter((chord) => inScale(chord))
    .map((chord) => chord.aliases[0]);
}
/**
 * Get all scales names that are a superset of the given one
 * (has the same notes and at least one more)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of scale names
 * @example
 * extended("major") // => ["bebop", "bebop dominant", "bebop major", "chromatic", "ichikosucho"]
 */
export function extended(
  name: string,
  options?: Partial<EdoOptions>,
): string[] {
  const edo = edoOf(options);
  if (!isEdo(edo)) return [];
  const chroma = isChroma(name, edo) ? name : scaleChroma(name, edo);
  const isSuperset = isSupersetOf(pcset(chroma, { edo }));
  return scaleTypesIn(edo)
    .filter((scale) => isSuperset(scale))
    .map((scale) => scale.name);
}

/**
 * Find all scales names that are a subset of the given one
 * (has less notes but all from the given scale)
 *
 * @function
 * @param {string} name
 * @return {Array} a list of scale names
 *
 * @example
 * reduced("major") // => ["ionian pentatonic", "major pentatonic", "ritusen"]
 */
export function reduced(name: string, options?: Partial<EdoOptions>): string[] {
  const edo = edoOf(options);
  if (!isEdo(edo)) return [];
  const isSubset = isSubsetOf(pcset(scaleChroma(name, edo), { edo }));
  return scaleTypesIn(edo)
    .filter((scale) => isSubset(scale))
    .map((scale) => scale.name);
}

/**
 * Given an array of notes, return the scale: a pitch class set starting from
 * the first note of the array
 *
 * @function
 * @param {string[]} notes
 * @return {string[]} pitch classes with same tonic
 * @example
 * scaleNotes(['C4', 'c3', 'C5', 'C4', 'c4']) // => ["C"]
 * scaleNotes(['D4', 'c#5', 'A5', 'F#6']) // => ["D", "F#", "A", "C#"]
 */
export function scaleNotes(notes: NoteName[]) {
  const pcset: string[] = notes.map((n) => note(n).pc).filter((x) => x);
  const tonic = pcset[0];
  const scale = sortedUniqNames(pcset);
  return rotate(scale.indexOf(tonic), scale);
}

type ScaleMode = [string, string];
/**
 * Find mode names of a scale
 *
 * @function
 * @param {string} name - scale name
 * @example
 * modeNames("C pentatonic") // => [
 *   ["C", "major pentatonic"],
 *   ["D", "egyptian"],
 *   ["E", "malkos raga"],
 *   ["G", "ritusen"],
 *   ["A", "minor pentatonic"]
 * ]
 */
export function modeNames(
  name: string,
  options?: Partial<EdoOptions>,
): ScaleMode[] {
  const s = get(name);
  if (s.empty) {
    return [];
  }
  const edo = edoOf(options);
  if (!isEdo(edo)) return [];
  const nameOf =
    edo === 12
      ? (chroma: string) => get(chroma).name
      : (chroma: string) =>
          scaleTypesForEdo(edo).find((t) => t.chroma === chroma)?.name;

  const tonics = s.tonic ? s.notes : s.intervals;
  return modes(pcset(scaleChroma(name, edo), { edo }))
    .map((chroma: string, i: number): ScaleMode => {
      const modeName = nameOf(chroma);
      return modeName ? [tonics[i], modeName] : ["", ""];
    })
    .filter((x) => x[0]);
}

function placeInOctave(pc: string, steps: number, edo: number) {
  const n0 = note(pc + "0");
  if (n0.empty) return undefined;
  const oct = (steps - edoSteps(n0, edo)) / edo;
  return Number.isInteger(oct) ? note({ ...n0, oct }).name : undefined;
}

function getEdoNoteNameOf(scale: string | string[], edo: number) {
  const names = Array.isArray(scale) ? scaleNotes(scale) : get(scale).notes;
  const chromas = names.map((name) => edoChroma(note(name), edo));

  return (noteOrSteps: string | number): string | undefined => {
    const steps =
      typeof noteOrSteps === "number"
        ? noteOrSteps
        : edoSteps(note(noteOrSteps), edo);
    if (!Number.isFinite(steps)) return undefined;
    const position = chromas.indexOf(((steps % edo) + edo) % edo);
    if (position === -1) return undefined;
    return placeInOctave(note(names[position]).pc, steps, edo);
  };
}

function getNoteNameOf(scale: string | string[]) {
  const names = Array.isArray(scale) ? scaleNotes(scale) : get(scale).notes;
  const chromas = names.map((name) => note(name).chroma);

  return (noteOrMidi: string | number): string | undefined => {
    const currNote =
      typeof noteOrMidi === "number"
        ? note(fromMidi(noteOrMidi))
        : note(noteOrMidi);
    const height = currNote.height;

    if (height === undefined) return undefined;
    const chroma = height % 12;
    const position = chromas.indexOf(chroma);
    if (position === -1) return undefined;
    return enharmonic(currNote.name, names[position]);
  };
}

export function rangeOf(
  scale: string | string[],
  options?: Partial<EdoOptions>,
) {
  const edo = edoOf(options);
  if (!isEdo(edo)) return () => [];
  if (edo !== 12) {
    const getName = getEdoNoteNameOf(scale, edo);
    return (fromNote: string, toNote: string) => {
      const from = edoSteps(note(fromNote), edo);
      const to = edoSteps(note(toNote), edo);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
      return nums(from, to)
        .map(getName)
        .filter((x) => x);
    };
  }
  const getName = getNoteNameOf(scale);
  return (fromNote: string, toNote: string) => {
    const from = note(fromNote).height;
    const to = note(toNote).height;
    if (from === undefined || to === undefined) return [];

    return nums(from, to)
      .map(getName)
      .filter((x) => x);
  };
}

/**
 * Returns a function to get a note name from the scale degree.
 *
 * @example
 * [1, 2, 3].map(Scale.degrees("C major")) => ["C", "D", "E"]
 * [1, 2, 3].map(Scale.degrees("C4 major")) => ["C4", "D4", "E4"]
 */
export function degrees(scaleName: string | ScaleNameTokens) {
  const { intervals, tonic } = get(scaleName);
  const transpose = tonicIntervalsTransposer(intervals, tonic);
  return (degree: number) =>
    degree ? transpose(degree > 0 ? degree - 1 : degree) : "";
}

/**
 * Sames as `degree` but with 0-based index
 */
export function steps(scaleName: string | ScaleNameTokens) {
  const { intervals, tonic } = get(scaleName);
  return tonicIntervalsTransposer(intervals, tonic);
}

/** @deprecated */
export default {
  degrees,
  detect,
  extended,
  get,
  modeNames,
  names,
  rangeOf,
  reduced,
  scaleChords,
  scaleNotes,
  steps,
  tokenize,

  // deprecated
  scale,
};
