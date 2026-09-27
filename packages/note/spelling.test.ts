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
      $(
        "C C↑ C# C#↑ D D↑ D# D#↑ E E↑ F F↑ F# F#↑ G G↑ G# G#↑ A A↑ A# A#↑ B B↑",
      ),
    );
  });

  test("24-EDO flat view: downs from the note above", () => {
    expect(Note.edoNames(24, "flat")).toEqual(
      $(
        "C Db↓ Db D↓ D Eb↓ Eb E↓ E F↓ F Gb↓ Gb G↓ G Ab↓ Ab A↓ A Bb↓ Bb B↓ B C↓",
      ),
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

  test("31-EDO: ups instead of double accidentals", () => {
    expect(Note.edoNames(31, "sharp").slice(0, 6)).toEqual(
      $("C C↑ C# Db Db↑ D"),
    );
  });

  test("17- and 22-EDO avoid E#, B#, Cb and Fb when they can", () => {
    expect(Note.edoNames(17, "sharp").slice(0, 4)).toEqual($("C Db C# D"));
    // 22-EDO: Db < B# < C#, and step 2 has no other simple spelling
    expect(Note.edoNames(22, "sharp").slice(0, 4)).toEqual($("C Db B# C#"));
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
    expect(Note.fromEdoSteps(103, 24, { accidental: "sharp" })).toBe("D#↑4");
    expect(Note.fromEdoSteps(103, 24, { accidental: "flat" })).toBe("E↓4");
    expect(
      Note.fromEdoSteps(7, 24, { accidental: "flat", pitchClass: true }),
    ).toBe("E↓");
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
    expect(Note.fromEdoSteps(103, 24)).toBe("Eb↑4");
  });
});
