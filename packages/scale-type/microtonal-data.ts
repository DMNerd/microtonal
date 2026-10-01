/**
 * @private
 * Microtonal scale list, in ups and downs notation
 * Sources: https://www.maqamworld.com/en/maqam.php, https://en.xen.wiki/w/3L_4s
 * Format: ["intervals", "name", "alias1", "alias2", ...]
 */
const MICROTONAL_SCALES: string[][] = [
  // Arabic maqamat (ascending)
  ["1P 2M ↓3M 4P 5P 6M ↓7M", "rast", "maqam rast"],
  ["1P ↓2M 3m 4P 5P 6m 7m", "bayati", "maqam bayati"],
  ["1P ↓2M 3m 4d 5P 6m 7m", "saba", "maqam saba"],
  ["1P ↑2m ↑3m ↑4P 5P ↑6m ↑7m", "sikah", "maqam sikah", "segah"],
  ["1P ↑2m ↑3m ↑4d ↑5P ↑6m ↑7m", "huzam", "maqam huzam"],
  ["1P ↑2m ↑3m 4P ↑5d ↑6m ↑7m", "iraq", "maqam iraq", "'iraq"],
  ["1P 2M ↓3M 4P 5P ↓6M 7m", "nairuz", "maqam nairuz", "nayruz"],
  ["1P 2M ↓3M 4P 5P 6m 7M", "suznak", "maqam suznak"],
  ["1P 2M ↓3M 4P 5P 6M 7M", "mahur", "maqam mahur"],
  ["1P ↓2M 3m 4P 5d 6M 7m", "bayati shuri", "maqam bayati shuri"],
  // Mosh (3L 4s) modes: neutral third scales, like mohajira
  ["1P 2M ↑3m ↑4P 5P 6M ↑7m", "dril", "mohajira", "mosh dril", "dalmatian"],
  ["1P 2M ↑3m ↑4P 5P ↑6m ↑7m", "gil", "mosh gil", "galatian"],
  ["1P 2M ↑3m 4P 5P ↑6m ↑7m", "kleeth", "mosh kleeth", "cilician"],
  ["1P ↑2m ↑3m 4P 5P ↑6m ↑7m", "bish", "mosh bish", "bithynian"],
  ["1P ↑2m ↑3m 4P 5P ↑6m 7m", "fish", "mosh fish", "pisidian"],
  ["1P ↑2m ↑3m 4P ↓5P ↑6m 7m", "jwl", "mosh jwl", "illyrian"],
  ["1P ↑2m 3m 4P ↓5P ↑6m 7m", "led", "mosh led", "lycian"],
];

export default MICROTONAL_SCALES;
