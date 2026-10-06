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
    expect(RomanNumeral.get("v").step).toBe(4);
  });

  test("Kite's ASCII down before an upper case numeral", () => {
    expect(RomanNumeral.get("vVI").name).toBe("↓VI");
    expect(RomanNumeral.get("vvbVII").ups).toBe(-2);
    expect(RomanNumeral.get("vV").step).toBe(4);
    // a chord type after the numeral may start with "v" (I downmajor)
    expect(RomanNumeral.get("Iv").chordType).toBe("v");
    expect(RomanNumeral.get("IVv").roman).toBe("IV");
  });

  test("from pitches and intervals", () => {
    expect(
      RomanNumeral.get({ step: 2, alt: 0, oct: 0, dir: 1, ups: -1 }).name,
    ).toBe("↓III");
  });
});
