import { describe, expect, test } from "vitest";
import Pcset, { edoIntervalNames, isChroma } from "./index";

const Q24 = { edo: 24 };

describe("pcset in other EDOs", () => {
  test("from note and interval lists", () => {
    const neutral = Pcset.get(["C", "E↓", "G"], Q24);
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
    expect(Pcset.num(["C", "E↓", "G"], Q24)).toBe(
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
    expect(Pcset.get(["C", "E↓", "G"], Q24).normalized).toBe(normalized);
    expect(Pcset.get(["G", "B↓", "D"], Q24).normalized).toBe(normalized);
    expect(Pcset.get([], Q24).normalized).toBe("0".repeat(24));
  });

  test("interval names", () => {
    expect(edoIntervalNames(12)).toEqual(
      "1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M".split(" "),
    );
    expect(edoIntervalNames(19)).toEqual(
      "1P 1A 2m 2M 2A 3m 3M 3A 4P 4A 5d 5P 5A 6m 6M 6A 7m 7M 7A".split(" "),
    );
    const names24 = edoIntervalNames(24);
    expect(names24[1]).toBe("↑1P");
    expect(names24[7]).toBe("↑3m");
    expect(names24[8]).toBe("3M");
    expect(names24[14]).toBe("5P");
    expect(Pcset.intervals(["C", "E↓", "G"], Q24)).toEqual(["1P", "↑3m", "5P"]);
  });

  test("notes", () => {
    expect(Pcset.notes(Pcset.get(["C", "E↓", "G"], Q24))).toEqual([
      "C",
      "Eb↑",
      "G",
    ]);
  });

  test("equality and subsets", () => {
    expect(Pcset.isEqual(["C", "E↓"], ["C", "Eb↑"], Q24)).toBe(true);
    expect(Pcset.isEqual(["C", "E↓"], ["C", "Eb↑"])).toBe(false);
    const inNeutral = Pcset.isSubsetOf(Pcset.get(["C", "E↓", "G"], Q24));
    expect(inNeutral(["C", "E↓"])).toBe(true);
    expect(inNeutral(["C", "E"])).toBe(false);
    const extendsNeutral = Pcset.isSupersetOf(Pcset.get(["C", "E↓"], Q24));
    expect(extendsNeutral(["C", "E↓", "G"])).toBe(true);
    expect(extendsNeutral(["C", "E", "G"])).toBe(false);
  });

  test("isNoteIncludedIn and filter", () => {
    const inNeutral = Pcset.isNoteIncludedIn(Pcset.get(["C", "E↓", "G"], Q24));
    expect(inNeutral("Eb↑4")).toBe(true);
    expect(inNeutral("E4")).toBe(false);
    expect(
      Pcset.filter(Pcset.get(["C", "E↓", "G"], Q24))(["C4", "E4", "E↓4"]),
    ).toEqual(["C4", "E↓4"]);
  });

  test("modes", () => {
    expect(Pcset.modes(Pcset.get(["C", "E↓", "G"], Q24))).toHaveLength(3);
  });
});
