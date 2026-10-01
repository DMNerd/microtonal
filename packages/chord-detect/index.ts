import { all, ChordType, forEdo, tier } from "@tonaljs/chord-type";
import { get as pcset, modes } from "@tonaljs/pcset";
import { edoChroma, edoKey, edoOption, isEdo } from "@tonaljs/pitch";
import { interval } from "@tonaljs/pitch-interval";
import { note } from "@tonaljs/pitch-note";

interface FoundChord {
  readonly weight: number;
  readonly name: string;
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

  edo: number;
};

/**
 * Find the chord names that match a list of notes (the first is the bass)
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

interface FifthRules {
  fifth: number;
  thirds: number[];
  nonPerfectFifths: number[];
  sevenths: number[];
}

const rulesCache: Record<string, FifthRules> = {};

function fifthRules(edo: number): FifthRules {
  const key = edoKey(edo);
  if (rulesCache[key]) return rulesCache[key];
  const at = (name: string) => edoChroma(interval(name), edo);
  const between = (from: number, to: number) => {
    const steps = [];
    for (let s = from + 1; s < to; s++) steps.push(s);
    return steps;
  };
  const fifth = at("5P");
  return (rulesCache[key] = {
    fifth,
    thirds: between(at("2M"), at("4P")),
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
  const edo = edoOption(options) ?? 12;
  if (!isEdo(edo)) return [];
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
