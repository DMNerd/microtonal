import { afterEach, describe, expect, test } from "vitest";
import {
  edoChroma,
  edoKey,
  edoProfile,
  edoSharp,
  edoSpelling,
  edoSteps,
  setEdoProfile,
  setEdoSpelling,
} from "./index";

const E = { step: 2, alt: 0 };
const M3 = { step: 2, alt: 0, oct: 0, dir: 1 as const };

const spelledBy = (spelling: "fifths" | "proportional") => {
  const edos = [];
  for (let edo = 5; edo <= 72; edo++) {
    if (edoProfile(edo).spelling === spelling) edos.push(edo);
  }
  return edos;
};

afterEach(() => {
  setEdoSpelling("fifths");
  for (let edo = 1; edo <= 72; edo++) setEdoProfile(edo);
});

describe("edoProfile", () => {
  test("by default every EDO is spelled by fifths, as on the wiki", () => {
    expect(edoSpelling()).toBe("fifths");
    expect(edoProfile(22)).toEqual({
      edo: 22,
      fifth: 13,
      sharp: 3,
      fifthErrorCents: 7.1,
      spelling: "fifths",
    });
    // 6- and 8-EDO are written as subsets of 12- and 24-EDO
    expect(spelledBy("proportional")).toEqual([6, 8]);
  });

  test("the minor second never descends", () => {
    // 13- and 18-EDO's best fifths make it descend: the narrower one is used
    expect(edoProfile(13).fifth).toBe(7);
    expect(edoProfile(18).fifth).toBe(10);
    expect(edoProfile(31).fifth).toBe(18);
  });

  test("sharps can be zero or negative", () => {
    expect(edoSharp(28)).toBe(0);
    expect(edoSharp(16)).toBe(-1);
    // 28-EDO: a sharp doesn't move the pitch, ups do
    expect(edoChroma(E, 28)).toBe(8);
    expect(edoChroma({ ...E, alt: -1 }, 28)).toBe(8);
    expect(edoChroma({ ...E, ups: 1 }, 28)).toBe(9);
  });

  test("fifths EDOs stack fifths", () => {
    expect(edoSteps(M3, 22)).toBe(8);
    expect(edoSteps({ ...M3, ups: -1 }, 22)).toBe(7);
    expect(edoSteps(M3, 12)).toBe(4);
    expect(edoSteps(M3, 24)).toBe(8);
  });
});

describe("setEdoSpelling", () => {
  test("proportional-fallback keeps fifths for EDOs with good fifths", () => {
    setEdoSpelling("proportional-fallback");
    expect(edoSpelling()).toBe("proportional-fallback");
    expect(spelledBy("proportional")).toEqual([
      5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 20, 21, 23, 25, 28, 30, 35,
    ]);
    expect(edoProfile(22).spelling).toBe("fifths");
  });

  test("proportional EDOs scale 12-TET sizes", () => {
    setEdoSpelling("proportional-fallback");
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

  test("ignores unknown values", () => {
    setEdoSpelling("other" as never);
    expect(edoSpelling()).toBe("fifths");
  });
});

describe("setEdoProfile", () => {
  test("overrides one EDO, whatever the global spelling", () => {
    setEdoProfile(28, { spelling: "proportional" });
    expect(edoProfile(28).spelling).toBe("proportional");
    expect(edoProfile(14).spelling).toBe("fifths");
    setEdoSpelling("proportional-fallback");
    setEdoProfile(14, { spelling: "fifths" });
    expect(edoProfile(14).spelling).toBe("fifths");
    expect(edoProfile(21).spelling).toBe("proportional");
  });

  test("picks the fifth", () => {
    // 57-EDO is written by either of two fifths on the wiki
    expect(edoProfile(57).fifth).toBe(33);
    setEdoProfile(57, { fifth: 34 });
    expect(edoProfile(57)).toMatchObject({ fifth: 34, sharp: 10 });
    expect(edoSteps(M3, 57)).toBe(4 * 34 - 2 * 57);
  });

  test("without options removes the override", () => {
    setEdoProfile(28, { spelling: "proportional" });
    setEdoProfile(28);
    expect(edoProfile(28).spelling).toBe("fifths");
  });

  test("ignores invalid fifths and EDOs", () => {
    setEdoProfile(31, { fifth: 40 });
    expect(edoProfile(31).fifth).toBe(18);
    setEdoProfile(0, { spelling: "proportional" });
    expect(edoProfile(12).spelling).toBe("fifths");
  });

  test("edoKey changes with the profile", () => {
    const before = edoKey(28);
    setEdoProfile(28, { spelling: "proportional" });
    expect(edoKey(28)).not.toBe(before);
    expect(edoKey(31)).toBe("31/fifths");
  });
});
