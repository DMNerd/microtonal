import { describe, expect, test } from "vitest";
import * as Chord from "./index";

describe("chords with ups and downs", () => {
  test("tokenize", () => {
    expect(Chord.tokenize("C(↓3)")).toEqual(["C", "(↓3)", ""]);
    expect(Chord.tokenize("E↓m")).toEqual(["E↓", "m", ""]);
    expect(Chord.tokenize("^Ebmaj7")).toEqual(["Eb↑", "maj7", ""]);
    expect(Chord.tokenize("C(↓3)/E↓")).toEqual(["C", "(↓3)", "E↓"]);
    // upstream forms are unchanged
    expect(Chord.tokenize("C^7")).toEqual(["C", "^7", ""]);
    expect(Chord.tokenize("Cb9sus")).toEqual(["Cb", "9sus", ""]);
  });

  test("microtonal chord types", () => {
    const chord = Chord.get("C(↓3)");
    expect(chord.empty).toBe(false);
    expect(chord.name).toBe("C downmajor");
    expect(chord.notes).toEqual(["C", "E↓", "G"]);
    expect(chord.intervals).toEqual(["1P", "↓3M", "5P"]);
    expect(Chord.get("Cn").notes).toEqual(["C", "E↓", "G"]);
    expect(Chord.get("Dm(↑3)").notes).toEqual(["D", "F↑", "A"]);
  });

  test("roots with ups and downs", () => {
    expect(Chord.get("E↓m").notes).toEqual(["E↓", "G↓", "B↓"]);
    expect(Chord.get("C↑7").notes).toEqual(["C↑", "E↑", "G↑", "Bb↑"]);
    expect(Chord.get("E↓m").symbol).toBe("E↓m");
  });

  test("inversions keep ups", () => {
    const chord = Chord.get("C(↓3)/E↓");
    expect(chord.rootDegree).toBe(2);
    expect(chord.notes).toEqual(["E↓", "G", "C"]);
    expect(chord.symbol).toBe("C(↓3)/E↓");
  });

  test("detect with edo", () => {
    expect(Chord.detect(["C", "E↓", "G"], { edo: 24 })).toEqual(["C(↓3)"]);
  });

  test("transpose", () => {
    expect(Chord.transpose("C(↓3)", "5P")).toBe("G(↓3)");
    expect(Chord.transpose("Cm", "↓2M")).toBe("D↓m");
  });
});
