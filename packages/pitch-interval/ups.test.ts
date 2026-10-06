import { describe, expect, test } from "vitest";
import {
  coordToInterval,
  edoPlainInterval,
  interval,
  tokenizeIntervalUps,
} from "./index";

describe("interval ups and downs", () => {
  test("tokenizeIntervalUps", () => {
    expect(tokenizeIntervalUps("3M")).toEqual([0, "3M"]);
    expect(tokenizeIntervalUps("↓3M")).toEqual([-1, "3M"]);
    expect(tokenizeIntervalUps("-↑5P")).toEqual([1, "-5P"]);
    expect(tokenizeIntervalUps("^M3")).toEqual([1, "M3"]);
  });

  test("names", () => {
    expect(interval("↓3M").name).toBe("↓3M");
    expect(interval("vM3").name).toBe("↓3M");
    expect(interval("-^^5P").name).toBe("-↑↑5");
    expect(interval("↑M-3").name).toBe("-↑3M");
    expect(interval("↑3P").empty).toBe(true);
  });

  test("properties", () => {
    const neutral = interval("↓3M");
    expect(neutral.ups).toBe(-1);
    expect(neutral.q).toBe("M");
    expect(neutral.coord).toEqual(interval("3M").coord);
    // 12-EDO: an up or down is a semitone
    expect(neutral.semitones).toBe(3);
    expect(interval("-↑3M").semitones).toBe(-5);
    expect(interval("-↑3M").chroma).toBe(7);
  });

  test("from pitch objects", () => {
    expect(interval({ step: 2, alt: 0, oct: 0, dir: 1, ups: -1 }).name).toBe(
      "↓3M",
    );
  });

  test("coordToInterval spells ups relative to direction", () => {
    expect(coordToInterval([4, -2], false, -1).name).toBe("↓3M");
    // a signed size change of -1 on a descending third is written as "up"
    expect(coordToInterval([-4, 2], false, -1).name).toBe("-↑3M");
  });

  test("perfect intervals with ups or downs have no quality", () => {
    expect(interval("^4").name).toBe("↑4");
    expect(interval("↑4P").name).toBe("↑4");
    expect(interval("v8").name).toBe("↓8");
    expect(interval("↑4").q).toBe("P");
  });

  test("mid intervals", () => {
    expect(interval("~3").name).toBe("3~");
    expect(interval("^~3").name).toBe("↑3~");
    expect(interval("~4").name).toBe("4~");
    expect(interval("~1").empty).toBe(true);
    expect(interval("~10").simple).toBe(3);
  });

  test("intervals without a quality", () => {
    // read as perfect or major; names without a quality are only written
    // for EDOs where a sharp is 0 steps (see edoIntervalNames)
    expect(interval("3").name).toBe("3M");
    expect(interval("↑3").q).toBe("M");
    expect(interval("↑3").coord).toEqual(interval("3M").coord);
  });

  test("edoPlainInterval", () => {
    expect(edoPlainInterval("3~", 24)).toBe("↑3m");
    expect(edoPlainInterval("3~", 41)).toBe("↑↑3m");
    expect(edoPlainInterval("4~", 24)).toBe("↑4");
    expect(edoPlainInterval("5~", 24)).toBe("↓5");
    expect(edoPlainInterval("3~", 22)).toBe("");
    expect(edoPlainInterval("3M", 22)).toBe("3M");
  });
});
