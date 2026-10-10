import { describe, expect, test } from "vitest";
import Note from "./index";

const $ = (s: string) => s.split(" ");

describe("edoNames", () => {
  test("12-EDO sharp and flat views", () => {
    expect(Note.edoNames(12, "sharp")).toEqual(
      $("C C# D D# E F F# G G# A A# B"),
    );
    expect(Note.edoNames(12, "flat")).toEqual(
      $("C Db D Eb E F Gb G Ab A Bb B"),
    );
  });

  test("24-EDO sharp view", () => {
    expect(Note.edoNames(24, "sharp")).toEqual(
      $("C ↑C C# ↓D D ↑D D# ↓E E ↑E F ↑F F# ↓G G ↑G G# ↓A A ↑A A# ↓B B ↑B"),
    );
  });

  test("24-EDO flat view: flats, and plain letters with arrows", () => {
    expect(Note.edoNames(24, "flat")).toEqual(
      $("C ↑C Db ↓D D ↑D Eb ↓E E ↓F F ↑F Gb ↓G G ↑G Ab ↓A A ↑A Bb ↓B B ↓C"),
    );
  });

  test("19-EDO needs no ups", () => {
    expect(Note.edoNames(19, "sharp")).toEqual(
      $("C C# Db D D# Eb E E# F F# Gb G G# Ab A A# Bb B B#"),
    );
    expect(Note.edoNames(19, "flat")).toEqual(
      $("C C# Db D D# Eb E Fb F F# Gb G G# Ab A A# Bb B Cb"),
    );
  });

  test("31-EDO: arrows instead of double accidentals", () => {
    expect(Note.edoNames(31, "sharp").slice(0, 6)).toEqual(
      $("C ↑C C# Db ↓D D"),
    );
  });

  test("a plain letter with an arrow before an accidental with one", () => {
    // as Kite's notation guide spells them
    expect(Note.edoNames(24, "sharp")[3]).toBe("↓D");
    expect(Note.edoNames(24, "flat")[1]).toBe("↑C");
  });

  test("stacked accidentals where a sharp is one step", () => {
    expect(Note.edoNames(26, "sharp")[2]).toBe("C##");
    expect(Note.edoNames(47, "sharp")[3]).toBe("C###");
  });

  test("17- and 22-EDO avoid E#, B#, Cb and Fb when they can", () => {
    expect(Note.edoNames(17, "sharp").slice(0, 4)).toEqual($("C Db C# D"));
    // 22-EDO: B# is above C, so step 2 takes an up or a down instead
    expect(Note.edoNames(22, "sharp").slice(0, 4)).toEqual($("C Db ↑Db C#"));
    expect(Note.edoNames(22, "flat").slice(0, 4)).toEqual($("C Db ↓C# C#"));
  });

  test("spellings don't cross a neighbouring natural", () => {
    // 41-EDO: B# is a step above C, Ebb a step below D
    expect(Note.edoNames(41, "sharp").slice(0, 8)).toEqual(
      $("C ↑C ↓Db Db C# ↑C# ↓D D"),
    );
    // 53-EDO: the 5/4 third is ↓E (Fb is below E), the 7/4 seventh ↓Bb
    expect(Note.edoNames(53, "sharp")[17]).toBe("↓E");
    expect(Note.edoNames(53, "flat")[43]).toBe("↓Bb");
    // 19-EDO: E# lies between E and F, so it stays
    expect(Note.edoNames(19, "sharp")[7]).toBe("E#");
  });

  test("every name spells its own step", () => {
    for (let edo = 5; edo <= 72; edo++) {
      for (const accidental of ["sharp", "flat"] as const) {
        const names = Note.edoNames(edo, accidental);
        expect(names).toHaveLength(edo);
        names.forEach((name, pc) => {
          expect(Note.edoChroma(name, edo), `${edo} ${accidental} ${pc}`).toBe(
            pc,
          );
        });
      }
    }
  });

  test("invalid edo", () => {
    expect(Note.edoNames(0, "sharp")).toEqual([]);
  });
});

describe("fromEdoSteps with an accidental preference", () => {
  test("uses edoNames and keeps octaves", () => {
    expect(Note.fromEdoSteps(103, 24, { accidental: "sharp" })).toBe("↓E4");
    expect(Note.fromEdoSteps(103, 24, { accidental: "flat" })).toBe("↓E4");
    expect(
      Note.fromEdoSteps(7, 24, { accidental: "flat", pitchClass: true }),
    ).toBe("↓E");
    // 19-EDO B#0 is step 18, not C1
    expect(Note.fromEdoSteps(18, 19, { accidental: "sharp" })).toBe("B#0");
    expect(Note.fromEdoSteps(18, 19, { accidental: "flat" })).toBe("Cb1");
    for (const edo of [12, 19, 24, 31]) {
      for (let s = -edo; s < 2 * edo; s++) {
        for (const accidental of ["sharp", "flat"] as const) {
          const name = Note.fromEdoSteps(s, edo, { accidental });
          expect(Note.edoSteps(name, edo)).toBe(s);
        }
      }
    }
  });

  test("without a preference nothing changes", () => {
    expect(Note.fromEdoSteps(103, 24)).toBe("↓E4");
  });
});

describe("transposeEdoSteps", () => {
  test("keeps the letter where it can", () => {
    expect(Note.transposeEdoSteps("C4", 7, 24)).toBe("↓E4");
    expect(Note.transposeEdoSteps("C#", 1, 24)).toBe("↑C#");
    expect(Note.transposeEdoSteps("E4", -1, 24)).toBe("↓E4");
    expect(Note.transposeEdoSteps("Bb3", 3, 19)).toBe("C4");
    expect(Note.transposeEdoSteps("X", 1, 24)).toBe("");
  });

  test("lands on the right step in every EDO", () => {
    for (let edo = 5; edo <= 72; edo++) {
      for (const note of ["C4", "F#4", "↓Bb3", "E", "↑Db"]) {
        const base = Note.edoSteps(note, edo);
        for (let steps = -edo; steps <= edo; steps++) {
          const target = note.match(/\d/)
            ? base + steps
            : (((base + steps) % edo) + edo) % edo;
          const result = Note.transposeEdoSteps(note, steps, edo);
          expect(Note.edoSteps(result, edo), `${edo} ${note} ${steps}`).toBe(
            target,
          );
        }
      }
    }
  });
});

describe("edoMidi", () => {
  test("midi number and pitch bend of an EDO note", () => {
    expect(Note.edoMidi("↓E4", 24)).toEqual({
      midi: 64,
      cents: -50,
      bend: 6144,
    });
    expect(Note.edoMidi("↓E4", 24, { bendRange: 12 })?.bend).toBe(7851);
    expect(Note.edoMidi("A4", 31)).toEqual({ midi: 69, cents: 0, bend: 8192 });
    expect(Note.edoMidi("↑C4", 31)?.cents).toBe(48.39);
  });

  test("null for pitch classes and invalid notes", () => {
    expect(Note.edoMidi("E", 24)).toBeNull();
    expect(Note.edoMidi("X4", 24)).toBeNull();
    expect(Note.edoMidi("C4", 0)).toBeNull();
  });
});
