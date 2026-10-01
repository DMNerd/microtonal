import { describe, expect, test } from "vitest";
import ChordType from "./index";

describe("chords from ratios", () => {
  test("are built in each EDO from the nearest steps", () => {
    expect(ChordType.get("har7", { edo: 72 }).intervals).toEqual(
      "1P ↓3M 5P ↓↓7m".split(" "),
    );
    expect(ChordType.get("harmonic seventh", { edo: 41 }).intervals).toEqual(
      "1P ↓3M 5P ↓7m".split(" "),
    );
    expect(ChordType.get("sub7", { edo: 31 }).intervals).toEqual(
      "1P ↓3m 4A ↓7m".split(" "),
    );
    expect(ChordType.get("har9", { edo: 31 }).intervals).toHaveLength(5);
  });

  test("need an EDO other than 12", () => {
    expect(ChordType.get("har7").empty).toBe(true);
    expect(ChordType.get("har7", { edo: 12 }).empty).toBe(true);
    // "h7" stays upstream's half-diminished
    expect(ChordType.get("h7", { edo: 19 }).name).toBe("half-diminished");
    expect(ChordType.forEdo(12)).toHaveLength(ChordType.all().length);
  });

  test("are offered by forEdo unless another chord has the same notes", () => {
    const names = (edo: number) =>
      ChordType.forEdo(edo)
        .map((t) => t.name)
        .filter((n) => /harmonic/.test(n));
    // 72-EDO: no other chord is 4:5:6:7
    expect(names(72)).toContain("harmonic seventh");
    // 31-EDO: it is the dominant seventh downminor seventh
    expect(names(31)).not.toContain("harmonic seventh");
    expect(ChordType.tier(ChordType.get("har7", { edo: 72 }))).toBe(0);
  });

  test("addFromRatios", () => {
    ChordType.addFromRatios(["1/1", "5/4", "3/2", "15/8"], ["j7"], "just maj7");
    expect(ChordType.get("j7", { edo: 53 }).intervals).toEqual(
      "1P ↓3M 5P ↓7M".split(" "),
    );
  });
});
