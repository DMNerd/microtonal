import { describe, expect, test } from "vitest";
import { freqToMidiBend } from "./index";

describe("freqToMidiBend", () => {
  test("nearest midi number and the bend to reach the frequency", () => {
    expect(freqToMidiBend(440)).toEqual({ midi: 69, cents: 0, bend: 8192 });
    expect(freqToMidiBend(450)).toEqual({ midi: 69, cents: 38.91, bend: 9786 });
    expect(freqToMidiBend(430).bend).toBeLessThan(8192);
  });

  test("bend range and tuning", () => {
    expect(freqToMidiBend(450, { bendRange: 12 })?.bend).toBe(8458);
    expect(freqToMidiBend(432, { tuning: 432 })).toEqual({
      midi: 69,
      cents: 0,
      bend: 8192,
    });
  });

  test("invalid input", () => {
    expect(freqToMidiBend(0)).toBeNull();
    expect(freqToMidiBend(30000)).toBeNull();
    expect(freqToMidiBend(440, { bendRange: 0 })).toBeNull();
  });
});
