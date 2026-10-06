import { describe, expect, test } from "vitest";
import * as Chord from "./index";

// examples from https://en.xen.wiki/w/Kite%27s_ups_and_downs_notation
const notes = (symbol: string, edo?: number) =>
  Chord.get(symbol, edo ? { edo } : undefined).notes.join(" ");

describe("Kite's chord names", () => {
  test("triads", () => {
    expect(notes("C↑")).toBe("C ↑E G");
    expect(notes("C↓")).toBe("C ↓E G");
    expect(notes("C↓↓")).toBe("C ↓↓E G");
    expect(notes("C↓m")).toBe("C ↓Eb G");
    expect(notes("C(↓5)")).toBe("C E ↓G");
    expect(notes("Cm(↓5)")).toBe("C Eb ↓G");
    expect(notes("C↓(↓5)")).toBe("C ↓E ↓G");
    expect(notes("C↓m(↓5)")).toBe("C ↓Eb ↓G");
  });

  test("ASCII arrows are read where Tonal has no other meaning", () => {
    expect(notes("Cv")).toBe("C ↓E G");
    expect(notes("C^m")).toBe("C ↑Eb G");
    expect(notes("Cv7")).toBe("C ↓E G ↓Bb");
    // Tonal's ^ for major wins
    expect(notes("C^7")).toBe("C E G B");
  });

  test("a global arrow changes the 3rd, 6th, 7th and 11th", () => {
    expect(notes("C↓7")).toBe("C ↓E G ↓Bb");
    expect(notes("C↓9")).toBe("C ↓E G ↓Bb D");
    expect(notes("C↓m7")).toBe("C ↓Eb G ↓Bb");
    expect(notes("C↓6")).toBe("C ↓E G ↓A");
    // or the 2nd or 4th of a suspended chord
    expect(notes("C↓sus4")).toBe("C ↓F G");
    // nothing to change in a power chord
    expect(Chord.get("C↓5").empty).toBe(true);
  });

  test("a comma separates an added note", () => {
    expect(notes("C↓,7")).toBe("C ↓E G Bb");
    expect(notes("C,↓7")).toBe("C E G ↓Bb");
    expect(notes("C↓,M7")).toBe("C ↓E G B");
    expect(notes("Cm↓7")).toBe("C Eb G ↓Bb");
    expect(notes("C↓↑7")).toBe("C ↓E G ↑Bb");
    expect(notes("C7↓9")).toBe("C E G Bb ↓D");
    expect(notes("C7↓b9")).toBe("C E G Bb ↓Db");
    expect(notes("C,↓7↓9")).toBe("C E G ↓Bb ↓D");
    expect(notes("C↓6,9")).toBe("C ↓E G ↓A D");
  });

  test("added notes are relative to the major scale; a 7th alone is minor", () => {
    expect(notes("C,b6")).toBe("C E G Ab");
    expect(notes("C,#6")).toBe("C E G A#");
    expect(notes("C,bb7")).toBe("C E G Bbb");
    expect(notes("C,#7")).toBe("C E G B#");
    expect(notes("C,b8")).toBe("C E G Cb");
  });

  test("alterations in parentheses", () => {
    expect(notes("CM9(↓5↓7)")).toBe("C E ↓G ↓B D");
    expect(notes("Cm7(↓b5)")).toBe("C Eb ↓Gb Bb");
    expect(notes("C↓7(4)")).toBe("C F G ↓Bb");
    // a 2nd or 4th replaces the 3rd
    expect(notes("C(b4)")).toBe("C Fb G");
    expect(notes("C(#2)")).toBe("C D# G");
    expect(notes("C(#3)")).toBe("C E# G");
  });

  test("mid chords need an EDO to be spelled", () => {
    expect(Chord.get("C~").intervals).toEqual(["1P", "3~", "5P"]);
    expect(Chord.get("C~").notes).toEqual(["C", "", "G"]);
    expect(notes("C~", 24)).toBe("C ↑Eb G");
    expect(notes("C~", 41)).toBe("C ↑↑Eb G");
    expect(notes("C~7", 24)).toBe("C ↑Eb G ↑Bb");
    expect(Chord.get("C~", { edo: 22 }).notes).toEqual(["C", "", "G"]);
  });

  test("known chords keep their names", () => {
    expect(Chord.get("C,7").symbol).toBe("C7");
    expect(Chord.get("C↓7").name).toBe("C downmajor seventh");
    expect(Chord.get("C↓↑7").symbol).toBe("C↓↑7");
  });
});
