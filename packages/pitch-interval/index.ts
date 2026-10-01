import {
  coordinates,
  Direction,
  edoChroma,
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
  "dddd" | "ddd" | "dd" | "d" | "m" | "M" | "P" | "A" | "AA" | "AAA" | "AAAA";
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
  /** Ups (positive) or downs (negative), as written: "-↑3M" has ups 1. */
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
const INTERVAL_TONAL_REGEX = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
// standard shorthand notation (with quality before number)
const INTERVAL_SHORTHAND_REGEX = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
const REGEX = new RegExp(
  "^(?:" + INTERVAL_TONAL_REGEX + "|" + INTERVAL_SHORTHAND_REGEX + ")$",
);

type IntervalTokens = [string, string];

// Ups/downs markers go first, or right after the sign: "↑3M", "-↓5P", "^M3"
const UPS_REGEX = /^([-+]?)([\^v↑↓]+)(.*)$/;

const fillStr = (s: string, n: number) => Array(Math.abs(n) + 1).join(s);
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
 * Split the ups/downs markers from an interval name.
 * Returns the net number of ups and the name without the markers.
 *
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
  const q = tokens[1] as Quality;
  const step = (Math.abs(num) - 1) % 7;
  const t = TYPES[step];
  if (t === "M" && q === "P") {
    return NoInterval;
  }
  const type = t === "M" ? "majorable" : "perfectable";

  const dir = num < 0 ? -1 : 1;
  const name = (dir < 0 ? "-" : "") + upsToArrows(ups) + Math.abs(num) + q;
  const simple = num === 8 || num === -8 ? num : dir * (step + 1);
  const alt = qToAlt(type, q);
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
  // `ups` is the signed size change; names spell it relative to direction
  const writtenUps = ups * ivl[2];
  return interval(writtenUps ? { ...p, ups: writtenUps } : p) as Interval;
}

function qToAlt(type: Type, q: string): number {
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
  const name = d + upsToArrows(ups) + num + altToQ(type, alt);
  return name;
}

function altToQ(type: Type, alt: number): Quality {
  if (alt === 0) {
    return type === "majorable" ? "M" : "P";
  } else if (alt === -1 && type === "majorable") {
    return "m";
  } else if (alt > 0) {
    return fillStr("A", alt) as Quality;
  } else {
    return fillStr("d", type === "perfectable" ? alt : alt + 1) as Quality;
  }
}

// Interval spellings tried for each step of an EDO, most preferred first:
// the 12-TET names, then augmented/diminished ones
const EDO_CANDIDATES = [
  "1P",
  "2m",
  "2M",
  "3m",
  "3M",
  "4P",
  "5d",
  "5P",
  "6m",
  "6M",
  "7m",
  "7M",
  "1A",
  "2A",
  "3d",
  "3A",
  "4d",
  "4A",
  "5A",
  "6d",
  "6A",
  "7d",
  "7A",
  "2d",
];

const edoNamesCache: Record<number, IntervalName[]> = {};

/**
 * Name every step of an EDO with an interval (within an octave). The name
 * with the fewest ups or downs wins; then plain qualities (P, M, m) over
 * augmented or diminished; then ups over downs. So, in 24-EDO step 7 (the
 * neutral third) is "↑3m" and in 19-EDO step 1 is "1A".
 *
 * @example
 * edoIntervalNames(24)[7] // => "↑3m"
 */
export function edoIntervalNames(edo: number): IntervalName[] {
  if (edoNamesCache[edo]) return edoNamesCache[edo];
  const best: { name: IntervalName; cost: number[] }[] = [];
  EDO_CANDIDATES.forEach((candidate, order) => {
    const ivl = interval(candidate);
    const size = edoChroma(ivl, edo);
    const plain = /^[PMm]$/.test(ivl.q) ? 0 : 1;
    for (let step = 0; step < edo; step++) {
      // ups needed to reach `step` from this interval, the short way round
      const diff = (((step - size) % edo) + edo) % edo;
      const ups = diff > edo / 2 ? diff - edo : diff;
      const cost = [Math.abs(ups), plain, ups < 0 ? 1 : 0, order];
      const current = best[step];
      if (!current || compareCosts(cost, current.cost) < 0) {
        const arrows = ups < 0 ? "↓".repeat(-ups) : "↑".repeat(ups);
        best[step] = { name: arrows + candidate, cost };
      }
    }
  });
  return (edoNamesCache[edo] = best.map((b) => b.name));
}

function compareCosts(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
