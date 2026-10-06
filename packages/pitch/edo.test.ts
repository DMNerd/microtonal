import { describe, expect, test } from "vitest";
import { edoChroma, edoFifth, edoSharp, edoSteps } from "./index";

describe("edo", () => {
  test("patent fifth and sharp sizes", () => {
    expect([12, 17, 19, 22, 24, 31, 53].map(edoFifth)).toEqual([
      7, 10, 11, 13, 14, 18, 31,
    ]);
    expect([12, 17, 19, 22, 24, 31, 53].map(edoSharp)).toEqual([
      1, 2, 1, 3, 2, 2, 5,
    ]);
  });

  test("12-EDO matches semitones", () => {
    // E4
    expect(edoSteps({ step: 2, alt: 0, oct: 4 })).toBe(52);
    // Bb (pitch class)
    expect(edoChroma({ step: 6, alt: -1 })).toBe(10);
    // descending major third
    expect(edoSteps({ step: 2, alt: 0, oct: 0, dir: -1 })).toBe(-4);
  });

  test("steps in other EDOs", () => {
    const e = { step: 2, alt: 0 };
    const cSharp = { step: 0, alt: 1 };
    expect(edoChroma(e, 24)).toBe(8);
    expect(edoChroma(e, 19)).toBe(6);
    expect(edoChroma(e, 31)).toBe(10);
    expect(edoChroma(cSharp, 24)).toBe(2);
    expect(edoChroma(cSharp, 31)).toBe(2);
    expect(edoSteps({ step: 0, alt: 0, oct: 4 }, 24)).toBe(96);
  });

  test("ups and downs add single steps", () => {
    expect(edoChroma({ step: 2, alt: 0, ups: -1 }, 24)).toBe(7);
    expect(edoChroma({ step: 0, alt: 0, ups: -1 }, 24)).toBe(23);
    // descending up-major-third: -(8 + 1) in 24-EDO
    expect(edoSteps({ step: 2, alt: 0, oct: 0, dir: -1, ups: 1 }, 24)).toBe(-9);
  });

  test("a mid is half a sharp off a quality", () => {
    // mid 3rd: 7 steps in 24-EDO, 12 in 41-EDO, none where a sharp is odd
    expect(edoSteps({ step: 2, alt: -0.5, oct: 0, dir: 1 }, 24)).toBe(7);
    expect(edoSteps({ step: 2, alt: -0.5, oct: 0, dir: 1 }, 41)).toBe(12);
    expect(edoSteps({ step: 2, alt: -0.5, oct: 0, dir: 1 }, 22)).toBeNaN();
  });
});
