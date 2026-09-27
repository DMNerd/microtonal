import { all, ChordType, forEdo, tier } from "@tonaljs/chord-type";
import { get as pcset, modes } from "@tonaljs/pcset";
import { edoChroma } from "@tonaljs/pitch";
import { interval } from "@tonaljs/pitch-interval";
import { note } from "@tonaljs/pitch-note";

interface FoundChord {
  readonly weight: number;
  readonly name: string;
  // lower is better: the chord type tier, plus 0.5 for inversions
  readonly rank: number;
}

const namedSet = (notes: string[], edo: number) => {
  const pcToName = notes.reduce<Record<number, string>>((record, n) => {
    const chroma = edoChroma(note(n), edo);
    if (chroma !== undefined) {
      record[chroma] = record[chroma] || note(n).name;
    }
    return record;
  }, {});

  return (chroma: number) => pcToName[chroma];
};

type DetectOptions = {
  assumePerfectFifth: boolean;
  /**
   * Number of equal divisions of the octave (12 by default). In other EDOs
   * the notes are compared as pitch classes of that EDO, and the chord types
   * come from `ChordType.forEdo(edo)` (including microtonal chords where they
   * make sense).
   */
  edo: number;
};

/**
 * Find the chord names that match a list of notes.
 * The first note is taken as the bass: chords rooted elsewhere are returned
 * as slash chords.
 *
 * Results are ranked by how common the chord type is (see `ChordType.tier`),
 * with half a tier of penalty for inversions. So an inversion of a common
 * chord comes before a rare chord in root position: E C G is "CM/E" before
 * "Em#5". (Upstream Tonal puts every root position chord first.)
 *
 * @example
 * detect(["D", "F#", "A", "C"]) // => ["D7"]
 * detect(["C", "E↓", "G"], { edo: 24 }) // => ["C(↓3)"]
 */
export function detect(
  source: string[],
  options: Partial<DetectOptions> = {},
): string[] {
  const notes = source.map((n) => note(n).pc).filter((x) => x);
  if (note.length === 0) {
    return [];
  }

  const found: FoundChord[] = findMatches(notes, 1, options);

  return found
    .filter((chord) => chord.weight)
    .sort((a, b) => a.rank - b.rank)
    .map((chord) => chord.name);
}

// Steps (in an EDO) of the degrees looked at by `assumePerfectFifth`.
// In 12-EDO: thirds 3 and 4, fifth 7, other fifths 6 and 8, sevenths 10 and 11
interface FifthRules {
  fifth: number;
  thirds: number[];
  nonPerfectFifths: number[];
  sevenths: number[];
}

const rulesCache: Record<number, FifthRules> = {};

function fifthRules(edo: number): FifthRules {
  if (rulesCache[edo]) return rulesCache[edo];
  const at = (name: string) => edoChroma(interval(name), edo);
  const between = (from: number, to: number) => {
    const steps = [];
    for (let s = from + 1; s < to; s++) steps.push(s);
    return steps;
  };
  const fifth = at("5P");
  return (rulesCache[edo] = {
    fifth,
    thirds: between(at("2M"), at("4P")),
    // anything from just above the fourth up to the minor sixth
    nonPerfectFifths: between(at("4P"), at("6m") + 1).filter(
      (s) => s !== fifth,
    ),
    sevenths: between(at("6M"), edo),
  });
}

const hasAny = (chroma: string, steps: number[]) =>
  steps.some((s) => chroma[s] === "1");

function hasAnyThirdAndPerfectFifthAndAnySeventh(
  chordType: ChordType,
  rules: FifthRules,
) {
  const chroma = chordType.chroma;
  return (
    hasAny(chroma, rules.thirds) &&
    chroma[rules.fifth] === "1" &&
    hasAny(chroma, rules.sevenths)
  );
}

function withPerfectFifth(chroma: string, rules: FifthRules): string {
  return hasAny(chroma, rules.nonPerfectFifths)
    ? chroma
    : chroma.slice(0, rules.fifth) + "1" + chroma.slice(rules.fifth + 1);
}

function findMatches(
  notes: string[],
  weight: number,
  options: Partial<DetectOptions>,
): FoundChord[] {
  const edo =
    Number.isInteger(options.edo) && (options.edo as number) > 0
      ? (options.edo as number)
      : 12;
  const rules = fifthRules(edo);
  const chordTypes = edo === 12 ? all() : forEdo(edo);
  const tonic = notes[0];
  const tonicChroma = edoChroma(note(tonic), edo);
  const noteName = namedSet(notes, edo);
  // we need to test all chromas to get the correct baseNote
  const allModes = modes(pcset(notes, { edo }), false);

  const found: FoundChord[] = [];
  allModes.forEach((mode, index) => {
    const modeWithPerfectFifth =
      options.assumePerfectFifth && withPerfectFifth(mode, rules);
    // some chords could have the same chroma but different interval spelling
    const matches = chordTypes.filter((chordType) => {
      if (
        options.assumePerfectFifth &&
        hasAnyThirdAndPerfectFifthAndAnySeventh(chordType, rules)
      ) {
        return chordType.chroma === modeWithPerfectFifth;
      }
      return chordType.chroma === mode;
    });

    matches.forEach((chordType) => {
      const chordName = chordType.aliases[0];
      const baseNote = noteName(index);
      const isInversion = index !== tonicChroma;
      const typeTier = tier(chordType);
      if (isInversion) {
        found.push({
          weight: 0.5 * weight,
          name: `${baseNote}${chordName}/${tonic}`,
          rank: typeTier + 0.5,
        });
      } else {
        found.push({
          weight: 1 * weight,
          name: `${baseNote}${chordName}`,
          rank: typeTier,
        });
      }
    });
  });

  return found;
}

/** @deprecated */
export default { detect };
