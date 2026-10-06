import { describe, expect, test } from "vitest";
import Pcset, { edoIntervalNames, isChroma } from "./index";

const Q24 = { edo: 24 };

describe("pcset in other EDOs", () => {
  test("from note and interval lists", () => {
    const neutral = Pcset.get(["C", "↓E", "G"], Q24);
    expect(neutral.chroma).toBe("100000010000001000000000");
    expect(neutral.edo).toBe(24);
    expect(neutral.empty).toBe(false);
    expect(Pcset.chroma(["1P", "↓3M", "5P"], Q24)).toBe(neutral.chroma);
    expect(Pcset.get(["C", "E", "G"], { edo: 19 }).chroma).toBe(
      "1000001000010000000",
    );
  });

  test("chromas need a matching edo", () => {
    const chroma = "100000010000001000000000";
    expect(Pcset.get(chroma).empty).toBe(true);
    expect(Pcset.get(chroma, Q24).chroma).toBe(chroma);
    expect(isChroma(chroma)).toBe(false);
    expect(isChroma(chroma, 24)).toBe(true);
    // a pcset object keeps its own edo
    expect(Pcset.get(Pcset.get(chroma, Q24)).edo).toBe(24);
  });

  test("set numbers", () => {
    expect(Pcset.get(2 ** 23, Q24).chroma).toBe("1" + "0".repeat(23));
    expect(Pcset.num(["C", "↓E", "G"], Q24)).toBe(
      parseInt("100000010000001000000000", 2),
    );
  });

  test("the edo option is ignored when not an options object", () => {
    // Pcset.get used as a map callback receives the index
    expect(["C", "D"].map((n) => [n]).map(Pcset.get as never)).toHaveLength(2);
    expect(Pcset.get(["C", "E"], 24 as never).edo).toBe(12);
  });

  test("normalized", () => {
    // the smallest rotation starting on a pitch class
    const normalized = "100000000010000001000000";
    expect(Pcset.get(["C", "↓E", "G"], Q24).normalized).toBe(normalized);
    expect(Pcset.get(["G", "↓B", "D"], Q24).normalized).toBe(normalized);
    expect(Pcset.get([], Q24).normalized).toBe("0".repeat(24));
  });

  test("normalized is the smallest rotation that starts with a pitch class", () => {
    const rotations = (chroma: string) =>
      chroma.split("").map((_, i) => chroma.slice(i) + chroma.slice(0, i));
    // a deterministic spread of sets, including repeating patterns (ties)
    const chromas = [
      "101101101101101101101101",
      "1001001001001001001",
      "10101010101010101010101010101010101010101010101010101",
    ];
    for (const edo of [12, 17, 24, 31, 53]) {
      for (let seed = 1; seed < 200; seed++) {
        chromas.push(
          Array.from({ length: edo }, (_, i) =>
            ((i + 1) * seed * 7919) % 5 < 2 ? "1" : "0",
          ).join(""),
        );
      }
    }
    for (const chroma of chromas) {
      if (!chroma.includes("1")) continue;
      const expected = rotations(chroma)
        .filter((r) => r[0] === "1")
        .sort()[0];
      expect(Pcset.get(chroma, { edo: chroma.length }).normalized).toBe(
        expected,
      );
    }
  });

  test("interval names", () => {
    expect(edoIntervalNames(12)).toEqual(
      "1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M".split(" "),
    );
    expect(edoIntervalNames(19)).toEqual(
      "1P 1A 2m 2M 2A 3m 3M 3A 4P 4A 5d 5P 5A 6m 6M 6A 7m 7M 7A".split(" "),
    );
    const names24 = edoIntervalNames(24);
    expect(names24[1]).toBe("↑1");
    expect(names24[7]).toBe("3~");
    expect(names24[8]).toBe("3M");
    expect(names24[14]).toBe("5P");
    expect(Pcset.intervals(["C", "↓E", "G"], Q24)).toEqual(["1P", "3~", "5P"]);
  });

  test("interval names prefer plain qualities with ups and downs", () => {
    // as the Xenharmonic Wiki tables write them (^M2, vm3, ~3... not 3d, 2A)
    expect(edoIntervalNames(31).slice(0, 13)).toEqual(
      "1P ↑1 ↓2m 2m 2~ 2M ↑2M ↓3m 3m 3~ 3M ↑3M ↓4".split(" "),
    );
    expect(edoIntervalNames(22).slice(0, 13)).toEqual(
      "1P 2m ↑2m ↓2M 2M 3m ↑3m ↓3M 3M 4P 5d ↑5d 4A".split(" "),
    );
    // the tritone keeps its usual names
    expect(edoIntervalNames(31).slice(15, 17)).toEqual(["4A", "5d"]);
    // no ups or downs where a sharp is one step
    expect(edoIntervalNames(19).slice(0, 5)).toEqual(
      "1P 1A 2m 2M 2A".split(" "),
    );
    // the step below the octave
    expect(edoIntervalNames(41)[40]).toBe("↓8");
  });

  test("interval names where a sharp lowers the pitch or does nothing", () => {
    // 16-EDO: no ups or downs, and major is narrower than minor
    expect(edoIntervalNames(16).slice(0, 7)).toEqual(
      "1P 2A 2M 2m 3M 3m 3d".split(" "),
    );
    // 13-EDO: spelled by its narrower fifth (7 steps)
    expect(edoIntervalNames(13).slice(0, 7)).toEqual(
      "1P 2M 3M ↑3M ↓3m 3m 4P".split(" "),
    );
    // 28-EDO: a sharp is 0 steps, so only ups and downs move a pitch and
    // intervals have no quality
    expect(edoIntervalNames(28).slice(0, 5)).toEqual(
      "1 ↑1 ↑↑1 ↓2 2".split(" "),
    );
  });

  test("interval names don't cross a neighbouring major scale degree", () => {
    // 41-EDO: 7A is a step above the octave, and plain qualities with ups
    // read better than 1A (as the Xenharmonic Wiki writes them)
    expect(edoIntervalNames(41).slice(0, 8)).toEqual(
      "1P ↑1 ↓2m 2m ↑2m 2~ ↓2M 2M".split(" "),
    );
    // 53-EDO: 4:5:6:7 is 1P ↓3M 5P ↓7m
    const names53 = edoIntervalNames(53);
    expect([0, 17, 31, 43].map((step) => names53[step])).toEqual(
      "1P ↓3M 5P ↓7m".split(" "),
    );
  });

  test("notes", () => {
    expect(Pcset.notes(Pcset.get(["C", "↓E", "G"], Q24))).toEqual([
      "C",
      "↑Eb",
      "G",
    ]);
  });

  test("equality and subsets", () => {
    expect(Pcset.isEqual(["C", "↓E"], ["C", "↑Eb"], Q24)).toBe(true);
    expect(Pcset.isEqual(["C", "↓E"], ["C", "↑Eb"])).toBe(false);
    const inNeutral = Pcset.isSubsetOf(Pcset.get(["C", "↓E", "G"], Q24));
    expect(inNeutral(["C", "↓E"])).toBe(true);
    expect(inNeutral(["C", "E"])).toBe(false);
    const extendsNeutral = Pcset.isSupersetOf(Pcset.get(["C", "↓E"], Q24));
    expect(extendsNeutral(["C", "↓E", "G"])).toBe(true);
    expect(extendsNeutral(["C", "E", "G"])).toBe(false);
  });

  test("isNoteIncludedIn and filter", () => {
    const inNeutral = Pcset.isNoteIncludedIn(Pcset.get(["C", "↓E", "G"], Q24));
    expect(inNeutral("↑Eb4")).toBe(true);
    expect(inNeutral("E4")).toBe(false);
    expect(
      Pcset.filter(Pcset.get(["C", "↓E", "G"], Q24))(["C4", "E4", "↓E4"]),
    ).toEqual(["C4", "↓E4"]);
  });

  test("modes", () => {
    expect(Pcset.modes(Pcset.get(["C", "↓E", "G"], Q24))).toHaveLength(3);
  });
});
