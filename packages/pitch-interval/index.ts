import {
  coordinates,
  Direction,
  edoCrossesNatural,
  edoKey,
  edoProfile,
  edoSharp,
  edoSteps,
  isEdo,
  IntervalCoordinates,
  isNamedPitch,
  isPitch,
  NamedPitch,
  Pitch,
  pitch,
  PitchCoordinates,
} from "@tonaljs/pitch";

export type IntervalName = string;
export type IntervalLiteral = IntervalName | Pitch | NamedPitch;

type Quality =
  | "dddd"
  | "ddd"
  | "dd"
  | "d"
  | "m"
  | "~"
  | "M"
  | "P"
  | "A"
  | "AA"
  | "AAA"
  | "AAAA";
type Type = "perfectable" | "majorable";

export interface Interval extends Pitch, NamedPitch {
  readonly empty: boolean;
  readonly name: IntervalName;
  readonly num: number;
  readonly q: Quality;
  readonly type: Type;
  readonly step: number;
  readonly alt: number;
  readonly dir: Direction;
  readonly simple: number;
  readonly semitones: number;
  readonly chroma: number;
  readonly coord: IntervalCoordinates;
  readonly oct: number;
  readonly ups: number;
}

export type IntervalType = Interval;

const NoInterval: Interval = Object.freeze({
  empty: true,
  name: "",
  num: NaN,
  q: "" as Quality,
  type: "" as Type,
  step: NaN,
  alt: NaN,
  dir: NaN as Direction,
  simple: NaN,
  semitones: NaN,
  chroma: NaN,
  coord: [] as unknown as IntervalCoordinates,
  oct: NaN,
  ups: NaN,
});

// shorthand tonal notation (with quality after number)
// the quality can be left out ("3"), as in EDOs where a sharp is 0 steps
const INTERVAL_TONAL_REGEX = "([-+]?\\d+)(d{1,4}|m|~|M|P|A{1,4}|)";
// standard shorthand notation (with quality before number)
const INTERVAL_SHORTHAND_REGEX = "(AA|A|P|M|m|~|d|dd)([-+]?\\d+)";
const REGEX = new RegExp(
  "^(?:" + INTERVAL_TONAL_REGEX + "|" + INTERVAL_SHORTHAND_REGEX + ")$",
);

type IntervalTokens = [string, string];

const UPS_REGEX = /^([-+]?)([\^v↑↓]+)(.*)$/;

const fillStr = (s: string, n: number) => Array(Math.abs(n) + 1).join(s);
// a perfect interval with ups or downs is written without its quality ("↑4")
const ivlName = (ups: number, num: number | string, q: string) =>
  upsToArrows(ups) + num + (ups && q === "P" ? "" : q);
const upsToArrows = (ups: number): string =>
  ups < 0 ? fillStr("↓", -ups) : fillStr("↑", ups);
const arrowsToUps = (arrows: string): number => {
  let ups = 0;
  for (const ch of arrows) {
    if (ch === "↑" || ch === "^") ups += 1;
    else if (ch === "↓" || ch === "v") ups -= 1;
  }
  return ups;
};

/**
 * @private
 */
export function tokenizeIntervalUps(str: string): [number, string] {
  const m = UPS_REGEX.exec(str);
  return m ? [arrowsToUps(m[2]), m[1] + m[3]] : [0, str];
}

/**
 * @private
 */
export function tokenizeInterval(str?: IntervalName): IntervalTokens {
  const m = REGEX.exec(`${str}`);
  if (m === null) {
    return ["", ""];
  }
  return m[1] ? [m[1], m[2]] : [m[4], m[3]];
}

const cache = new Map<string, Interval>();

/**
 * Get interval properties. It returns an object with:
 *
 * - name: the interval name
 * - num: the interval number
 * - type: 'perfectable' or 'majorable'
 * - q: the interval quality (d, m, M, A)
 * - dir: interval direction (1 ascending, -1 descending)
 * - simple: the simplified number
 * - semitones: the size in semitones
 * - chroma: the interval chroma
 *
 * @param {string} interval - the interval name
 * @return {Object} the interval properties
 *
 * @example
 * import { interval } from '@tonaljs/core'
 * interval('P5').semitones // => 7
 * interval('m3').type // => 'majorable'
 */
export function interval(src: IntervalLiteral): Interval {
  return typeof src === "string"
    ? cached(src)
    : isPitch(src)
      ? interval(pitchName(src))
      : isNamedPitch(src)
        ? interval(src.name)
        : NoInterval;
}

// Only valid intervals are cached, so arbitrary input can't grow the cache
function cached(src: string): Interval {
  let value = cache.get(src);
  if (!value) {
    value = parse(src);
    if (!value.empty) cache.set(src, value);
  }
  return value;
}

const SIZES = [0, 2, 4, 5, 7, 9, 11];
const TYPES = "PMMPPMM";
function parse(fullStr?: string): Interval {
  const [ups, str] = tokenizeIntervalUps(`${fullStr}`);
  const tokens = tokenizeInterval(str);
  if (tokens[0] === "") {
    return NoInterval;
  }
  const num = +tokens[0];
  if (num === 0) {
    return NoInterval;
  }
  const step = (Math.abs(num) - 1) % 7;
  const t = TYPES[step];
  // an interval without a quality is perfect or major
  const q = (tokens[1] || (t === "P" ? "P" : "M")) as Quality;
  if (t === "M" && q === "P") {
    return NoInterval;
  }
  const type = t === "M" ? "majorable" : "perfectable";
  const alt = qToAlt(type, q, step);
  if (Number.isNaN(alt)) {
    return NoInterval;
  }

  const dir = num < 0 ? -1 : 1;
  const name = (dir < 0 ? "-" : "") + ivlName(ups, Math.abs(num), q);
  const simple = num === 8 || num === -8 ? num : dir * (step + 1);
  const oct = Math.floor((Math.abs(num) - 1) / 7);
  const semitones = dir * (SIZES[step] + alt + ups + 12 * oct);
  const chroma = (((dir * (SIZES[step] + alt + ups)) % 12) + 12) % 12;
  const coord = coordinates({ step, alt, oct, dir }) as IntervalCoordinates;
  return {
    empty: false,
    name,
    num,
    q,
    step,
    alt,
    dir,
    type,
    simple,
    semitones,
    chroma,
    coord,
    oct,
    ups,
  };
}

/**
 * @private
 *
 * forceDescending is used in the case of unison (#243)
 */
export function coordToInterval(
  coord: PitchCoordinates,
  forceDescending?: boolean,
  ups = 0,
): Interval {
  const [f, o = 0] = coord;
  const isDescending = f * 7 + o * 12 < 0;
  const ivl: IntervalCoordinates =
    forceDescending || isDescending ? [-f, -o, -1] : [f, o, 1];
  const p = pitch(ivl);
  const writtenUps = ups * ivl[2];
  return interval(writtenUps ? { ...p, ups: writtenUps } : p) as Interval;
}

// mid: halfway between m and M, P and A (4th), P and d (5th)
const MID_ALTS = [NaN, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5];

function qToAlt(type: Type, q: string, step: number): number {
  if (q === "~") return MID_ALTS[step];
  return (q === "M" && type === "majorable") ||
    (q === "P" && type === "perfectable")
    ? 0
    : q === "m" && type === "majorable"
      ? -1
      : /^A+$/.test(q)
        ? q.length
        : /^d+$/.test(q)
          ? -1 * (type === "perfectable" ? q.length : q.length + 1)
          : 0;
}

// return the interval name of a pitch
function pitchName(props: Pitch): string {
  const { step, alt, oct = 0, dir, ups = 0 } = props;
  if (!dir) {
    return "";
  }
  const calcNum = step + 1 + 7 * oct;
  // this is an edge case: descending pitch class unison (see #243)
  const num = calcNum === 0 ? step + 1 : calcNum;
  const d = dir < 0 ? "-" : "";
  const type = TYPES[step] === "M" ? "majorable" : "perfectable";
  if (!Number.isInteger(alt) && alt !== MID_ALTS[step]) {
    return "";
  }
  const name = d + ivlName(ups, num, altToQ(type, alt));
  return name;
}

function altToQ(type: Type, alt: number): Quality {
  if (!Number.isInteger(alt)) {
    return "~";
  } else if (alt === 0) {
    return type === "majorable" ? "M" : "P";
  } else if (alt === -1 && type === "majorable") {
    return "m";
  } else if (alt > 0) {
    return fillStr("A", alt) as Quality;
  } else {
    return fillStr("d", type === "perfectable" ? alt : alt + 1) as Quality;
  }
}

const QUALITIES = {
  majorable: ["dddd", "ddd", "dd", "d", "m", "M", "A", "AA", "AAA", "AAAA"],
  perfectable: ["dddd", "ddd", "dd", "d", "P", "A", "AA", "AAA", "AAAA"],
};

// ties between degrees: the usual names first, stacked accidentals last
const ORDER = (
  "1P 2m 2M 3m 3M 4P 5d 5P 6m 6M 7m 7M 1A 2A 3d 3A 4d 4A 5A 6d 6A 7d 7A 2d 1d " +
  "8d 1AA 2AA 3AA 4AA 5AA 6AA 7AA 2dd 3dd 4dd 5dd 6dd 7dd 8dd"
).split(" ");
const order = (num: number, q: string) => {
  const i = ORDER.indexOf(num + q);
  return i >= 0 ? i : ORDER.length + q.length * 8 + num;
};

const edoNamesCache: Record<string, IntervalName[]> = {};
// in ups: crossing a natural or using A/d costs more than one arrow
const CROSSING_COST = 1.5;
const ALTERED_COST = 1.5;
// where a sharp is 5+ steps, two arrows read better than A or d
const LARGE_SHARP_ALTERED_COST = 2.5;
const NO_ARROWS_COST = 100;
// a mid between minor and major beats one arrow; a mid 4th or 5th ties it
const MID_COST = 0.5;
const PERFECT_MID_COST = 1;

type DegreeName = { num: number; q: string; ups: number };

// The name of a size within a degree, as in Kite's notation guide: from the
// nearest quality (m, ~, M, A, d; P, ~, A, d for 4ths and 5ths), ties going
// to a plain quality, then to the quality nearest m, M or P, then to ups
function degreeName(num: number, size: number, edo: number): DegreeName {
  const type = TYPES[(num - 1) % 7] === "M" ? "majorable" : "perfectable";
  const at = (q: string) => edoSteps(interval(num + q), edo);
  const anchors = QUALITIES[type].map((q) => ({ q, at: at(q) }));
  const { sharp, spelling } = edoProfile(edo);
  if (spelling === "fifths" && sharp) {
    const simple = ((num - 1) % 7) + 1;
    const mid =
      type === "majorable"
        ? (at("m") + at("M")) / 2
        : // where a sharp is 2 steps the up-4th wins over the mid-4th
          simple === 4 && Math.abs(sharp) !== 2
          ? (at("P") + at("A")) / 2
          : simple === 5 && Math.abs(sharp) !== 2
            ? (at("d") + at("P")) / 2
            : NaN;
    if (!Number.isNaN(mid)) anchors.push({ q: "~", at: mid });
  }
  let best: { name: DegreeName; cost: number[] } | undefined;
  for (const { q, at } of anchors) {
    if (Number.isNaN(at)) continue;
    const diff = size - at;
    // around a mid between two steps, the first arrow reaches the nearest
    const ups = diff > 0 ? Math.ceil(diff) : Math.floor(diff);
    const cost = [
      Math.abs(ups),
      q === "~" ? 1 : 0,
      /^[Ad]/.test(q) ? q.length : 0,
      ups < 0 ? 1 : 0,
    ];
    if (!best || compareCosts(cost, best.cost) < 0)
      best = { name: { num, q, ups }, cost };
  }
  return best!.name;
}

/**
 * Get the simplest interval name of every step of an EDO
 * @example
 * edoIntervalNames(24)[7] // => "3~"
 */
export function edoIntervalNames(edo: number): IntervalName[] {
  if (!isEdo(edo)) return [];
  const key = edoKey(edo);
  if (edoNamesCache[key]) return edoNamesCache[key];
  const sharp = edoSharp(edo);
  const proportional = edoProfile(edo).spelling === "proportional";
  const noArrows = !proportional && Math.abs(sharp) === 1;
  const names: IntervalName[] = [];
  for (let step = 0; step < edo; step++) {
    let best: { name: IntervalName; cost: number[] } | undefined;
    for (let num = 1; num <= 8; num++) {
      const { q, ups } = degreeName(num, step, edo);
      const mid = q === "~";
      const plain = /^[PMm]$/.test(q) ? 0 : 1;
      const simple = ((num - 1) % 7) + 1;
      const tritone =
        (simple === 4 && q === "A") || (simple === 5 && q === "d");
      const altered =
        plain && !mid && !((proportional || sharp > 0) && tritone);
      const alteredCost =
        altered && !noArrows
          ? sharp >= 5
            ? LARGE_SHARP_ALTERED_COST
            : ALTERED_COST
          : 0;
      const midCost = mid
        ? simple === 4 || simple === 5
          ? PERFECT_MID_COST
          : MID_COST
        : 0;
      const pitch = interval(num + q);
      const crosses = edoCrossesNatural({ ...pitch, ups }, edo);
      const cost = [
        Math.abs(ups) * (noArrows ? NO_ARROWS_COST : 1) +
          alteredCost +
          midCost +
          (crosses ? CROSSING_COST : 0),
        plain,
        ups < 0 ? 1 : 0,
        // upminor and downmajor before upmajor and downminor
        (ups > 0 && q === "M") || (ups < 0 && q === "m") ? 1 : 0,
        order(num, q),
      ];
      if (!best || compareCosts(cost, best.cost) < 0)
        best = { name: ivlName(ups, num, q), cost };
    }
    names.push(withoutQuality(best!.name, edo));
  }
  return (edoNamesCache[key] = names);
}

/**
 * Get an interval name from its size in steps of an EDO
 * @example
 * intervalFromEdoSteps(7, 24) // => "3~"
 * intervalFromEdoSteps(-7, 24) // => "-3~"
 */
export function intervalFromEdoSteps(steps: number, edo = 12): IntervalName {
  if (!Number.isInteger(steps) || !isEdo(edo)) return "";
  const size = Math.abs(steps);
  const base = interval(edoIntervalNames(edo)[size % edo]);
  const octaves = (size - edoSteps(base, edo)) / edo;
  const name = ivlName(base.ups, base.num + 7 * octaves, base.q);
  return withoutQuality(steps < 0 ? "-" + name : name, edo);
}

/**
 * Get an interval without a mid, spelled with ups or downs in an EDO
 * @example
 * edoPlainInterval("3~", 24) // => "↓3M"
 * edoPlainInterval("5~", 24) // => "↓5"
 */
export function edoPlainInterval(
  name: IntervalName,
  edo?: number,
): IntervalName {
  const ivl = interval(name);
  if (ivl.empty || ivl.q !== "~" || edo === undefined) return ivl.name;
  const steps = edoSteps(ivl, edo);
  if (Number.isNaN(steps)) return "";
  // from the nearer quality, as the notation guide spells notes; ties go to
  // downs for 3rds (24-EDO ~3 is ↓3M) and to perfect for 4ths and 5ths
  const simple = ((Math.abs(ivl.num) - 1) % 7) + 1;
  const qualities =
    ivl.type === "majorable"
      ? ["M", "m"]
      : simple === 4
        ? ["P", "A"]
        : ["P", "d"];
  let best = { ups: Infinity, q: "" };
  for (const q of qualities) {
    const base = interval(ivl.dir * Math.abs(ivl.num) + q);
    const ups = ivl.dir * (steps - edoSteps(base, edo));
    const tie = Math.abs(ups) === Math.abs(best.ups);
    if (
      Math.abs(ups) < Math.abs(best.ups) ||
      (tie && ivl.type === "majorable" && ups < 0)
    )
      best = { ups, q };
  }
  return (
    (ivl.dir < 0 ? "-" : "") + ivlName(best.ups, Math.abs(ivl.num), best.q)
  );
}

// every interval is perfect where a sharp is 0 steps: no quality
function withoutQuality(name: IntervalName, edo: number): IntervalName {
  const profile = edoProfile(edo);
  return profile.spelling === "fifths" && profile.sharp === 0
    ? name.replace(/[PMm]$/, "")
    : name;
}

function compareCosts(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
