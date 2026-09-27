import { compact, range } from "@tonaljs/collection";
import { midiToNoteName, toMidi, ToNoteNameOptions } from "@tonaljs/midi";
import { edoSteps, fromEdoSteps } from "@tonaljs/note";

/**
 * Create a numeric range. You supply a list of notes or numbers and it will
 * be connected to create complex ranges.
 *
 * @param {Array} notes - the list of notes or midi numbers used
 * @return {Array} an array of numbers or empty array if not valid parameters
 *
 * @example
 * numeric(["C5", "C4"]) // => [ 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60 ]
 * // it works midi notes
 * numeric([10, 5]) // => [ 10, 9, 8, 7, 6, 5 ]
 * // complex range
 * numeric(["C4", "E4", "Bb3"]) // => [60, 61, 62, 63, 64, 63, 62, 61, 60, 59, 58]
 */
export function numeric(notes: (string | number)[]): number[] {
  return fillRanges(notes, (note) =>
    typeof note === "number" ? note : toMidi(note),
  );
}

// Every number from each value to the next (both included); [] if any note
// is invalid
function fillRanges(
  notes: (string | number)[],
  toNumber: (note: string | number) => number | null | undefined,
): number[] {
  const values: number[] = compact(
    notes.map((note) => {
      const value = toNumber(note);
      return Number.isFinite(value) ? value : null;
    }),
  );
  if (!notes.length || values.length !== notes.length) {
    // there is no valid notes
    return [];
  }

  return values.reduce(
    (result, note) => {
      const last: number = result[result.length - 1];
      return result.concat(range(last, note).slice(1));
    },
    [values[0]],
  );
}

export interface ChromaticOptions extends ToNoteNameOptions {
  /**
   * Count in steps of an equal division of the octave instead of semitones.
   * Numbers are then EDO steps (C0 = 0), and notes are spelled like
   * `Note.edoNames` (with sharps and ups when `sharps` is true).
   */
  edo: number;
}

/**
 * Create a range of chromatic notes. The altered notes will use flats.
 *
 * @function
 * @param {Array} notes - the list of notes or midi note numbers to create a range from
 * @param {Object} options - The same as `midiToNoteName` (`{ sharps: boolean, pitchClass: boolean }`)
 * @return {Array} an array of note names
 *
 * @example
 * Range.chromatic(["C2, "E2", "D2"]) // => ["C2", "Db2", "D2", "Eb2", "E2", "Eb2", "D2"]
 * // with sharps
 * Range.chromatic(["C2", "C3"], { sharps: true }) // => [ "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2", "C3" ]
 */
export function chromatic(
  notes: (string | number)[],
  options?: Partial<ChromaticOptions>,
): string[] {
  const edo = options?.edo;
  if (typeof edo === "number" && Number.isInteger(edo) && edo > 0) {
    const accidental = options?.sharps ? "sharp" : "flat";
    return fillRanges(notes, (note) =>
      typeof note === "number" ? note : edoSteps(note, edo),
    ).map((steps) =>
      fromEdoSteps(steps, edo, {
        accidental,
        pitchClass: options?.pitchClass,
      }),
    );
  }
  return numeric(notes).map((midi) => midiToNoteName(midi, options));
}

/** @deprecated */
export default { numeric, chromatic };
