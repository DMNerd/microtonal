import { describe, expect, test } from "vitest";
import { note, tokenizeUps } from "./index";

describe("note ups and downs", () => {
  test("tokenizeUps", () => {
    expect(tokenizeUps("C4")).toEqual([0, "C4"]);
    expect(tokenizeUps("↑C4")).toEqual([1, "C4"]);
    expect(tokenizeUps("↓↓Eb")).toEqual([-2, "Eb"]);
    expect(tokenizeUps("^C#4")).toEqual([1, "C#4"]);
    expect(tokenizeUps("vvEb")).toEqual([-2, "Eb"]);
    expect(tokenizeUps("↑↓C")).toEqual([0, "C"]);
  });

  test("canonical names put arrows before the note", () => {
    expect(note("C#↑4").name).toBe("↑C#4");
    expect(note("^C#4").name).toBe("↑C#4");
    expect(note("vEb").name).toBe("↓Eb");
    expect(note("↓E").pc).toBe("↓E");
    expect(note("↑↓C").name).toBe("C");
  });

  test("properties", () => {
    const n = note("↓E4");
    expect(n.ups).toBe(-1);
    expect(n.letter).toBe("E");
    expect(n.acc).toBe("");
    expect(n.oct).toBe(4);
    // coordinates are the same as the unmarked note
    expect(n.coord).toEqual(note("E4").coord);
    // 12-EDO: an up or down is a semitone
    expect(n.chroma).toBe(3);
    expect(n.midi).toBe(63);
    expect(note("↑B").chroma).toBe(0);
  });

  test("from pitch objects", () => {
    expect(note({ step: 2, alt: 0, ups: -1 }).name).toBe("↓E");
    expect(note({ step: 0, alt: 1, oct: 4, ups: 2 }).name).toBe("↑↑C#4");
  });

  test("notes without ups are unchanged", () => {
    expect(note("C#4").ups).toBe(0);
    expect(note("vb").name).toBe("↓B");
    expect(note("bb").name).toBe("Bb");
    expect(note("v").empty).toBe(true);
    expect(note("C↑x").empty).toBe(true);
  });
});
