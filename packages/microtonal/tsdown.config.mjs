import { readdirSync } from "node:fs";
import { defineConfig } from "tsdown";

// Modules published as subpaths (@dmnerd/microtonal/<name>)
const modules = [
  "abc-notation",
  "array",
  "chord",
  "chord-detect",
  "chord-type",
  "collection",
  "core",
  "duration-value",
  "interval",
  "key",
  "midi",
  "mode",
  "note",
  "pcset",
  "progression",
  "range",
  "rhythm-pattern",
  "roman-numeral",
  "scale",
  "scale-type",
  "time-signature",
  "voice-leading",
  "voicing",
  "voicing-dictionary",
];

// Workspace packages import each other as @tonaljs/*. Point those at source
// so the bundle never picks up a stale dist/ and has no dependencies.
const packages = readdirSync("..", { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "microtonal")
  .map((entry) => entry.name);

export default defineConfig({
  entry: {
    index: "../tonal/index.ts",
    ...Object.fromEntries(
      modules.map((name) => [name, `../${name}/index.ts`]),
    ),
  },
  format: ["esm", "cjs"],
  platform: "neutral",
  sourcemap: true,
  dts: true,
  alias: Object.fromEntries(
    packages.map((name) => [`@tonaljs/${name}`, `../${name}/index.ts`]),
  ),
  deps: { alwaysBundle: [/^@tonaljs\//] },
  outputOptions: { exports: "named" },
});
