import { describe, expect, test } from "vitest";
import * as Chord from "./index";

describe("chords with ups and downs", () => {
  test("tokenize", () => {
    expect(Chord.tokenize("C↓")).toEqual(["C", "↓", ""]);
    // arrows after the root are a global arrow, part of the chord type
    expect(Chord.tokenize("E↓m")).toEqual(["E", "↓m", ""]);
    expect(Chord.tokenize("↓Em")).toEqual(["↓E", "m", ""]);
    expect(Chord.tokenize("^Ebmaj7")).toEqual(["↑Eb", "maj7", ""]);
    expect(Chord.tokenize("C↓/↓E")).toEqual(["C", "↓", "↓E"]);
    // upstream forms are unchanged
    expect(Chord.tokenize("C^7")).toEqual(["C", "^7", ""]);
    expect(Chord.tokenize("Cb9sus")).toEqual(["Cb", "9sus", ""]);
  });

  test("microtonal chord types", () => {
    const chord = Chord.get("C↓");
    expect(chord.empty).toBe(false);
    expect(chord.name).toBe("C downmajor");
    expect(chord.notes).toEqual(["C", "↓E", "G"]);
    expect(chord.intervals).toEqual(["1P", "↓3M", "5P"]);
    // a known chord written another way gets its own name and symbol
    expect(Chord.get("Cv").symbol).toBe("C↓");
    expect(Chord.get("C,7").symbol).toBe("C7");
    expect(Chord.get("Cn").notes).toEqual(["C", "↓E", "G"]);
    expect(Chord.get("D↑m").notes).toEqual(["D", "↑F", "A"]);
  });

  test("roots with ups and downs", () => {
    expect(Chord.get("↓Em").notes).toEqual(["↓E", "↓G", "↓B"]);
    expect(Chord.get("↑C7").notes).toEqual(["↑C", "↑E", "↑G", "↑Bb"]);
    expect(Chord.get("↓Em").symbol).toBe("↓Em");
  });

  test("inversions keep ups", () => {
    const chord = Chord.get("C↓/↓E");
    expect(chord.rootDegree).toBe(2);
    expect(chord.notes).toEqual(["↓E", "G", "C"]);
    expect(chord.symbol).toBe("C↓/↓E");
  });

  test("detect with edo", () => {
    expect(Chord.detect(["C", "↓E", "G"], { edo: 24 })).toEqual(["C~"]);
  });

  test("transpose", () => {
    expect(Chord.transpose("C↓", "5P")).toBe("G↓");
    expect(Chord.transpose("Cm", "↓2M")).toBe("↓Dm");
  });
});
