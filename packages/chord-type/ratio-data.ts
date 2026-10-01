/**
 * @private
 * Harmonic and subharmonic chords, built in each EDO from their ratios
 * Source: https://en.xen.wiki/w/Ups_and_downs_notation#Harmonic_and_subharmonic_chords
 * Format: ["full name", "ratios", "abrv1 abrv2"]
 */
const RATIO_CHORDS: string[][] = [
  ["harmonic seventh", "1/1 5/4 3/2 7/4", "har7"],
  ["harmonic ninth", "1/1 5/4 3/2 7/4 9/4", "har9"],
  ["harmonic eleventh", "1/1 5/4 3/2 7/4 9/4 11/4", "har11"],
  ["harmonic sixth", "1/1 7/6 3/2 5/3", "har6"],
  ["subharmonic seventh", "1/1 7/6 7/5 7/4", "sub7"],
  ["subharmonic ninth", "1/1 9/7 3/2 9/5 9/4", "sub9"],
  ["subharmonic eleventh", "1/1 11/9 11/7 11/6 11/5 11/4", "sub11"],
  ["subharmonic sixth", "1/1 6/5 3/2 12/7", "sub6"],
];

export default RATIO_CHORDS;
