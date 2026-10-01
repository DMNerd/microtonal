/**
 * @private
 * Microtonal scale list (Arabic maqamat, ascending), in ups and downs notation
 * Source: https://www.maqamworld.com/en/maqam.php
 * Format: ["intervals", "name", "alias1", "alias2", ...]
 */
const MICROTONAL_SCALES: string[][] = [
  ["1P 2M ↓3M 4P 5P 6M ↓7M", "rast", "maqam rast"],
  ["1P ↓2M 3m 4P 5P 6m 7m", "bayati", "maqam bayati"],
  ["1P ↓2M 3m 4d 5P 6m 7m", "saba", "maqam saba"],
  ["1P ↑2m ↑3m ↑4P 5P ↑6m ↑7m", "sikah", "maqam sikah", "segah"],
  ["1P ↑2m ↑3m ↑4d ↑5P ↑6m ↑7m", "huzam", "maqam huzam"],
  ["1P ↑2m ↑3m 4P ↑5d ↑6m ↑7m", "iraq", "maqam iraq", "'iraq"],
  ["1P 2M ↓3M 4P 5P ↓6M 7m", "nairuz", "maqam nairuz", "nayruz"],
  ["1P 2M ↓3M 4P 5P 6m 7M", "suznak", "maqam suznak"],
];

export default MICROTONAL_SCALES;
