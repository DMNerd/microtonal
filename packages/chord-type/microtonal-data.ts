/**
 * @private
 * Microtonal chord list, in ups and downs notation
 * Format: ["intervals", "full name", "abrv1 abrv2"]
 */
const MICROTONAL_CHORDS: string[][] = [
  ["1P ↓3M 5P", "downmajor", "(↓3) M(↓3) n"],
  ["1P ↑3M 5P", "upmajor", "(↑3) M(↑3)"],
  ["1P ↑3m 5P", "upminor", "m(↑3)"],
  ["1P ↓3m 5P", "downminor", "m(↓3)"],
  ["1P ↓2M 5P", "suspended downsecond", "sus↓2 sus2↓"],
  ["1P ↑4P 5P", "suspended upfourth", "sus↑4 sus4↑"],
  ["1P ↓3M 5P 7m", "dominant seventh downmajor third", "7(↓3) n7"],
  ["1P ↓3M 5P ↓7m", "downmajor seventh", "7(↓3,↓7)"],
  ["1P 3M 5P ↓7m", "harmonic seventh", "7(↓7)"],
  ["1P ↑3m 5P ↑7m", "upminor seventh", "m7(↑3,↑7)"],
  ["1P ↓3m 5P ↓7m", "downminor seventh", "m7(↓3,↓7)"],
  ["1P ↓3M 5P 7M", "major seventh downmajor third", "maj7(↓3)"],
  ["1P 3m 5P ↓7M", "minor downmajor seventh", "m(↓maj7)"],
];

export default MICROTONAL_CHORDS;
