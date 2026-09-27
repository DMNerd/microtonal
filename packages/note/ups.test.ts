import { describe, expect, test } from "vitest";
import Note from "./index";

describe("note ups and downs", () => {
  test("edoSteps and edoChroma", () => {
    expect(Note.edoSteps("E4", 24)).toBe(104);
    expect(Note.edoSteps("E↓", 24)).toBe(7);
    expect(Note.edoSteps("A4")).toBe(Note.get("A4").height - 12);
    expect(Note.edoChroma("E↓", 24)).toBe(7);
    expect(Note.edoChroma("F#", 19)).toBe(9);
    expect(Note.edoChroma("Gb", 19)).toBe(10);
    expect(Note.edoChroma("C↓", 24)).toBe(23);
    expect(Note.edoChroma("nope", 24)).toBeNaN();
  });

  test("transpose keeps ups", () => {
    expect(Note.transpose("E↓4", "5P")).toBe("B↓4");
    expect(Note.transposeFifths("C↑", 2)).toBe("D↑");
    expect(Note.transposeOctaves("C↑4", 1)).toBe("C↑5");
  });

  test("simplify and enharmonic keep ups", () => {
    expect(Note.simplify("C##↑")).toBe("D↑");
    expect(Note.simplify("B#↓4")).toBe("C↓5");
    expect(Note.enharmonic("Db↓")).toBe("C#↓");
    expect(Note.simplify("C##")).toBe("D");
    expect(Note.enharmonic("Db")).toBe("C#");
  });
});
