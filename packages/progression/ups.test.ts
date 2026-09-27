import { describe, expect, test } from "vitest";
import Progression from "./index";

describe("progressions with ups and downs", () => {
  test("toRomanNumerals", () => {
    expect(Progression.toRomanNumerals("C", ["E↓m", "G7"])).toEqual([
      "↓IIIm",
      "V7",
    ]);
  });

  test("fromRomanNumerals", () => {
    expect(Progression.fromRomanNumerals("C", ["↓III", "↑bVII7"])).toEqual([
      "E↓",
      "Bb↑7",
    ]);
  });
});
