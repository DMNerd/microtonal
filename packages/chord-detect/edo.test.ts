import { describe, expect, test } from "vitest";
import { detect } from "./index";

const Q24 = { edo: 24 };

describe("detect in other EDOs", () => {
  test("12-EDO is the default", () => {
    expect(detect(["C", "E", "G"])).toEqual(
      detect(["C", "E", "G"], { edo: 12 }),
    );
    // without an edo, an up is a semitone: C ↓E G is C minor
    expect(detect(["C", "↓E", "G"])).toEqual(["Cm"]);
  });

  test("traditional chords in 24-EDO", () => {
    expect(detect(["C", "E", "G"], Q24)).toContain("CM");
    expect(detect(["D", "F#", "A", "C"], Q24)).toEqual(["D7"]);
  });

  test("microtonal chords in 24-EDO", () => {
    // a sharp is two steps, so the downmajor third is the mid third
    expect(detect(["C", "↓E", "G"], Q24)).toEqual(["C~"]);
    // the same pitch classes spelled as an upminor
    expect(detect(["C", "↑Eb", "G"], Q24)).toEqual(["C~"]);
    expect(detect(["C", "↑E", "G"], Q24)).toEqual(["C↑"]);
    expect(detect(["C", "↓Eb", "G"], Q24)).toEqual(["C↓m"]);
    expect(detect(["C", "↓E", "G", "Bb"], Q24)).toEqual(["C~,7"]);
    expect(detect(["C", "↓D", "G"], Q24)).toEqual(["C↓sus2"]);
  });

  test("inversions in 24-EDO", () => {
    expect(detect(["↓E", "G", "C"], Q24)).toEqual(["C~/↓E"]);
  });

  test("no microtonal names where an up is a sharp", () => {
    // 19-EDO: ↓E is Eb (an up is one step, like a sharp)
    expect(detect(["C", "↓E", "G"], { edo: 19 })).toContain("Cm");
    expect(detect(["C", "E", "G"], { edo: 19 })).toContain("CM");
  });

  test("31-EDO", () => {
    expect(detect(["C", "E", "G"], { edo: 31 })).toContain("CM");
    expect(detect(["C", "↓E", "G"], { edo: 31 })).toEqual(["C~"]);
    // a sharp is four steps: the mid third is two steps down
    expect(detect(["C", "↓E", "G"], { edo: 41 })).toEqual(["C↓"]);
    expect(detect(["C", "↓↓E", "G"], { edo: 41 })).toEqual(["C~"]);
  });

  test("7-limit chords", () => {
    // 4:5:6:7, the harmonic seventh
    expect(detect(["C", "E", "G", "↓Bb"], Q24)[0]).toBe("C,↓7");
    expect(detect(["C", "E", "G", "↓Bb"], { edo: 31 })[0]).toBe("C,↓7");
    expect(detect(["C", "↓E", "G", "↓Bb"], { edo: 53 })[0]).toBe("C↓7");
    // where no other chord has its notes, 4:5:6:7 is har7
    expect(detect(["C", "E", "G", "Bbb"], { edo: 19 })[0]).toBe("Char7");
    expect(detect(["C", "↓E", "G", "↓↓Bb"], { edo: 72 })[0]).toBe("Char7");
    // 12:14:18:21, the subminor seventh
    expect(detect(["C", "↓Eb", "G", "↓Bb"], { edo: 31 })[0]).toBe("C↓m7");
  });

  test("assumePerfectFifth in 24-EDO", () => {
    expect(
      detect(["C", "E", "B"], { ...Q24, assumePerfectFifth: true }),
    ).toContain("Cmaj7");
    expect(detect(["C", "E", "B"], Q24)).not.toContain("Cmaj7");
  });

  test("an invalid edo detects nothing", () => {
    for (const edo of [0, -5, 2.5, NaN, Infinity]) {
      expect(detect(["C", "E", "G"], { edo })).toEqual([]);
    }
    expect(detect(["C", "E", "G"], {})).toEqual(detect(["C", "E", "G"]));
  });
});
