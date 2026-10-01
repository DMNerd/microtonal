import {
  EmptyPcset,
  get as pcset,
  Pcset,
  PcsetChroma,
  PcsetNum,
  projectTypesToEdo,
} from "@tonaljs/pcset";
import { interval } from "@tonaljs/pitch-interval";
import data from "./data";
import microtonalData from "./microtonal-data";

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
// Scales with ups or downs: kept apart because their 12-EDO sizes clash with
// traditional scales. See `forEdo`.
let microtonal: ScaleType[] = [];
let index: Record<ScaleTypeName, ScaleType> = Object.create(null);
let edoCache: Record<number, ScaleType[]> = {};

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
 */
export function get(type: ScaleTypeName): ScaleType {
  return index[type] || NoScaleType;
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
  index = Object.create(null);
  edoCache = {};
}

/**
 * Return the list of scale types with ups or downs
 */
export function allMicrotonal(): ScaleType[] {
  return microtonal.slice();
}

/**
 * Get the scale types of an equal division of the octave (EDO), with their
 * pitch class set (chroma, setNum, normalized) computed in that EDO.
 *
 * Scales whose tones merge in that EDO are left out. Microtonal scales are
 * only included where an up is smaller than a sharp (17, 22, 24, 31...-EDO)
 * and when they are not the same set as a traditional scale.
 *
 * @example
 * ScaleType.forEdo(24).find(t => t.name === "rast").chroma
 * // => "100010010010001000100100"
 */
export function forEdo(edo: number): ScaleType[] {
  if (!edoCache[edo]) {
    edoCache[edo] = projectTypesToEdo(dictionary, microtonal, edo);
  }
  return edoCache[edo].slice();
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
    // only reachable by name: its 12-EDO chroma would shadow another scale
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

/** @deprecated */
export default {
  names,
  get,
  all,
  allMicrotonal,
  forEdo,
  add,
  removeAll,
  keys,

  // deprecated
  entries,
  scaleType,
};
