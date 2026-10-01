import { describe, expect, test } from "vitest";
import { edoSteps } from "@tonaljs/pitch";
import { interval } from "@tonaljs/pitch-interval";
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
      "huzam",
      "iraq",
      "nairuz",
      "suznak",
      "mahur",
      "bayati shuri",
      "dril",
      "gil",
      "kleeth",
      "bish",
      "fish",
      "jwl",
      "led",
    ]);
  });

  test("mosh modes have their step pattern in 17, 24 and 31-EDO", () => {
    const patterns: Record<string, string> = {
      dril: "LsLsLss",
      gil: "LsLssLs",
      kleeth: "LssLsLs",
      bish: "sLsLsLs",
      fish: "sLsLssL",
      jwl: "sLssLsL",
      led: "ssLsLsL",
    };
    const sizes: Record<number, [number, number]> = {
      17: [3, 2],
      24: [4, 3],
      31: [5, 4],
    };
    for (const [name, pattern] of Object.entries(patterns)) {
      for (const [edo, [L, s]] of Object.entries(sizes)) {
        const steps = ScaleType.get(name)
          .intervals.map((i) => edoSteps(interval(i), +edo))
          .concat(+edo);
        const found = steps
          .slice(1)
          .map((step, i) => ({ [L]: "L", [s]: "s" })[step - steps[i]])
          .join("");
        expect(found, `${name} ${edo}`).toBe(pattern);
      }
    }
    expect(ScaleType.get("mohajira").name).toBe("dril");
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

  test("temperament scales are mos scales of their EDOs", () => {
    const shapes: Record<string, string> = {
      "porcupine[7]": "1L 6s",
      "magic[7]": "3L 4s",
      "kleismic[7]": "4L 3s",
      "slendric[5]": "1L 4s",
      "sensi[8]": "3L 5s",
      "orwell[9]": "4L 5s",
      "negri[9]": "1L 8s",
      "miracle[10]": "1L 9s",
      "pajara[10]": "2L 8s",
      "blackwood[10]": "5L 5s",
    };
    for (const t of ScaleType.allTemperaments()) {
      for (const edo of t.edos) {
        const steps = ScaleType.get(t.name, { edo })
          .intervals.map((i) => edoSteps(interval(i), edo))
          .concat(edo);
        const gaps = steps.slice(1).map((step, i) => step - steps[i]);
        const L = Math.max(...gaps);
        const large = gaps.filter((gap) => gap === L).length;
        expect(`${large}L ${gaps.length - large}s`, `${t.name} ${edo}`).toBe(
          shapes[t.name],
        );
        // the brightest mode starts with a large step
        expect(gaps[0]).toBe(L);
      }
    }
  });

  test("temperament scales need an EDO", () => {
    expect(ScaleType.get("porcupine[7]").empty).toBe(true);
    expect(ScaleType.get("porcupine[7]", { edo: 31 }).empty).toBe(true);
    expect(ScaleType.get("porcupine[7]", { edo: 22 }).intervals).toEqual(
      "1P 2M ↓3M 5d 5P ↓6M ↑7m".split(" "),
    );
    const names = (edo: number) =>
      ScaleType.forEdo(edo)
        .filter((t) => t.name.includes("["))
        .map((t) => t.name);
    expect(names(22)).toEqual([
      "porcupine[7]",
      "magic[7]",
      "orwell[9]",
      "pajara[10]",
    ]);
    expect(names(12)).toEqual([]);
  });

  test("addTemperament (in the brightest mode, as TAMNAMS lists first)", () => {
    ScaleType.addTemperament("test[5]", {
      size: 5,
      generator: 700,
      edos: [12],
    });
    expect(ScaleType.get("test[5]", { edo: 12 }).intervals).toEqual(
      "1P 3m 4P 6m 7m".split(" "),
    );
  });
});
