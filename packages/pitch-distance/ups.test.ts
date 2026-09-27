import { describe, expect, test } from "vitest";
import { distance, transpose } from "./index";

describe("transpose and distance with ups and downs", () => {
  test("transpose", () => {
    expect(transpose("C4", "↓3M")).toBe("E↓4");
    expect(transpose("C↑4", "5P")).toBe("G↑4");
    expect(transpose("C↑", "↓5P")).toBe("G");
    expect(transpose("C4", "-↑3M")).toBe("Ab↓3");
    expect(transpose("C4", [1, 0])).toBe("G4");
  });

  test("distance", () => {
    expect(distance("C4", "E↓4")).toBe("↓3M");
    expect(distance("C↑", "G")).toBe("↓5P");
    expect(distance("C4", "Ab↓3")).toBe("-↑3M");
    expect(distance("C4", "C↓4")).toBe("↓1P");
  });

  test("transpose undoes distance", () => {
    const pairs = [
      ["C4", "E↓4"],
      ["D↑3", "Bb↓↓4"],
      ["F#↓", "C↑"],
      ["G4", "Eb↑2"],
    ];
    for (const [from, to] of pairs) {
      expect(transpose(from, distance(from, to))).toBe(to);
    }
  });
});
