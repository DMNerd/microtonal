import { describe, expect, test } from "vitest";
import ChordType from "./index";

describe("tiers", () => {
  test("core, other, legacy and microtonal chords", () => {
    expect(ChordType.tier(ChordType.get("major"))).toBe(0);
    expect(ChordType.tier(ChordType.get("m7b5"))).toBe(0);
    expect(ChordType.tier(ChordType.get("m#5"))).toBe(1);
    expect(ChordType.tier(ChordType.get("5"))).toBe(1);
    expect(ChordType.tier(ChordType.get("7no5"))).toBe(2);
    expect(ChordType.tier(ChordType.get("(↓3)"))).toBe(0);
    // types from forEdo keep their tier
    const major = ChordType.forEdo(24).find((t) => t.name === "major");
    expect(ChordType.tier(major!)).toBe(0);
    expect(ChordType.tier({ intervals: ["1P", "2m"] })).toBe(1);
  });
});
