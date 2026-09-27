/**
 * @private
 * Microtonal scale list, in ups and downs notation. Each ↑ or ↓ raises or
 * lowers an interval by one step of the EDO in use: in 24-EDO a "↓3M" is a
 * major third lowered by a quarter tone (the "half-flat" third of maqam rast).
 *
 * Arabic maqamat, ascending forms, spelled on their traditional tonics
 * (rast on C, bayati and saba on D, sikah on E half-flat).
 * Source: https://www.maqamworld.com/en/maqam.php
 *
 * Format: ["intervals", "name", "alias1", "alias2", ...]
 */
const MICROTONAL_SCALES: string[][] = [
  // C D E↓ F G A B↓
  ["1P 2M ↓3M 4P 5P 6M ↓7M", "rast", "maqam rast"],
  // D E↓ F G A Bb C
  ["1P ↓2M 3m 4P 5P 6m 7m", "bayati", "maqam bayati"],
  // D E↓ F Gb A Bb C
  ["1P ↓2M 3m 4d 5P 6m 7m", "saba", "maqam saba"],
  // E↓ F G A B↓ C D
  ["1P ↑2m ↑3m ↑4P 5P ↑6m ↑7m", "sikah", "maqam sikah", "segah"],
];

export default MICROTONAL_SCALES;
