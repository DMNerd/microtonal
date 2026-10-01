/* eslint-disable @typescript-eslint/no-explicit-any */
import { freqToMidi, midiToNoteName } from "@tonaljs/midi";
import {
  Pitch,
  edoChroma as pitchEdoChroma,
  edoCrossesNatural,
  edoKey,
  edoOption,
  isEdo,
  edoSteps as pitchEdoSteps,
} from "@tonaljs/pitch";
import { distance as _dist, transpose as _tr } from "@tonaljs/pitch-distance";
import {
  IntervalName,
  edoIntervalNames,
  intervalFromEdoSteps,
} from "@tonaljs/pitch-interval";
import {
  Note,
  NoteLiteral,
  NoteName,
  note as props,
} from "@tonaljs/pitch-note";

export type { NoteType } from "@tonaljs/pitch-note";

const NAMES = ["C", "D", "E", "F", "G", "A", "B"];

const toName = (n: Note) => n.name;
const onlyNotes = (array: any[]) =>
  array.map(props).filter((n) => !n.empty) as Note[];

/**
 * Return the natural note names without octave
 * @function
 * @example
 * Note.names(); // => ["C", "D", "E", "F", "G", "A", "B"]
 */
export function names(array?: any[]): string[] {
  if (array === undefined) {
    return NAMES.slice();
  } else if (!Array.isArray(array)) {
    return [];
  } else {
    return onlyNotes(array).map(toName);
  }
}

/**
 * Get a note from a note name
 *
 * @function
 * @example
 * Note.get('Bb4') // => { name: "Bb4", midi: 70, chroma: 10, ... }
 */
export const get = props;

/**
 * Get the note name
 * @function
 */
export const name = (note: NoteLiteral) => get(note).name;

/**
 * Get the note pitch class name
 * @function
 */
export const pitchClass = (note: NoteLiteral) => get(note).pc;

/**
 * Get the note accidentals
 * @function
 */
export const accidentals = (note: NoteLiteral) => get(note).acc;

/**
 * Get the note octave
 * @function
 */
export const octave = (note: NoteLiteral) => get(note).oct;

/**
 * Get the note midi
 * @function
 */
export const midi = (note: NoteLiteral) => get(note).midi;

/**
 * Get the note midi
 * @function
 */
export const freq = (note: NoteLiteral) => get(note).freq;

/**
 * Get the note chroma
 * @function
 */
export const chroma = (note: NoteLiteral) => get(note).chroma;

/**
 * Get the note height in steps of an equal division of the octave (C0 = 0),
 * or the steps above C for pitch classes. Ups and downs are one step each.
 *
 * @example
 * Note.edoSteps("E4", 24) // => 104
 * Note.edoSteps("E↓", 24) // => 7
 */
export const edoSteps = (note: NoteLiteral, edo = 12): number => {
  const n = get(note);
  return n.empty ? NaN : pitchEdoSteps(n, edo);
};

/**
 * Get the note chroma (pitch class, 0 to edo - 1) in an equal division of
 * the octave.
 *
 * @example
 * Note.edoChroma("E↓", 24) // => 7
 * Note.edoChroma("F#", 19) // => 9
 */
export const edoChroma = (note: NoteLiteral, edo = 12): number => {
  const n = get(note);
  return n.empty ? NaN : pitchEdoChroma(n, edo);
};

/**
 * Get the frequency of a note in an equal division of the octave.
 * By default A4 is 440Hz; set `refNote` and `refFreq` to tune differently.
 * It returns null for pitch classes (notes without octave).
 *
 * @example
 * Note.edoFreq("A4", 24) // => 440
 * Note.edoFreq("A↑4", 24) // => 452.89... (a quarter tone higher)
 * Note.edoFreq("C4", 19, { refNote: "C4", refFreq: 256 }) // => 256
 */
export function edoFreq(
  noteName: NoteLiteral,
  edo = 12,
  options: { refNote?: NoteLiteral; refFreq?: number } = {},
): number | null {
  const n = get(noteName);
  const ref = get(options.refNote ?? "A4");
  const refFreq = options.refFreq ?? 440;
  if (
    !isEdo(edo) ||
    n.empty ||
    n.oct === undefined ||
    ref.empty ||
    ref.oct === undefined
  ) {
    return null;
  }
  const steps = pitchEdoSteps(n, edo) - pitchEdoSteps(ref, edo);
  return refFreq * Math.pow(2, steps / edo);
}

/** Accidental preference when spelling EDO steps: sharps/ups or flats/downs */
export type EdoAccidental = "sharp" | "flat";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const SPELLING_ACCIDENTALS = ["", "#", "b", "##", "bb"];
const spellingCache: Record<string, string[]> = {};
// A spelling that crosses a neighbouring natural costs more than one up or
// down (see `edoCrossesNatural`)
const CROSSING_COST = 1.5;

/**
 * Spell every pitch class of an EDO with a sharp or flat preference.
 * Among all spellings (naturals, single and double sharps and flats, plus
 * ups or downs) the winner has, in order:
 *
 * 1. the fewest ups or downs, counting a double sharp or flat as one more
 *    (in 31-EDO step 1 is "C↑", not "B##"), and a spelling that lands on or
 *    past a neighbouring natural as one and a half more (in 41-EDO step 1
 *    is "C↑", not "B#"; in 53-EDO step 17 is "E↓", not "Fb")
 * 2. ups for the sharp view, downs for the flat view
 * 3. the fewest accidentals
 * 4. no E#, B#, Cb or Fb (in 17-EDO step 1 is "Db", not "B#")
 * 5. sharps for the sharp view, flats for the flat view
 *
 * @example
 * Note.edoNames(24, "sharp").slice(0, 4) // => ["C", "C↑", "C#", "C#↑"]
 * Note.edoNames(24, "flat").slice(0, 4) // => ["C", "Db↓", "Db", "D↓"]
 * Note.edoNames(19, "sharp").slice(0, 3) // => ["C", "C#", "Db"]
 */
export function edoNames(edo: number, accidental: EdoAccidental): string[] {
  if (!isEdo(edo)) return [];
  const key = `${edoKey(edo)}/${accidental}`;
  if (spellingCache[key]) return spellingCache[key].slice();

  const preferUps = accidental === "sharp";
  const viewAcc = preferUps ? "#" : "b";
  const best: { name: string; cost: number[] }[] = [];
  for (const letter of LETTERS) {
    for (const acc of SPELLING_ACCIDENTALS) {
      const size = pitchEdoChroma(props(letter + acc), edo);
      for (let chroma = 0; chroma < edo; chroma++) {
        const diff = (((chroma - size) % edo) + edo) % edo;
        const ups = diff > edo / 2 ? diff - edo : diff;
        const pitch = { ...props(letter + acc), ups };
        const cost = [
          Math.abs(ups) +
            (acc.length > 1 ? 1 : 0) +
            (edoCrossesNatural(pitch, edo) ? CROSSING_COST : 0),
          ups === 0 || ups > 0 === preferUps ? 0 : 1,
          acc.length,
          (acc[0] === "#" && (letter === "E" || letter === "B")) ||
          (acc[0] === "b" && (letter === "C" || letter === "F"))
            ? 1
            : 0,
          acc === "" || acc[0] === viewAcc ? 0 : 1,
        ];
        const current = best[chroma];
        if (!current || compareCosts(cost, current.cost) < 0) {
          best[chroma] = {
            name: props(pitch).name,
            cost,
          };
        }
      }
    }
  }
  spellingCache[key] = best.map((b) => b.name);
  return spellingCache[key].slice();
}

function compareCosts(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Get a note name from its height in steps of an equal division of the
 * octave (C0 = 0).
 *
 * With an `accidental` preference each step is spelled like `edoNames`.
 * Without it, each step gets the simplest interval name above C (fewest ups
 * and downs, see `Pcset.intervals`).
 *
 * @example
 * Note.fromEdoSteps(104, 24) // => "E4"
 * Note.fromEdoSteps(103, 24) // => "Eb↑4"
 * Note.fromEdoSteps(103, 24, { accidental: "sharp" }) // => "D#↑4"
 * Note.fromEdoSteps(7, 24, { pitchClass: true }) // => "Eb↑"
 */
export function fromEdoSteps(
  steps: number,
  edo = 12,
  options: { pitchClass?: boolean; accidental?: EdoAccidental } = {},
): NoteName {
  if (!Number.isInteger(steps) || !isEdo(edo)) {
    return "";
  }
  const chroma = ((steps % edo) + edo) % edo;
  const pc = options.accidental
    ? edoNames(edo, options.accidental)[chroma]
    : _tr("C", edoIntervalNames(edo)[chroma]);
  if (options.pitchClass) return pc;
  const n0 = props(pc + "0");
  const oct = (steps - pitchEdoSteps(n0, edo)) / edo;
  return props({ ...n0, oct }).name;
}

/**
 * Transpose a note by a number of steps of an equal division of the octave.
 * The steps are spelled as an interval (see `Interval.fromEdoSteps`), so the
 * note keeps its letter where it can. In "proportional" EDOs, where that
 * spelling can land on another step, the target step is respelled like
 * `edoNames` instead. Pitch classes stay pitch classes.
 *
 * @example
 * Note.transposeEdoSteps("C4", 7, 24) // => "Eb↑4"
 * Note.transposeEdoSteps("C#", 1, 24) // => "C#↑"
 * Note.transposeEdoSteps("E4", -1, 24) // => "E↓4"
 */
export function transposeEdoSteps(
  note: NoteLiteral,
  steps: number,
  edo = 12,
): NoteName {
  const n = get(note);
  if (n.empty || !Number.isInteger(steps) || !isEdo(edo)) return "";
  const pitchClass = n.oct === undefined;
  const target = pitchEdoSteps(n, edo) + steps;
  const result = get(_tr(n.name, intervalFromEdoSteps(steps, edo)));
  const expected = pitchClass ? ((target % edo) + edo) % edo : target;
  if (!result.empty && pitchEdoSteps(result, edo) === expected) {
    return result.name;
  }
  return fromEdoSteps(target, edo, {
    pitchClass,
    accidental: steps < 0 ? "flat" : "sharp",
  });
}

// Apply a 12-TET respelling to the note without its ups/downs, then put them back
function keepUps(note: Note, respell: (base: Note) => string): string {
  if (!note.ups) return respell(note);
  const base = props({ step: note.step, alt: note.alt, oct: note.oct });
  const spelled = props(respell(base));
  return spelled.empty ? "" : props({ ...spelled, ups: note.ups }).name;
}

/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 *
 * @function
 * @param {number} midi - the midi note number
 * @return {string} the note name
 * @example
 * Note.fromMidi(61) // => "Db4"
 * Note.fromMidi(61.7) // => "D4"
 */
export function fromMidi(midi: number) {
  return midiToNoteName(midi);
}

/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 */
export function fromFreq(freq: number) {
  return midiToNoteName(freqToMidi(freq));
}
/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 */
export function fromFreqSharps(freq: number) {
  return midiToNoteName(freqToMidi(freq), { sharps: true });
}

/**
 * Given a midi number, returns a note name. Uses flats for altered notes.
 *
 * @function
 * @param {number} midi - the midi note number
 * @return {string} the note name
 * @example
 * Note.fromMidiSharps(61) // => "C#4"
 */

export function fromMidiSharps(midi: number) {
  return midiToNoteName(midi, { sharps: true });
}

export const distance = _dist;

/**
 * Transpose a note by an interval
 */
export const transpose = _tr;
export const tr = _tr;

/**
 * Transpose by an interval.
 * @function
 * @param {string} interval
 * @return {function} a function that transposes by the given interval
 * @example
 * ["C", "D", "E"].map(Note.transposeBy("5P"));
 * // => ["G", "A", "B"]
 */
export const transposeBy = (interval: IntervalName) => (note: NoteName) =>
  transpose(note, interval);
export const trBy = transposeBy;

/**
 * Transpose from a note
 * @function
 * @param {string} note
 * @return {function}  a function that transposes the the note by an interval
 * ["1P", "3M", "5P"].map(Note.transposeFrom("C"));
 * // => ["C", "E", "G"]
 */
export const transposeFrom = (note: NoteName) => (interval: IntervalName) =>
  transpose(note, interval);
export const trFrom = transposeFrom;

/**
 * Transpose a note by a number of perfect fifths.
 *
 * @function
 * @param {string} note - the note name
 * @param {number} fifths - the number of fifths
 * @return {string} the transposed note name
 *
 * @example
 * import { transposeFifths } from "@tonaljs/note"
 * transposeFifths("G4", 1) // => "D"
 * [0, 1, 2, 3, 4].map(fifths => transposeFifths("C", fifths)) // => ["C", "G", "D", "A", "E"]
 */
export function transposeFifths(noteName: NoteName, fifths: number): NoteName {
  return transpose(noteName, [fifths, 0]);
}
export const trFifths = transposeFifths;

// TODO: documentation
export function transposeOctaves(
  noteName: NoteName,
  octaves: number,
): NoteName {
  return transpose(noteName, [0, octaves]);
}

export type NoteComparator = (a: Note, b: Note) => number;

export const ascending: NoteComparator = (a, b) => a.height - b.height;
export const descending: NoteComparator = (a, b) => b.height - a.height;

export function sortedNames(
  notes: any[],
  comparator?: NoteComparator,
): string[] {
  comparator = comparator || ascending;
  return onlyNotes(notes).sort(comparator).map(toName);
}

export function sortedUniqNames(notes: any[]): string[] {
  return sortedNames(notes, ascending).filter(
    (n, i, a) => i === 0 || n !== a[i - 1],
  );
}

/**
 * Simplify a note
 *
 * @function
 * @param {string} note - the note to be simplified
 * - sameAccType: default true. Use same kind of accidentals that source
 * @return {string} the simplified note or '' if not valid note
 * @example
 * simplify("C##") // => "D"
 * simplify("C###") // => "D#"
 * simplify("C###")
 * simplify("B#4") // => "C5"
 * // In an EDO, respell the note's exact step there:
 * simplify("C##", { edo: 19 }) // => "Db" (C## isn't D in 19-EDO)
 * simplify("E#", { edo: 19 }) // => "E#" (nor is E# F)
 * simplify("C#↑", { edo: 24 }) // => "C#↑"
 */
/** Respell in an equal division of the octave instead of 12-TET */
export interface EdoRespellOptions {
  edo: number;
}

// Flats and downs lean one way, sharps and ups the other
const leansFlat = (note: Note) =>
  note.alt < 0 || (note.alt === 0 && note.ups < 0);

// The note's exact pitch in the EDO, spelled like `edoNames`
function spellInEdo(note: Note, edo: number, accidental: EdoAccidental) {
  return fromEdoSteps(pitchEdoSteps(note, edo), edo, {
    accidental,
    pitchClass: note.oct === undefined,
  });
}

export const simplify = (
  noteName: NoteName | Pitch,
  options?: Partial<EdoRespellOptions>,
): string => {
  const note = get(noteName);
  if (note.empty) {
    return "";
  }
  // In an EDO: the simplest spelling of the same step, keeping the
  // accidental direction (simplify("C##", { edo: 19 }) => "Db")
  const edo = edoOption(options);
  if (edo !== undefined) {
    return isEdo(edo)
      ? spellInEdo(note, edo, leansFlat(note) ? "flat" : "sharp")
      : "";
  }
  // Ups and downs are kept: simplify("C##↑") => "D↑"
  return keepUps(note, (base) =>
    midiToNoteName(base.midi || base.chroma, {
      sharps: base.alt > 0,
      pitchClass: base.midi === null,
    }),
  );
};
/**
 * Get enharmonic of a note
 *
 * @function
 * @param {string} note
 * @param [string] - [optional] Destination pitch class
 * @return {string} the enharmonic note name or '' if not valid note
 * @example
 * Note.enharmonic("Db") // => "C#"
 * Note.enharmonic("C") // => "C"
 * Note.enharmonic("F2","E#") // => "E#2"
 * Note.enharmonic("C##b"); // => ""
 * // In an EDO, the other spelling of the note's exact step there:
 * Note.enharmonic("C#↑", undefined, { edo: 24 }) // => "D↓"
 * Note.enharmonic("E#4", undefined, { edo: 19 }) // => "Fb4"
 * Note.enharmonic("C#", "Db", { edo: 19 }) // => "" (not the same step)
 */
export function enharmonic(
  noteName: string,
  destName?: string,
  options?: Partial<EdoRespellOptions>,
): string {
  const src = get(noteName);
  if (src.empty) {
    return "";
  }
  const edo = edoOption(options);
  if (edo !== undefined) {
    return isEdo(edo) ? enharmonicInEdo(src, destName, edo) : "";
  }
  // Without a destination, ups and downs are kept: enharmonic("Db↓") => "C#↓"
  if (src.ups && !destName) {
    return keepUps(src, (base) => enharmonic(base.name));
  }

  // destination: use given or generate one
  const dest = get(
    destName ||
      midiToNoteName(src.midi || src.chroma, {
        sharps: src.alt < 0,
        pitchClass: true,
      }),
  );

  // ensure destination is valid
  if (dest.empty || dest.chroma !== src.chroma) {
    return "";
  }

  // if src has no octave, no need to calculate anything else
  if (src.oct === undefined) {
    return dest.pc;
  }

  // detect any octave overflow
  const srcChroma = src.chroma - src.alt;
  const destChroma = dest.chroma - dest.alt;
  const destOctOffset =
    srcChroma > 11 || destChroma < 0
      ? -1
      : srcChroma < 0 || destChroma > 11
        ? +1
        : 0;
  // calculate the new octave
  const destOct = src.oct + destOctOffset;
  return dest.pc + destOct;
}

// enharmonic() in an EDO: the other view's spelling of the same step, or
// `destName` when it is the same step (with the octave fixed accordingly)
function enharmonicInEdo(src: Note, destName: string | undefined, edo: number) {
  if (!destName) {
    return spellInEdo(src, edo, leansFlat(src) ? "sharp" : "flat");
  }
  const dest = get(destName);
  if (dest.empty) return "";
  const steps = pitchEdoSteps(src, edo);
  const destPc = props(dest.pc);
  if (pitchEdoChroma(destPc, edo) !== pitchEdoChroma(src, edo)) return "";
  if (src.oct === undefined) return dest.pc;
  const n0 = props(dest.pc + "0");
  const oct = (steps - pitchEdoSteps(n0, edo)) / edo;
  return props({ ...n0, oct }).name;
}

/** @deprecated */
export default {
  names,
  get,
  name,
  pitchClass,
  accidentals,
  octave,
  midi,
  ascending,
  descending,
  distance,
  sortedNames,
  sortedUniqNames,
  fromMidi,
  fromMidiSharps,
  freq,
  fromFreq,
  fromFreqSharps,
  chroma,
  edoSteps,
  edoChroma,
  edoFreq,
  edoNames,
  fromEdoSteps,
  transposeEdoSteps,
  transpose,
  tr,
  transposeBy,
  trBy,
  transposeFrom,
  trFrom,
  transposeFifths,
  transposeOctaves,
  trFifths,
  simplify,
  enharmonic,
};
