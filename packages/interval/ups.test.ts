import { describe, expect, test } from "vitest";
import Interval from "./index";

describe("interval ups and downs", () => {
  test("edoSteps", () => {
    expect(Interval.edoSteps("3M", 24)).toBe(8);
    expect(Interval.edoSteps("↓3M", 24)).toBe(7);
    expect(Interval.edoSteps("-5P", 19)).toBe(-11);
    expect(Interval.edoSteps("-↑3M", 24)).toBe(-9);
    expect(Interval.edoSteps("8P", 31)).toBe(31);
    expect(Interval.edoSteps("5P")).toBe(7);
  });

  test("simplify", () => {
    expect(Interval.simplify("↓10M")).toBe("↓3M");
    expect(Interval.simplify("-↑9M")).toBe("-↑2M");
  });

  test("invert flips ups", () => {
    expect(Interval.invert("↓3M")).toBe("↑6m");
    expect(Interval.invert("↑5")).toBe("↓4");
  });

  test("add and subtract", () => {
    expect(Interval.add("↓3M", "3m")).toBe("↓5");
    expect(Interval.add("↑2M", "↑2M")).toBe("↑↑3M");
    expect(Interval.subtract("5P", "↓3M")).toBe("↑3m");
    expect(Interval.add("-↑3M", "5P")).toBe("↓3m");
  });

  test("transposeFifths keeps ups", () => {
    expect(Interval.transposeFifths("↓3M", 1)).toBe("↓7M");
  });

  test("fromEdoSteps", () => {
    expect(Interval.fromEdoSteps(7, 24)).toBe("3~");
    expect(Interval.fromEdoSteps(31, 24)).toBe("10~");
    expect(Interval.fromEdoSteps(-7, 24)).toBe("-3~");
    expect(Interval.fromEdoSteps(-11, 19)).toBe("-5P");
    expect(Interval.fromEdoSteps(6, 12)).toBe("5d");
    // the simplest pitch class name is one step below 1P: an octave less one
    expect(Interval.fromEdoSteps(40, 41)).toBe("↓8");
    expect(Interval.fromEdoSteps(1.5, 24)).toBe("");
  });

  test("fromEdoSteps gives back the size in every EDO", () => {
    for (let edo = 5; edo <= 72; edo++) {
      for (let steps = -2 * edo; steps <= 2 * edo; steps++) {
        const name = Interval.fromEdoSteps(steps, edo);
        expect(Interval.edoSteps(name, edo), `${edo} ${steps} ${name}`).toBe(
          steps,
        );
      }
    }
  });
});
