import {
  EmptyPcset,
  get as pcset,
  Pcset,
  PcsetChroma,
  PcsetNum,
  projectTypesToEdo,
} from "@tonaljs/pcset";
import { edoKey, edoOption, isEdo } from "@tonaljs/pitch";
import { edoIntervalNames, interval } from "@tonaljs/pitch-interval";
import data from "./data";
import microtonalData from "./microtonal-data";
import temperamentData from "./temperament-data";

/**
 * Properties for a scale in the scale dictionary. It's a pitch class set
 * properties with the following additional information:
 * - name: the scale name
 * - aliases: alternative list of names
 * - intervals: an array of interval names
 */
export interface ScaleType extends Pcset {
  readonly name: string;
  readonly aliases: string[];
}

export const NoScaleType: ScaleType = {
  ...EmptyPcset,
  intervals: [],
  aliases: [],
};

type ScaleTypeName = string | PcsetChroma | PcsetNum;

let dictionary: ScaleType[] = [];
// scales with ups or downs: in 12-EDO they would clash with other scales
let microtonal: ScaleType[] = [];
let index: Record<ScaleTypeName, ScaleType> = Object.create(null);
let edoCache: Record<string, ScaleType[]> = {};
let temperaments: Temperament[] = [];
let temperamentCache: Record<string, ScaleType | undefined> = {};

export interface Temperament {
  name: string;
  size: number;
  generator: number;
  periods: number;
  edos: number[];
}

export function names() {
  return dictionary.map((scale) => scale.name);
}

/**
 * Given a scale name or chroma, return the scale properties
 *
 * @param {string} type - scale name or pitch class set chroma
 * @example
 * import { get } from 'tonaljs/scale-type'
 * get('major') // => { name: 'major', ... }
 * get('porcupine[7]', { edo: 22 }).intervals // => ["1P", "↓2M", ...]
 */
export function get(
  type: ScaleTypeName,
  options?: Partial<{ edo: number }>,
): ScaleType {
  const edo = edoOption(options);
  return (
    (edo !== undefined ? temperamentIn(String(type), edo) : undefined) ??
    index[type] ??
    NoScaleType
  );
}

/**
 * @deprecated
 * @use ScaleType.get
 */
export const scaleType = get;

/**
 * Return a list of all scale types
 */
export function all() {
  return dictionary.slice();
}

/**
 * @deprecated
 * @use ScaleType.all
 */
export const entries = all;

/**
 * Keys used to reference scale types
 */
export function keys() {
  return Object.keys(index);
}

/**
 * Clear the dictionary
 */
export function removeAll() {
  dictionary = [];
  microtonal = [];
  temperaments = [];
  index = Object.create(null);
  edoCache = {};
  temperamentCache = {};
}

/**
 * Return the list of scale types with ups or downs
 */
export function allMicrotonal(): ScaleType[] {
  return microtonal.slice();
}

/**
 * Get the scale types of an EDO, with their pitch class sets in that EDO
 * @example
 * ScaleType.forEdo(24).find(t => t.name === "rast").chroma
 */
export function forEdo(edo: number): ScaleType[] {
  if (!isEdo(edo)) return [];
  const key = edoKey(edo);
  if (!edoCache[key]) {
    const ofTemperaments = temperaments
      .filter((t) => t.edos.includes(edo))
      .map((t) => temperamentIn(t.name, edo))
      .filter((t): t is ScaleType => t !== undefined);
    edoCache[key] = [
      ...projectTypesToEdo(dictionary, microtonal, edo),
      ...ofTemperaments,
    ];
  }
  return edoCache[key].slice();
}

/**
 * Add the scale of a regular temperament, built in each of its EDOs by
 * stacking its generator (in cents) within a period (the octave by default)
 * @example
 * addTemperament("porcupine[7]", { size: 7, generator: 163, edos: [15, 22] })
 */
export function addTemperament(
  name: string,
  scale: Omit<Temperament, "name" | "periods"> & { periods?: number },
): void {
  temperaments.push({ periods: 1, ...scale, name });
  edoCache = {};
  temperamentCache = {};
}

/**
 * Return the list of temperament scales (see `addTemperament`)
 */
export function allTemperaments(): Temperament[] {
  return temperaments.slice();
}

function temperamentIn(name: string, edo: number): ScaleType | undefined {
  const t = temperaments.find((t) => t.name === name && t.edos.includes(edo));
  if (!t || !isEdo(edo)) return undefined;
  const key = `${edoKey(edo)}:${name}`;
  if (!(key in temperamentCache)) {
    const intervals = mosIntervals(t, edo);
    temperamentCache[key] = intervals && {
      ...pcset(intervals, { edo }),
      name,
      intervals,
      aliases: [],
    };
  }
  return temperamentCache[key];
}

// the brightest mode of the scale made by stacking the generator, if it has
// two step sizes in that EDO
function mosIntervals(t: Temperament, edo: number): string[] | undefined {
  const { size, generator, periods } = t;
  if (edo % periods || size % periods) return undefined;
  const period = edo / periods;
  const g = Math.round((generator * edo) / 1200) % period;
  const pcs = new Set<number>();
  for (let p = 0; p < periods; p++) {
    for (let k = 0; k < size / periods; k++) {
      pcs.add(p * period + ((k * g) % period));
    }
  }
  const sorted = [...pcs].sort((a, b) => a - b);
  const gaps = sorted.map((pc, i) => (sorted[i + 1] ?? edo) - pc);
  if (sorted.length !== size || new Set(gaps).size !== 2) return undefined;
  const brightest = gaps
    .map((_, i) => gaps.slice(i).concat(gaps.slice(0, i)))
    .reduce((a, b) => (isBrighter(b, a) ? b : a));
  const names = edoIntervalNames(edo);
  let step = 0;
  return ["1P", ...brightest.slice(0, -1).map((gap) => names[(step += gap)])];
}

function isBrighter(a: number[], b: number[]): boolean {
  const i = a.findIndex((gap, i) => gap !== b[i]);
  return i >= 0 && a[i] > b[i];
}

/**
 * Add a scale into dictionary
 * @param intervals
 * @param name
 * @param aliases
 */
export function add(
  intervals: string[],
  name: string,
  aliases: string[] = [],
): ScaleType {
  const scale = { ...pcset(intervals), name, intervals, aliases };
  edoCache = {};
  index[scale.name] = scale;
  if (intervals.some((ivl) => interval(ivl).ups)) {
    microtonal.push(scale);
  } else {
    dictionary.push(scale);
    index[scale.setNum] = scale;
    index[scale.chroma] = scale;
  }
  scale.aliases.forEach((alias) => addAlias(scale, alias));
  return scale;
}

export function addAlias(scale: ScaleType, alias: string) {
  index[alias] = scale;
}

data.forEach(([ivls, name, ...aliases]: string[]) =>
  add(ivls.split(" "), name, aliases),
);
microtonalData.forEach(([ivls, name, ...aliases]: string[]) =>
  add(ivls.split(" "), name, aliases),
);
temperamentData.forEach(([name, size, generator, periods, edos]) =>
  addTemperament(name, { size, generator, periods, edos }),
);

/** @deprecated */
export default {
  names,
  get,
  all,
  allMicrotonal,
  allTemperaments,
  addTemperament,
  forEdo,
  add,
  removeAll,
  keys,

  // deprecated
  entries,
  scaleType,
};
