import { describe, expect, test } from "vitest";
import RomanNumeral from "./index";

describe("roman numerals with ups and downs", () => {
  test("parse", () => {
    const rn = RomanNumeral.get("↓III");
    expect(rn.name).toBe("↓III");
    expect(rn.ups).toBe(-1);
    expect(rn.interval).toBe("↓3M");
    expect(RomanNumeral.get("^bVII7").name).toBe("↑bVII7");
    expect(RomanNumeral.get("^bVII7").chordType).toBe("7");
    // "v" is a numeral, not a down
    expect(RomanNumeral.get("vii").step).toBe(6);
    expect(RomanNumeral.get("vii").ups).toBe(0);
  });

  test("from pitches and intervals", () => {
    expect(
      RomanNumeral.get({ step: 2, alt: 0, oct: 0, dir: 1, ups: -1 }).name,
    ).toBe("↓III");
  });
});
