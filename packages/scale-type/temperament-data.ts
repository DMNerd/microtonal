/**
 * @private
 * Scales of regular temperaments (mos scales), built in each EDO from their
 * generator
 * Source: https://en.xen.wiki (each temperament's page)
 * Format: [name, size, generator in cents, periods per octave, EDOs]
 */
const TEMPERAMENT_SCALES: [string, number, number, number, number[]][] = [
  ["porcupine[7]", 7, 163, 1, [15, 22]],
  ["magic[7]", 7, 380.5, 1, [19, 22, 41]],
  ["kleismic[7]", 7, 317.1, 1, [15, 19, 34, 53]],
  ["slendric[5]", 5, 233.9, 1, [31, 36, 41]],
  ["sensi[8]", 8, 443, 1, [19, 27, 46]],
  ["orwell[9]", 9, 271.5, 1, [22, 31, 53]],
  ["negri[9]", 9, 125, 1, [19, 29]],
  ["miracle[10]", 10, 116.7, 1, [31, 41, 72]],
  ["pajara[10]", 10, 107.4, 2, [22]],
  ["blackwood[10]", 10, 151.1, 5, [15, 20, 25]],
];

export default TEMPERAMENT_SCALES;
