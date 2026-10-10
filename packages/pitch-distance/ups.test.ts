import { describe, expect, test } from "vitest";
import { distance, transpose } from "./index";

describe("transpose and distance with ups and downs", () => {
  test("transpose", () => {
    expect(transpose("C4", "↓3M")).toBe("↓E4");
    expect(transpose("↑C4", "5P")).toBe("↑G4");
    expect(transpose("↑C", "↓5")).toBe("G");
    expect(transpose("C4", "-↑3M")).toBe("↓Ab3");
    expect(transpose("C4", [1, 0])).toBe("G4");
  });

  test("distance", () => {
    expect(distance("C4", "↓E4")).toBe("↓3M");
    expect(distance("↑C", "G")).toBe("↓5");
    expect(distance("C4", "↓Ab3")).toBe("-↑3M");
    expect(distance("C4", "↓C4")).toBe("↓1");
  });

  test("transpose undoes distance", () => {
    const pairs = [
      ["C4", "↓E4"],
      ["↑D3", "↓↓Bb4"],
      ["↓F#", "↑C"],
      ["G4", "↑Eb2"],
    ];
    for (const [from, to] of pairs) {
      expect(transpose(from, distance(from, to))).toBe(to);
    }
  });

  test("in an EDO where a sharp is 0 steps, no sharps or flats", () => {
    expect(transpose("D", "3M", 14)).toBe("F");
    expect(transpose("D", "3M")).toBe("F#");
  });

  test("a mid needs an EDO", () => {
    expect(transpose("C", "3~", 24)).toBe("↓E");
    expect(transpose("C", "↓3~", 53)).toBe("↑↑Eb");
    expect(transpose("C", "3~")).toBe("");
  });
});
