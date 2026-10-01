import { describe, expect, test } from "vitest";
import {
  Chord,
  ChordType,
  Interval,
  Note,
  Pcset,
  Range,
  Scale,
  ScaleType,
} from "./index";
import { edoFifth, edoOption, edoSteps, isEdo } from "@tonaljs/pitch";
import { edoIntervalNames } from "@tonaljs/pitch-interval";

const INVALID = [0, -5, 2.5, NaN, Infinity, "24" as unknown as number];

describe("invalid EDOs give empty results", () => {
  test("isEdo and edoOption", () => {
    expect([1, 12, 31, 72].every(isEdo)).toBe(true);
    expect(INVALID.some(isEdo)).toBe(false);
    expect(edoOption({ edo: 24 })).toBe(24);
    expect(edoOption({})).toBeUndefined();
    expect(edoOption(3)).toBeUndefined(); // a map callback index
    expect(edoOption({ edo: 0 })).toBeNaN();
  });

  test.each(INVALID)("edo %s", (edo) => {
    expect(edoFifth(edo)).toBeNaN();
    expect(edoSteps({ step: 2, alt: 0 }, edo)).toBeNaN();
    expect(edoIntervalNames(edo)).toEqual([]);
    expect(Note.edoSteps("E4", edo)).toBeNaN();
    expect(Note.edoChroma("E", edo)).toBeNaN();
    expect(Note.edoFreq("A4", edo)).toBeNull();
    expect(Note.edoNames(edo, "sharp")).toEqual([]);
    expect(Note.fromEdoSteps(7, edo)).toBe("");
    expect(Note.simplify("C##", { edo })).toBe("");
    expect(Note.enharmonic("C#", undefined, { edo })).toBe("");
    expect(Interval.edoSteps("3M", edo)).toBeNaN();
    expect(Interval.fromEdoSteps(7, edo)).toBe("");
    expect(Note.transposeEdoSteps("C4", 1, edo)).toBe("");
    expect(Pcset.get(["C", "E"], { edo }).empty).toBe(true);
    expect(ChordType.forEdo(edo)).toEqual([]);
    expect(ScaleType.forEdo(edo)).toEqual([]);
    expect(Chord.detect(["C", "E", "G"], { edo })).toEqual([]);
    expect(Scale.detect(["C", "D", "E"], { edo })).toEqual([]);
    expect(Scale.scaleChords("major", { edo })).toEqual([]);
    expect(Scale.rangeOf("C major", { edo })("C4", "C5")).toEqual([]);
    expect(Range.chromatic(["C4", "D4"], { edo })).toEqual([]);
  });

  test("no edo option still means 12", () => {
    expect(Chord.detect(["C", "E", "G"], {})).toEqual(
      Chord.detect(["C", "E", "G"]),
    );
    expect(Note.simplify("C##")).toBe("D");
    expect(Range.chromatic(["C4", "D4"], {})).toEqual(["C4", "Db4", "D4"]);
  });
});
