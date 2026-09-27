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
    expect(Interval.invert("↑5P")).toBe("↓4P");
  });

  test("add and subtract", () => {
    expect(Interval.add("↓3M", "3m")).toBe("↓5P");
    expect(Interval.add("↑2M", "↑2M")).toBe("↑↑3M");
    expect(Interval.subtract("5P", "↓3M")).toBe("↑3m");
    expect(Interval.add("-↑3M", "5P")).toBe("↓3m");
  });

  test("transposeFifths keeps ups", () => {
    expect(Interval.transposeFifths("↓3M", 1)).toBe("↓7M");
  });
});
