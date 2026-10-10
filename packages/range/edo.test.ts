import { describe, expect, test } from "vitest";
import Range from "./index";

describe("chromatic in an EDO", () => {
  test("24-EDO quarter tones", () => {
    expect(Range.chromatic(["C4", "D4"], { edo: 24 })).toEqual([
      "C4",
      "↑C4",
      "Db4",
      "↓D4",
      "D4",
    ]);
    expect(Range.chromatic(["C4", "D4"], { edo: 24, sharps: true })).toEqual([
      "C4",
      "↑C4",
      "C#4",
      "↓D4",
      "D4",
    ]);
  });

  test("descending, several notes and pitch classes", () => {
    expect(Range.chromatic(["E4", "D4"], { edo: 19, sharps: true })).toEqual([
      "E4",
      "Eb4",
      "D#4",
      "D4",
    ]);
    expect(
      Range.chromatic(["C4", "D4", "C#4"], {
        edo: 19,
        sharps: true,
        pitchClass: true,
      }),
    ).toEqual(["C", "C#", "Db", "D", "Db", "C#"]);
  });

  test("numbers are EDO steps", () => {
    expect(Range.chromatic([96, 98], { edo: 24, sharps: true })).toEqual([
      "C4",
      "↑C4",
      "C#4",
    ]);
  });

  test("12-EDO matches the midi-based range", () => {
    expect(Range.chromatic(["A3", "C#5"], { edo: 12 })).toEqual(
      Range.chromatic(["A3", "C#5"]),
    );
    expect(Range.chromatic(["A3", "C#5"], { edo: 12, sharps: true })).toEqual(
      Range.chromatic(["A3", "C#5"], { sharps: true }),
    );
  });

  test("invalid notes give an empty range", () => {
    expect(Range.chromatic(["C4", "nope"], { edo: 24 })).toEqual([]);
  });
});
