import { describe, expect, test } from "vitest";
import { detect } from "./index";

describe("detect ranking", () => {
  test("common inversions come before rare root position chords", () => {
    // upstream Tonal returns ["Em#5", "CM/E"]
    expect(detect(["E", "C", "G"])).toEqual(["CM/E", "Em#5"]);
    expect(detect(["E", "C", "G"], { edo: 24 })[0]).toBe("CM/E");
  });

  test("root position wins between chords of the same tier", () => {
    expect(detect(["C", "E", "G", "A"])).toEqual(["C6", "Am7/C"]);
    expect(detect(["A", "C", "E", "G"])).toEqual(["Am7", "C6/A"]);
  });

  test("legacy chords come last", () => {
    // both are legacy (unnamed) chord types: root position first
    expect(detect(["C", "D", "E", "G"])).toEqual(["CMadd9", "Em7#5/C"]);
    // a core chord in inversion beats a legacy chord in root position
    expect(detect(["C", "E", "Bb"])).toEqual(["C7no5"]);
    expect(detect(["E", "C", "G", "Bb"])).toEqual(["C7/E"]);
  });
});
