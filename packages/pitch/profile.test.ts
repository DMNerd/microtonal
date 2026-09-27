import { describe, expect, test } from "vitest";
import { edoChroma, edoProfile, edoSteps } from "./index";

const E = { step: 2, alt: 0 };
const M3 = { step: 2, alt: 0, oct: 0, dir: 1 as const };

describe("edoProfile", () => {
  test("classifies EDOs", () => {
    expect(edoProfile(22)).toEqual({
      edo: 22,
      fifth: 13,
      sharp: 3,
      fifthErrorCents: 7.1,
      spelling: "fifths",
    });
    const fifths = [];
    const proportional = [];
    for (let edo = 5; edo <= 72; edo++) {
      (edoProfile(edo).spelling === "fifths" ? fifths : proportional).push(edo);
    }
    expect(proportional).toEqual([
      5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 20, 21, 23, 25, 28, 30, 35,
    ]);
    expect(fifths).toContain(12);
    expect(fifths).toContain(24);
    expect(fifths).toContain(31);
  });

  test("fifths EDOs stack fifths", () => {
    expect(edoSteps(M3, 22)).toBe(8);
    expect(edoSteps({ ...M3, ups: -1 }, 22)).toBe(7);
    expect(edoSteps(M3, 12)).toBe(4);
    expect(edoSteps(M3, 24)).toBe(8);
  });

  test("proportional EDOs scale 12-TET sizes", () => {
    // 28-EDO: fifths would make the major third 8 steps, the same as the
    // minor third and the diminished fifth
    expect(edoSteps(M3, 28)).toBe(9);
    expect(edoSteps({ ...M3, alt: -1 }, 28)).toBe(7);
    expect(edoChroma(E, 28)).toBe(9);
    expect(edoChroma({ ...E, ups: 1 }, 28)).toBe(10);
    // descending mirrors ascending
    expect(edoSteps({ ...M3, dir: -1 }, 28)).toBe(-9);
    // pitch classes round like their interval above C
    expect(edoChroma({ step: 6, alt: 0 }, 7)).toBe(6);
    expect(edoSteps({ step: 2, alt: 0, oct: 4 }, 28)).toBe(4 * 28 + 9);
  });
});
