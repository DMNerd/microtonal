import { describe, expect, test } from "vitest";
import Progression from "./index";

describe("progressions with ups and downs", () => {
  test("toRomanNumerals", () => {
    expect(Progression.toRomanNumerals("C", ["↓Em", "G7"])).toEqual([
      "↓IIIm",
      "V7",
    ]);
  });

  test("fromRomanNumerals", () => {
    expect(Progression.fromRomanNumerals("C", ["↓III", "↑bVII7"])).toEqual([
      "↓E",
      "↑Bb7",
    ]);
  });

  test("Kite's progression example", () => {
    // "Cv - Gv - vA^m - F or Iv - Vv - vVI^m - IVv"
    const romans = ["Iv", "Vv", "vVI^m", "IVv"];
    expect(Progression.fromRomanNumerals("C", romans)).toEqual([
      "C↓",
      "G↓",
      "↓A↑m",
      "F↓",
    ]);
    expect(
      Progression.toRomanNumerals("C", ["Cv", "Gv", "vA^m", "Fv"]),
    ).toEqual(["I↓", "V↓", "↓VI↑m", "IV↓"]);
  });
});
