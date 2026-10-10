import { describe, expect, test } from "vitest";
import Note from "./index";

describe("simplify in an EDO", () => {
  test("12-EDO matches the plain simplify", () => {
    for (const name of ["C##", "B#4", "Cb4", "E#", "Dbb", "C#", "Fbb3"]) {
      expect(Note.simplify(name, { edo: 12 }), name).toBe(Note.simplify(name));
    }
  });

  test("uses the EDO's own enharmonics", () => {
    // 19-EDO: C## is Db and E# is its own note
    expect(Note.simplify("C##", { edo: 19 })).toBe("Db");
    expect(Note.simplify("E#", { edo: 19 })).toBe("E#");
    expect(Note.simplify("B#3", { edo: 19 })).toBe("B#3");
    // 31-EDO: a double sharp is simplest as a plain letter with an arrow
    expect(Note.simplify("C##4", { edo: 31 })).toBe("↓D4");
    // ups and downs are part of the pitch: ↑C# is ↓D, a plain letter
    expect(Note.simplify("↑C#", { edo: 24 })).toBe("↓D");
    expect(Note.simplify("↑Db", { edo: 24 })).toBe("↓D");
    expect(Note.simplify("↑C", { edo: 12 })).toBe("C#");
  });

  test("keeps the accidental direction", () => {
    expect(Note.simplify("Ebb", { edo: 24 })).toBe("D");
    expect(Note.simplify("↓Fb", { edo: 24 })).toBe("↓E");
  });

  test("is safe as a map callback", () => {
    expect(["C##", "Cb"].map(Note.simplify as never)).toEqual(["D", "B"]);
  });
});

describe("enharmonic in an EDO", () => {
  test("12-EDO matches the plain enharmonic", () => {
    for (const name of ["Db", "C", "C#4", "B#3", "E#2"]) {
      expect(Note.enharmonic(name, undefined, { edo: 12 }), name).toBe(
        Note.enharmonic(name),
      );
    }
    expect(Note.enharmonic("F2", "E#", { edo: 12 })).toBe("E#2");
  });

  test("the other spelling of the same step", () => {
    expect(Note.enharmonic("↑C#", undefined, { edo: 24 })).toBe("↓D");
    expect(Note.enharmonic("↓D", undefined, { edo: 24 })).toBe("↑C#");
    // 19-EDO: E# and Fb are the same step
    expect(Note.enharmonic("E#4", undefined, { edo: 19 })).toBe("Fb4");
    expect(Note.enharmonic("C#", undefined, { edo: 19 })).toBe("C#");
  });

  test("with a destination", () => {
    // 19-EDO: C# and Db are different notes
    expect(Note.enharmonic("C#", "Db", { edo: 19 })).toBe("");
    expect(Note.enharmonic("C##", "Db", { edo: 19 })).toBe("Db");
    // the octave follows the pitch: B#3 is step 18 of octave 3 in 19-EDO
    expect(Note.enharmonic("B#3", "Cb", { edo: 19 })).toBe("Cb4");
    expect(Note.enharmonic("↑C#4", "↓D", { edo: 24 })).toBe("↓D4");
    expect(Note.enharmonic("↑C#4", "D", { edo: 24 })).toBe("");
  });
});
