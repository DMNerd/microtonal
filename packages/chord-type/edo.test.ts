import { beforeEach, describe, expect, test } from "vitest";
import ChordType from "./index";

const find = (types: ReturnType<typeof ChordType.forEdo>, name: string) =>
  types.find((t) => t.name === name);

describe("chord types in other EDOs", () => {
  test("microtonal chords are kept out of the 12-EDO dictionary", () => {
    expect(ChordType.all()).toHaveLength(108);
    expect(ChordType.all().some((t) => t.name === "downmajor")).toBe(false);
    // the minor chord chroma still points to the minor chord
    expect(ChordType.get("100100010000").name).toBe("minor");
  });

  test("microtonal chords can be read by name or alias", () => {
    const downmajor = ChordType.get("downmajor");
    expect(downmajor.intervals).toEqual(["1P", "↓3M", "5P"]);
    expect(downmajor.quality).toBe("Major");
    expect(ChordType.get("(↓3)")).toBe(downmajor);
    expect(ChordType.get("n")).toBe(downmajor);
    expect(ChordType.allMicrotonal().length).toBeGreaterThan(5);
  });

  test("forEdo(12) has the traditional chords only", () => {
    const types = ChordType.forEdo(12);
    expect(types).toHaveLength(108);
    expect(find(types, "major")?.chroma).toBe("100010010000");
    expect(find(types, "downmajor")).toBeUndefined();
  });

  test("forEdo(19) leaves microtonal chords out (an up is a sharp)", () => {
    const types = ChordType.forEdo(19);
    expect(find(types, "downmajor")).toBeUndefined();
    expect(find(types, "major")?.chroma).toBe("1000001000010000000");
    expect(find(types, "major")?.edo).toBe(19);
  });

  test("forEdo(24) adds the distinct microtonal chords", () => {
    const types = ChordType.forEdo(24);
    const downmajor = find(types, "downmajor");
    expect(downmajor?.chroma).toBe("100000010000001000000000");
    expect(downmajor?.edo).toBe(24);
    expect(downmajor?.intervals).toEqual(["1P", "↓3M", "5P"]);
    // in 24-EDO upminor is the same set as downmajor: the first one wins
    expect(find(types, "upminor")).toBeUndefined();
    expect(find(types, "upmajor")?.chroma).toBe("100000000100001000000000");
    // no duplicated chromas among the microtonal chords
    const micro = types.filter((t) => t.intervals.some((i) => /[↑↓]/.test(i)));
    expect(new Set(micro.map((t) => t.chroma)).size).toBe(micro.length);
  });

  test("forEdo drops chords whose tones merge", () => {
    // 5-EDO: the minor third and the ninth are both 1 step
    expect(ChordType.get("minor ninth").intervals).toContain("9M");
    const types = ChordType.forEdo(5);
    expect(find(types, "minor ninth")).toBeUndefined();
    expect(find(types, "major")?.chroma).toBe("10110");
  });

  describe("dictionary changes", () => {
    beforeEach(() => {
      ChordType.removeAll();
    });
    test("add clears the forEdo cache", () => {
      expect(ChordType.forEdo(24)).toEqual([]);
      ChordType.add(["1P", "↓3M", "5P"], ["(↓3)"], "downmajor");
      expect(ChordType.all()).toEqual([]);
      expect(ChordType.forEdo(24)).toHaveLength(1);
      ChordType.removeAll();
      expect(ChordType.forEdo(24)).toEqual([]);
      expect(ChordType.allMicrotonal()).toEqual([]);
    });
  });
});
