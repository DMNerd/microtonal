import { describe, expect, test } from "vitest";
import Note from "./index";

describe("note ups and downs", () => {
  test("edoSteps and edoChroma", () => {
    expect(Note.edoSteps("E4", 24)).toBe(104);
    expect(Note.edoSteps("↓E", 24)).toBe(7);
    expect(Note.edoSteps("A4")).toBe(Note.get("A4").height - 12);
    expect(Note.edoChroma("↓E", 24)).toBe(7);
    expect(Note.edoChroma("F#", 19)).toBe(9);
    expect(Note.edoChroma("Gb", 19)).toBe(10);
    expect(Note.edoChroma("↓C", 24)).toBe(23);
    expect(Note.edoChroma("nope", 24)).toBeNaN();
  });

  test("transpose keeps ups", () => {
    expect(Note.transpose("↓E4", "5P")).toBe("↓B4");
    expect(Note.transposeFifths("↑C", 2)).toBe("↑D");
    expect(Note.transposeOctaves("↑C4", 1)).toBe("↑C5");
  });

  test("simplify and enharmonic keep ups", () => {
    expect(Note.simplify("↑C##")).toBe("↑D");
    expect(Note.simplify("↓B#4")).toBe("↓C5");
    expect(Note.enharmonic("↓Db")).toBe("↓C#");
    expect(Note.simplify("C##")).toBe("D");
    expect(Note.enharmonic("Db")).toBe("C#");
  });
});

describe("notes in other EDOs", () => {
  test("edoFreq", () => {
    expect(Note.edoFreq("A4", 24)).toBe(440);
    expect(Note.edoFreq("↑A4", 24)).toBeCloseTo(440 * 2 ** (1 / 24));
    expect(Note.edoFreq("A5", 31)).toBeCloseTo(880);
    expect(Note.edoFreq("C4", 12)).toBeCloseTo(Note.freq("C4") as number);
    expect(Note.edoFreq("C4", 19, { refNote: "C4", refFreq: 256 })).toBe(256);
    expect(Note.edoFreq("C", 24)).toBeNull();
    expect(Note.edoFreq("nope", 24)).toBeNull();
  });

  test("fromEdoSteps", () => {
    expect(Note.fromEdoSteps(104, 24)).toBe("E4");
    expect(Note.fromEdoSteps(103, 24)).toBe("↓E4");
    expect(Note.fromEdoSteps(7, 24, { pitchClass: true })).toBe("↓E");
    expect(Note.fromEdoSteps(-1, 24)).toBe("↑B-1");
    expect(Note.fromEdoSteps(61, 12)).toBe(Note.fromMidi(73));
    // 19-EDO: step 18 is B# and not C
    expect(Note.fromEdoSteps(18, 19)).toBe("B#0");
    expect(Note.fromEdoSteps(1.5, 24)).toBe("");
    for (const edo of [12, 17, 19, 22, 24, 31, 53]) {
      for (let s = -edo; s < 2 * edo; s++) {
        expect(Note.edoSteps(Note.fromEdoSteps(s, edo), edo)).toBe(s);
      }
    }
  });
});
