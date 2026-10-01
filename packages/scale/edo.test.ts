import { describe, expect, test } from "vitest";
import * as Scale from "./index";

const Q24 = { edo: 24 };

describe("scales in other EDOs", () => {
  test("get maqamat", () => {
    expect(Scale.get("C rast").notes).toEqual([
      "C",
      "D",
      "E↓",
      "F",
      "G",
      "A",
      "B↓",
    ]);
    expect(Scale.get("D bayati").notes).toEqual("D E↓ F G A Bb C".split(" "));
    expect(Scale.get("D saba").notes).toEqual("D E↓ F Gb A Bb C".split(" "));
    expect(Scale.get("E↓ sikah").notes).toEqual("E↓ F G A B↓ C D".split(" "));
    expect(Scale.get("E↓ sikah").tonic).toBe("E↓");
  });

  test("detect", () => {
    expect(
      Scale.detect("C D E↓ F G A B↓".split(" "), { ...Q24, match: "exact" }),
    ).toEqual(["C rast"]);
    expect(
      Scale.detect("D E↓ F G A Bb C".split(" "), { ...Q24, match: "exact" }),
    ).toEqual(["D bayati"]);
    // traditional scales are found in other EDOs too
    expect(
      Scale.detect("C D E F G A B".split(" "), { ...Q24, match: "exact" }),
    ).toEqual(["C major"]);
    // tetrachord: fits in rast
    expect(Scale.detect(["C", "D", "E↓", "F"], Q24)).toContain("C rast");
  });

  test("scaleChords", () => {
    const chords = Scale.scaleChords("rast", Q24);
    expect(chords).toContain("(↓3)");
    expect(chords).toContain("5");
    expect(chords).not.toContain("M");
    // unchanged in 12-EDO
    expect(Scale.scaleChords("pentatonic")).toEqual(
      Scale.scaleChords("pentatonic", { edo: 12 }),
    );
  });

  test("extended and reduced", () => {
    // C D F G A is inside rast
    expect(Scale.reduced("rast", Q24)).toEqual(["ritusen"]);
    expect(Scale.extended("rast", Q24)).toEqual([]);
    expect(Scale.reduced("major", Q24)).toContain("major pentatonic");
  });

  test("modeNames", () => {
    expect(Scale.modeNames("C major", { edo: 31 })).toEqual(
      Scale.modeNames("C major"),
    );
    // husayni, sikah, nairuz and 'iraq use the notes of rast, starting from
    // D, E↓, G and B↓
    expect(Scale.modeNames("C rast", Q24)).toEqual([
      ["C", "rast"],
      ["D", "husayni"],
      ["E↓", "sikah"],
      ["G", "nairuz"],
      ["B↓", "iraq"],
    ]);
  });

  test("rangeOf", () => {
    const range = Scale.rangeOf("C rast", Q24);
    expect(range("C4", "C5")).toEqual("C4 D4 E↓4 F4 G4 A4 B↓4 C5".split(" "));
    expect(range("C5", "G4")).toEqual("C5 B↓4 A4 G4".split(" "));
    expect(Scale.rangeOf("C major", { edo: 31 })("B3", "D4")).toEqual([
      "B3",
      "C4",
      "D4",
    ]);
  });

  test("degrees", () => {
    const rast = Scale.degrees("C rast");
    expect([1, 3, 7, 8].map(rast)).toEqual(["C", "E↓", "B↓", "C"]);
  });
});

describe("more maqamat", () => {
  test("notes on their traditional tonics", () => {
    expect(Scale.get("E↓ huzam").notes).toEqual("E↓ F G Ab B C D".split(" "));
    expect(Scale.get("B↓ iraq").notes).toEqual("B↓ C D E↓ F G A".split(" "));
    expect(Scale.get("C nairuz").notes).toEqual("C D E↓ F G A↓ Bb".split(" "));
    expect(Scale.get("C suznak").notes).toEqual("C D E↓ F G Ab B".split(" "));
  });

  test("detected in 24-EDO", () => {
    expect(
      Scale.detect("C D E↓ F G Ab B".split(" "), {
        edo: 24,
        match: "exact",
      }),
    ).toEqual(["C suznak"]);
  });
});
