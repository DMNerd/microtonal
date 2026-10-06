/**
 * @private
 * Microtonal chord list, in ups and downs notation
 * Source: https://en.xen.wiki/w/Kite%27s_ups_and_downs_notation
 * Format: ["intervals", "full name", "abrv1 abrv2"]
 */
const MICROTONAL_CHORDS: string[][] = [
  ["1P 3~ 5P", "mid", "~"],
  ["1P 3~ 5P 7~", "mid seventh", "~7"],
  ["1P 3~ 5P 7m", "dominant seventh mid third", "~,7"],
  ["1P 3~ 5P 7M", "major seventh mid third", "~,M7 ~,maj7"],
  ["1P 3m 5P 7~", "minor mid seventh", "m~7"],
  ["1P ↓3M 5P", "downmajor", "↓ n"],
  ["1P ↑3M 5P", "upmajor", "↑"],
  ["1P ↑3m 5P", "upminor", "↑m"],
  ["1P ↓3m 5P", "downminor", "↓m"],
  ["1P ↓2M 5P", "suspended downsecond", "↓sus2"],
  ["1P ↑4 5P", "suspended upfourth", "↑sus4"],
  ["1P ↓3M 5P 7m", "dominant seventh downmajor third", "↓,7 n7"],
  ["1P ↓3M 5P ↓7m", "downmajor seventh", "↓7"],
  ["1P 3M 5P ↓7m", "dominant seventh downminor seventh", ",↓7"],
  ["1P ↑3m 5P ↑7m", "upminor seventh", "↑m7"],
  ["1P ↓3m 5P ↓7m", "downminor seventh", "↓m7"],
  ["1P ↓3M 5P 7M", "major seventh downmajor third", "↓,M7 ↓,maj7"],
  ["1P 3m 5P ↓7M", "minor downmajor seventh", "m↓M7 m↓maj7"],
];

export default MICROTONAL_CHORDS;
