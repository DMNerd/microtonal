import { describe, expect, test } from "vitest";
import { coordToInterval, interval, tokenizeIntervalUps } from "./index";

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
    expect(interval("-^^5P").name).toBe("-↑↑5P");
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
});
