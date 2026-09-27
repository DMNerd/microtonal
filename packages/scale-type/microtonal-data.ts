/**
 * @private
 * Microtonal scale list, in ups and downs notation. Each ↑ or ↓ raises or
 * lowers an interval by one step of the EDO in use: in 24-EDO a "↓3M" is a
 * major third lowered by a quarter tone (the "half-flat" third of maqam rast).
 *
 * Arabic maqamat, ascending forms, spelled on their traditional tonics
 * (rast, nairuz and suznak on C, bayati and saba on D, sikah and huzam on
 * E half-flat, 'iraq on B half-flat).
 * Source: https://www.maqamworld.com/en/maqam.php — the scales follow each
 * page's ajnas (e.g. huzam: Sikah on the tonic, Hijaz on the 3rd, Rast on
 * the 6th), with the usual jins shapes: Rast C D E↓ F G, Bayati D E↓ F G,
 * Sikah E↓ F G, Hijaz D Eb F# G.
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
  // E↓ F G Ab B C D: Sikah on E↓, Hijaz on G, Rast on C
  ["1P ↑2m ↑3m ↑4d ↑5P ↑6m ↑7m", "huzam", "maqam huzam"],
  // B↓ C D E↓ F G A: Sikah on B↓, Bayati on D, Rast on G
  ["1P ↑2m ↑3m 4P ↑5d ↑6m ↑7m", "iraq", "maqam iraq", "'iraq"],
  // C D E↓ F G A↓ Bb: Rast on C, Bayati on G
  ["1P 2M ↓3M 4P 5P ↓6M 7m", "nairuz", "maqam nairuz", "nayruz"],
  // C D E↓ F G Ab B: Rast on C, Hijaz on G
  ["1P 2M ↓3M 4P 5P 6m 7M", "suznak", "maqam suznak"],
];

export default MICROTONAL_SCALES;
