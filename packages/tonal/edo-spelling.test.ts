import { afterEach, describe, expect, test } from "vitest";
import { Chord, ChordType, Note, Pcset } from "./index";
import { setEdoProfile, setEdoSpelling } from "@tonaljs/pitch";
import { edoIntervalNames } from "@tonaljs/pitch-interval";

afterEach(() => {
  setEdoSpelling("fifths");
  setEdoProfile(28);
});

const major28 = () =>
  ChordType.forEdo(28).find((t) => t.name === "major")?.chroma;

describe("EDO spelling settings reach every cache", () => {
  test("global setting", () => {
    // 28-EDO by fifths: a sharp is 0 steps, so major and minor triads match
    const byFifths = {
      major: major28(),
      names: Note.edoNames(28, "sharp").slice(0, 4),
      intervals: edoIntervalNames(28).slice(0, 4),
      pcset: Pcset.get(["C", "E", "G"], { edo: 28 }).chroma,
    };
    expect(Pcset.get(["C", "Eb", "G"], { edo: 28 }).chroma).toBe(
      byFifths.pcset,
    );
    setEdoSpelling("proportional-fallback");
    expect(major28()).not.toBe(byFifths.major);
    expect(Note.edoNames(28, "sharp").slice(0, 4)).not.toEqual(byFifths.names);
    expect(edoIntervalNames(28).slice(0, 4)).not.toEqual(byFifths.intervals);
    expect(Pcset.get(["C", "E", "G"], { edo: 28 }).chroma).not.toBe(
      byFifths.pcset,
    );
    expect(Chord.detect(["C", "E", "G"], { edo: 28 })[0]).toBe("CM");
    setEdoSpelling("fifths");
    expect(major28()).toBe(byFifths.major);
  });

  test("per-EDO override", () => {
    const byFifths = major28();
    setEdoProfile(28, { spelling: "proportional" });
    expect(major28()).not.toBe(byFifths);
    setEdoProfile(28);
    expect(major28()).toBe(byFifths);
  });
});
