import { describe, expect, test } from "vitest";
import ScaleType from "./index";

describe("scale types in other EDOs", () => {
  test("maqamat are kept out of the 12-EDO dictionary", () => {
    expect(ScaleType.names()).not.toContain("rast");
    expect(ScaleType.all().some((t) => t.name === "rast")).toBe(false);
    // the dorian chroma still points to a traditional scale
    expect(ScaleType.get("101101010110").name).toBe("dorian");
  });

  test("maqamat can be read by name or alias", () => {
    expect(ScaleType.get("rast").intervals).toEqual(
      "1P 2M ↓3M 4P 5P 6M ↓7M".split(" "),
    );
    expect(ScaleType.get("maqam bayati").name).toBe("bayati");
    expect(ScaleType.get("segah").name).toBe("sikah");
    expect(ScaleType.allMicrotonal().map((t) => t.name)).toEqual([
      "rast",
      "bayati",
      "saba",
      "sikah",
    ]);
  });

  test("forEdo", () => {
    const rast = ScaleType.forEdo(24).find((t) => t.name === "rast");
    expect(rast?.chroma).toBe("100010010010001000100100");
    expect(rast?.edo).toBe(24);
    expect(ScaleType.forEdo(12)).toHaveLength(ScaleType.all().length);
    expect(ScaleType.forEdo(19).some((t) => t.name === "rast")).toBe(false);
    expect(ScaleType.forEdo(31).some((t) => t.name === "rast")).toBe(true);
    const major = ScaleType.forEdo(31).find((t) => t.name === "major");
    expect(major?.chroma.length).toBe(31);
  });
});
