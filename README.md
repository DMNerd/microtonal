# microtonal

**A microtonal fork of [Tonal](https://github.com/tonaljs/tonal)** — the music
theory library by [danigb](https://github.com/danigb) and contributors. All
credit for the original design and code goes to the Tonal project; this fork is
distributed under the same [MIT License](docs/LICENSE).

## Why this fork exists

Tonal models western music in 12-tone equal temperament (12-TET): note names,
intervals, pitch-class sets, chord and scale dictionaries all assume twelve
semitones per octave. That assumption is built into the core (12-bit chromas,
integer semitone accidentals, `% 12` arithmetic), so it can't be lifted with a
plugin or a custom dictionary.

`microtonal` extends Tonal to **any equal division of the octave (EDO)** — 19,
22, 24, 31-EDO and so on — while keeping 12-TET behaviour identical. It was
started to power the chord naming ("What's this chord?") and theory features of
a fretboard tuning visualizer that supports arbitrary EDOs, but it aims to be a
general-purpose library.

## How it works: ups and downs

The fork uses [ups and downs notation](https://en.xen.wiki/w/Ups_and_downs_notation)
(Kite), the standard way to spell notes in any EDO:

- Tonal already describes every note and interval as a number of **fifths** and
  **octaves**. That description is tuning-independent.
- The fork adds a third count, **ups** (`↑`, or `^` when typing) and **downs**
  (`↓`, or `v`), each one step of the EDO in use.
- A pitch's size in N-EDO is `fifths × F + octaves × N + ups`, where F is the
  EDO's best fifth, `round(N × log2(3/2))`. For 12-EDO F = 7, which reproduces
  Tonal's existing results exactly.

For example, in 24-EDO a sharp is 2 steps and an up is 1 (a quarter-tone), so
`E↓` is a quarter-tone below E, and a neutral third is `↓3M` (a major third,
one step down).

## Status

Developed on the `main` branch. Last synced with upstream Tonal `main` at
[`a1b98c3`](https://github.com/tonaljs/tonal/commit/a1b98c3c) (2026-10-01).

1. **Core pitch model** — _done_ (`pitch`, `pitch-note`, `pitch-interval`,
   `pitch-distance`, plus the `note` and `interval` helpers). See
   [Implemented so far](#implemented-so-far).
2. **Pitch-class sets and chords** — _done_ (`pcset`, `chord-type`,
   `chord-detect`, `chord`).
3. **Scales, keys and the rest** — _done_ (`scale-type`, `scale`,
   `roman-numeral`, `progression`, `abc-notation`; `key` and `mode` work
   through transposition). See [Not converted](#not-converted) for what
   stays 12-TET.
4. **Further EDO features** — _done_: sharp/flat spelling views
   (`Note.edoNames`), EDO profiles (fifths vs proportional sizing), respelling
   in any EDO (`simplify`/`enharmonic` with `{ edo }`), EDO ranges
   (`Range.chromatic` with `{ edo }`), four more maqamat.

### Implemented so far

#### Notes and intervals

**Ups and downs in names.** Notes and intervals accept ups/downs; names are
always written back with arrows (after the accidentals for notes, before the
number for intervals):

```js
import { Interval, Note } from "tonal";

Note.get("^C#4").name; // => "C#↑4"   (Kite's ASCII prefix also accepted)
Note.get("vEb").name; // => "Eb↓"
Note.get("E↓4").ups; // => -1
Interval.get("vM3").name; // => "↓3M"
Interval.get("-↑5P").name; // => "-↑5P"
```

A new `ups` property (`0` when there are none) is added to `Note` and
`Interval` objects and to the `Pitch` type. The fifths/octaves `coord` is
unchanged, so it still describes the unmarked note.

**Sizes in any EDO.** New functions give sizes in steps of N-EDO; ups and
downs are one step each:

```js
Note.edoSteps("E4", 24); // => 104   (C0 = 0)
Note.edoChroma("E↓", 24); // => 7    (quarter-tone below E)
Note.edoChroma("F#", 19); // => 9
Interval.edoSteps("↓3M", 24); // => 7  (neutral third)
Interval.edoSteps("-5P", 19); // => -11
```

The low-level versions live in `@tonaljs/pitch`: `edoSteps(pitch, edo)`,
`edoChroma(pitch, edo)`, `edoFifth(edo)` (the EDO's best fifth) and
`edoSharp(edo)` (size of a sharp: 1 in 12/19-EDO, 2 in 24/31-EDO).

**EDO profiles: fifths or proportional.** Stacking fifths only makes sense
when the EDO's fifth is close to 3/2 and a sharp is at least one step. In
28-EDO, say, fifths make the major third, the minor third and the diminished
fifth all 8 steps. `edoProfile(edo)` (in `@tonaljs/pitch`) classifies every
EDO:

```js
edoProfile(22);
// => { edo: 22, fifth: 13, sharp: 3, fifthErrorCents: 7.1, spelling: "fifths" }
edoProfile(28).spelling; // => "proportional"
```

An EDO is spelled by `"fifths"` when its sharp is at least one step and its
fifth is within 15 cents of a just fifth. The others are `"proportional"`:
7, 14, 21, 28, 35 (sharp of 0), 9, 11, 16, 23 (negative sharp) and 5, 6, 8,
10, 13, 15, 18, 20, 25, 30 (fifth 18 cents or more out). In a proportional
EDO, `edoSteps`/`edoChroma` (and everything built on them: pitch-class sets,
`forEdo`, chord and scale detection) scale the 12-TET size to the EDO,
rounded, and ups and downs stay one step each:

```js
Interval.edoSteps("3M", 22); // => 8  (fifths)
Interval.edoSteps("3M", 28); // => 9  (proportional: 4 × 28/12 = 9.33)
```

Microtonal chords and scales are only offered in EDOs spelled by fifths with
a sharp of at least two steps.

**Frequencies and step names.** `Note.edoFreq` tunes a note in any EDO
(A4 = 440Hz unless you pass another reference), and `Note.fromEdoSteps` names
an EDO step:

```js
Note.edoFreq("A↑4", 24); // => 452.89…  (a quarter tone above A4)
Note.edoFreq("C4", 19, { refNote: "C4", refFreq: 256 }); // => 256
Note.fromEdoSteps(104, 24); // => "E4"   (C0 = 0)
Note.fromEdoSteps(103, 24); // => "Eb↑4"
Note.fromEdoSteps(7, 24, { pitchClass: true }); // => "Eb↑"
```

Steps are spelled with the simplest name above C (fewest ups and downs), the
same rule as `Pcset.intervals`; `edoIntervalNames(edo)` in
`@tonaljs/pitch-interval` gives the whole list.

`Interval.fromEdoSteps` does the same for a signed interval size (whole
octaves included), and `Note.transposeEdoSteps` moves a note by a number of
steps, keeping its letter where it can:

```js
Interval.fromEdoSteps(7, 24); // => "↑3m"
Interval.fromEdoSteps(31, 24); // => "↑10m"
Interval.fromEdoSteps(-11, 19); // => "-5P"
Interval.fromEdoSteps(40, 41); // => "↓8P"  (an octave less one step)
Note.transposeEdoSteps("C#", 1, 24); // => "C#↑"
Note.transposeEdoSteps("E4", -1, 24); // => "E↓4"
```

In "proportional" EDOs, where a spelled interval can land on another step,
`transposeEdoSteps` respells the target step like `Note.edoNames` instead.
Interval names never wrap past the octave (no `7A` for a small step), so
`fromEdoSteps` always gives back the exact size: tested in EDOs 5 to 72.

**Invalid EDOs.** An EDO is a positive whole number (`isEdo` in
`@tonaljs/pitch`). Every function given anything else returns its empty
result: `NaN` for sizes, `[]` for lists, `""` for names, `null` for
frequencies and an empty set for `Pcset.get`. An `{ edo }` option that is
left out still means 12-EDO; an invalid one no longer falls back to 12
(`Chord.detect(notes, { edo: 0 })` => `[]`). `edoOption(options)` reads
the option the same way for your own functions.

**Sharp and flat views.** `Note.edoNames(edo, "sharp" | "flat")` spells every
pitch class of an EDO the way a sharp-leaning or flat-leaning note picker
would, and `Note.fromEdoSteps(steps, edo, { accidental })` uses the same
spelling:

```js
Note.edoNames(24, "sharp"); // => ["C", "C↑", "C#", "C#↑", "D", …]
Note.edoNames(24, "flat"); // => ["C", "Db↓", "Db", "D↓", "D", …]
Note.edoNames(19, "sharp"); // => ["C", "C#", "Db", "D", …, "E", "E#", "F", …]
Note.edoNames(31, "sharp"); // => ["C", "C↑", "C#", "Db", "Db↑", "D", …]
Note.edoNames(41, "sharp"); // => ["C", "C↑", "Db↓", "Db", "C#", "C#↑", "D↓", "D", …]
Note.fromEdoSteps(103, 24, { accidental: "sharp" }); // => "D#↑4"
```

Every natural, single and double sharp and flat, with any number of ups or
downs, is a candidate; the winner has, in order:

1. the fewest ups or downs, counting a double sharp or flat as one more (so
   31-EDO step 1 is `C↑`, not `B##`), and a spelling that lands on or past
   a neighbouring natural as one and a half more (so 41-EDO step 1 is `C↑`,
   not `B#`, which is above C there, and the 53-EDO 5/4 third is `E↓`, not
   `Fb`, which is below E). `E#` in 19-EDO lies between E and F, so it stays.
2. ups in the sharp view, downs in the flat view
3. the fewest accidentals
4. no `E#`, `B#`, `Cb` or `Fb` when something else ties (17-EDO step 1 is
   `Db`, not `B#`)
5. sharps in the sharp view, flats in the flat view

This reproduces the usual 12-TET names and needs no ups where the EDO has
enough sharps and flats (19-EDO). Every name spells its own step: tested for
both views in EDOs 5 to 72.

**Operations keep ups and downs:**

- `Note.transpose` / `Interval.distance` — `transpose("C4", "↓3M")` =>
  `"E↓4"`, `distance("C↑", "G")` => `"↓5P"`. A descending interval's ups
  count against its direction: `transpose("C4", "-↑3M")` => `"Ab↓3"`.
- `Note.transposeFifths`, `Note.transposeOctaves`,
  `Interval.transposeFifths`.
- `Interval.add` / `subtract` — `add("↓3M", "3m")` => `"↓5P"`.
- `Interval.invert` flips them — `invert("↓3M")` => `"↑6m"`.
- `Interval.simplify` — `simplify("↓10M")` => `"↓3M"`.
- `Note.simplify` / `Note.enharmonic` respell the note in 12-TET and keep
  the ups: `simplify("C##↑")` => `"D↑"`. That assumes C## = D, which holds in
  12- and 24-EDO but not in every EDO (in 19-EDO C## ≠ D). Pass `{ edo }` to
  respell the note's exact step in that EDO instead, with the spelling rules
  of `Note.edoNames`:

  ```js
  Note.simplify("C##", { edo: 19 }); // => "Db"  (C## is Db in 19-EDO)
  Note.simplify("E#", { edo: 19 }); // => "E#"  (E# is not F)
  Note.simplify("Db↑", { edo: 24 }); // => "D↓"
  Note.enharmonic("C#↑", undefined, { edo: 24 }); // => "D↓"
  Note.enharmonic("E#4", undefined, { edo: 19 }); // => "Fb4"
  Note.enharmonic("C#", "Db", { edo: 19 }); // => ""  (different steps)
  ```

  `simplify` keeps the note's direction (sharps and ups use the sharp view,
  flats and downs the flat view); `enharmonic` uses the other view, or checks
  that `destName` is the same step and gives it the right octave.

#### Pitch-class sets

A chroma of length N is a set of N-EDO pitch classes. Pass `{ edo }` to build
one from notes, intervals or a set number; every `Pcset` has a new `edo`
property (`12` for traditional sets):

```js
import { Pcset } from "tonal";

Pcset.get(["C", "E↓", "G"], { edo: 24 }).chroma;
// => "100000010000001000000000"
Pcset.intervals(["C", "E↓", "G"], { edo: 24 }); // => ["1P", "↑3m", "5P"]
Pcset.isEqual(["C", "E↓"], ["C", "Eb↑"], { edo: 24 }); // => true
```

- A chroma only counts as valid when its length matches the edo (12 by
  default), so upstream behaviour for malformed chromas is unchanged.
- A `Pcset` object keeps its own edo, so `isSubsetOf`, `isSupersetOf`,
  `isNoteIncludedIn`, `filter`, `modes` and `notes` work on N-EDO sets
  directly. Subset and equality checks compare chromas instead of 32-bit set
  numbers, so they work for any EDO. `setNum` itself is only exact up to
  53-EDO.
- `intervals` names each step with the simplest spelling: fewest ups/downs
  (an interval that lands on or past a neighbouring major scale degree costs
  one and a half more, like note names), then plain qualities (P, M, m)
  before augmented/diminished, then ups before downs. In 24-EDO the neutral
  third is `↑3m`; in 19-EDO step 1 is `1A`; in 41-EDO step 1 is `↑1P`, not
  `7A`, and in 53-EDO 4:5:6:7 is `1P ↓3M 5P ↓7m`.
- `Pcset.chromas()` still lists the 12-EDO chromas only.
- `normalized` (the smallest rotation starting with a pitch class) is found by
  comparing rotations in place on the chroma written twice, for every EDO.
  Upstream rotates the 12-bit set number with bit shifts, which can't hold
  EDOs past 31; the in-place scan gives the same results and is as fast in
  12-EDO (about 0.5 µs per new set in 53-EDO, versus 34 µs when building
  every rotation).

#### Chord types

A microtonal chord dictionary is added, spelled in ups and downs:

| Name                             | Intervals     | Symbol      |
| -------------------------------- | ------------- | ----------- |
| downmajor                        | 1P ↓3M 5P     | `(↓3)`, `n` |
| upmajor                          | 1P ↑3M 5P     | `(↑3)`      |
| upminor                          | 1P ↑3m 5P     | `m(↑3)`     |
| downminor                        | 1P ↓3m 5P     | `m(↓3)`     |
| suspended downsecond             | 1P ↓2M 5P     | `sus↓2`     |
| suspended upfourth               | 1P ↑4P 5P     | `sus↑4`     |
| dominant seventh downmajor third | 1P ↓3M 5P 7m  | `7(↓3)`     |
| downmajor seventh                | 1P ↓3M 5P ↓7m | `7(↓3,↓7)`  |
| harmonic seventh                 | 1P 3M 5P ↓7m  | `7(↓7)`     |
| upminor seventh                  | 1P ↑3m 5P ↑7m | `m7(↑3,↑7)` |
| downminor seventh                | 1P ↓3m 5P ↓7m | `m7(↓3,↓7)` |
| major seventh downmajor third    | 1P ↓3M 5P 7M  | `maj7(↓3)`  |
| minor downmajor seventh          | 1P 3m 5P ↓7M  | `m(↓maj7)`  |

The 7-limit chords are found where they are spelled this way: 4:5:6:7 is
`7(↓7)` in 24- and 31-EDO, `7(↓3)` in 22-EDO and `7(↓3,↓7)` in 41- and
53-EDO; 12:14:18:21 is `m7(↓3,↓7)` in 24, 31, 41 and 53-EDO (plain `m7` in
22-EDO). EDOs that need two ups or downs for them (72-EDO) and EDOs without
ups (19-EDO, where 4:5:6:7 is `1P 3M 5P 6A`) don't name them yet.

Symbols put the altered degrees in parentheses: `^` already means major in
Tonal (`C^7`), and an arrow straight after the root is read as part of the
root (`C↓7` is a C↓ dominant seventh).

- `ChordType.get` finds these by name or symbol. `ChordType.all()` still
  returns only the 107 traditional chords, and the 12-EDO chroma index is
  untouched: in 12-EDO `↓3M` is just `3m`, so a downmajor chord would
  otherwise shadow the minor chord. `ChordType.allMicrotonal()` lists them.
- `ChordType.forEdo(edo)` returns the chord types of an EDO, with `chroma`,
  `setNum`, `normalized` and `edo` computed in that EDO. It leaves out chords
  whose tones merge in that EDO. It includes microtonal chords only where an
  up is smaller than a sharp (17, 22, 24, 31, 41, 53-EDO…), and only when
  they differ from every traditional chord. When two microtonal chords are the
  same set, the first one listed wins: in 24-EDO downmajor and upminor are the
  same neutral triad, so it is named `(↓3)`.

#### Chord detection and chords

`detect` takes an `edo` option:

```js
import { Chord } from "tonal";

Chord.detect(["C", "E↓", "G"], { edo: 24 }); // => ["C(↓3)"]
Chord.detect(["C", "Eb↑", "G"], { edo: 24 }); // => ["C(↓3)"]
Chord.detect(["E↓", "G", "C"], { edo: 24 }); // => ["C(↓3)/E↓"]
Chord.detect(["C", "E", "G"], { edo: 31 }); // => ["CM", …]
```

- In EDOs other than 12, the notes are compared as pitch classes of that EDO
  against `ChordType.forEdo(edo)`.
- `assumePerfectFifth` works in any EDO. Its hard-coded 12-bit masks are
  replaced by step ranges derived from the EDO; they give the same steps in
  12-EDO.
- `Chord.get` understands upped or downed roots and basses (`"E↓m"`,
  `"^Ebmaj7"`, `"C(↓3)/E↓"`) and the microtonal chord types:
  `Chord.get("C(↓3)").notes` => `["C", "E↓", "G"]`. Inversions keep their
  ups, and `Chord.transpose("Cm", "↓2M")` => `"D↓m"`.

**Detection ranking (changed from upstream).** Upstream Tonal lists every
chord rooted on the bass before any inversion, so a plain first-inversion C
major, `detect(["E", "C", "G"])`, came out as `["Em#5", "CM/E"]`. The fork
ranks by how common the chord type is, with half a step of penalty for an
inversion, and now returns `["CM/E", "Em#5"]`.

`ChordType.tier(type)` gives the ranking tier, taken from the sections of
Tonal's own chord list:

- 0: the named major, minor, diminished, dominant and suspended chords, and
  the microtonal chords
- 1: the other named chords (`5`, `aug`, `m#5`, `maj7#5`, `maj9#11`) and
  chords added with `ChordType.add`
- 2: the unnamed "legacy" chords (`7no5`, `Madd9`, `7#5`…)

Results sort by tier, plus 0.5 for inversions; ties keep upstream's order. No
upstream test changed: they only cover cases where both orders agree.

#### Scales

A microtonal scale dictionary is added, starting with Arabic maqamat
(ascending forms, from [Maqam World](https://www.maqamworld.com/en/maqam.php)):

| Name   | Intervals                  | Notes (traditional tonic) |
| ------ | -------------------------- | ------------------------- |
| rast   | 1P 2M ↓3M 4P 5P 6M ↓7M     | C D E↓ F G A B↓           |
| bayati | 1P ↓2M 3m 4P 5P 6m 7m      | D E↓ F G A Bb C           |
| saba   | 1P ↓2M 3m 4d 5P 6m 7m      | D E↓ F Gb A Bb C          |
| sikah  | 1P ↑2m ↑3m ↑4P 5P ↑6m ↑7m  | E↓ F G A B↓ C D           |
| huzam  | 1P ↑2m ↑3m ↑4d ↑5P ↑6m ↑7m | E↓ F G Ab B C D           |
| iraq   | 1P ↑2m ↑3m 4P ↑5d ↑6m ↑7m  | B↓ C D E↓ F G A           |
| nairuz | 1P 2M ↓3M 4P 5P ↓6M 7m     | C D E↓ F G A↓ Bb          |
| suznak | 1P 2M ↓3M 4P 5P 6m 7M      | C D E↓ F G Ab B           |

Maqam World shows the scales as images, so huzam, 'iraq, nairuz and suznak are
built from the ajnas each page names (huzam: Sikah on the tonic, Hijaz on the
3rd, Rast on the 6th; 'iraq: Sikah, Bayati on the 3rd, Rast on the 6th;
nairuz: Rast, Bayati on the 5th; suznak: Rast, Hijaz on the 5th). Maqamat
whose pages don't pin every note down are left out: jiharkah's 3rd and 4th
degrees are "played lower than notated" by no fixed amount, and husayni's
page only names its lower jins.

They follow the same rules as the microtonal chords: reachable by name
(`Scale.get("C rast")`, aliases like `"maqam rast"` and `"segah"`), not part
of `ScaleType.all()` or `Scale.names()`, listed by
`ScaleType.allMicrotonal()`, and included by `ScaleType.forEdo(edo)` only
where an up is smaller than a sharp.

`Scale` functions take an `edo` option:

```js
import { Scale } from "tonal";

Scale.get("E↓ sikah").notes; // => ["E↓", "F", "G", "A", "B↓", "C", "D"]
Scale.detect(["C", "D", "E↓", "F", "G", "A", "B↓"], { edo: 24 });
// => ["C rast"]
Scale.scaleChords("rast", { edo: 24 }); // => [..., "(↓3)", ...]
Scale.modeNames("C rast", { edo: 24 }); // => [["C", "rast"], ["E↓", "sikah"]]
Scale.rangeOf("C rast", { edo: 24 })("C4", "C5");
// => ["C4", "D4", "E↓4", "F4", "G4", "A4", "B↓4", "C5"]
```

`detect`, `scaleChords`, `extended`, `reduced`, `modeNames` and `rangeOf`
accept `{ edo }`; without it they behave exactly as upstream. `get`,
`degrees` and `steps` need no option since they only transpose.

#### Keys, modes, roman numerals and progressions

- `Key` and `Mode` work with upped or downed tonics, since they transpose
  12-TET patterns: `Key.majorKey("E↓").scale` =>
  `["E↓", "F#↓", "G#↓", "A↓", "B↓", "C#↓", "D#↓"]`.
- Roman numerals take ups and downs in front: `RomanNumeral.get("↓III")`
  has interval `"↓3M"`. Only `↑`, `↓` and `^` are accepted, since `v` is the
  numeral five. Roman numeral objects get an `ups` property.
- `Progression.toRomanNumerals("C", ["E↓m"])` => `["↓IIIm"]`, and
  `fromRomanNumerals("C", ["↓III"])` => `["E↓"]`.
- `AbcNotation.scientificToAbcNotation` returns `""` for notes with ups or
  downs (ABC has no standard for them) instead of silently dropping them.

#### Ranges

`Range.chromatic` takes an `edo` option: it counts in steps of that EDO
(numbers are EDO steps, C0 = 0) and spells the notes like `Note.edoNames`,
with flats and downs unless `sharps` is set:

```js
Range.chromatic(["C4", "D4"], { edo: 24 });
// => ["C4", "Db↓4", "Db4", "D↓4", "D4"]
Range.chromatic(["C4", "D4"], { edo: 24, sharps: true });
// => ["C4", "C↑4", "C#4", "C#↑4", "D4"]
```

`Range.numeric` stays in MIDI numbers.

#### Not converted

These stay 12-TET: `midi` and `Note.freq`/`Note.midi` (use `Note.edoFreq`),
`Range.numeric`, `voicing`, `voice-leading` and
`voicing-dictionary`, `Pcset.chromas()`, the `chroma`/`setNum` fields of
`Chord.get`, `Scale.get` and the dictionaries (use `forEdo` or
`Pcset.get(…, { edo })`), and the Greek `mode` dictionary. Chord symbols with
an upped root followed by a type starting with `b` (`C↓b9sus`) don't parse,
the same ambiguity upstream has with `Cb9sus`.

#### 12-TET compatibility

Every upstream test still passes. Upstream fixes are merged in as they land
(see [Status](#status) for the last sync); the upstream `maj11` chord type is
named, so it ranks with the core chords in detection. The only changes to them add the new `ups: 0`
and `edo: 12` fields to expected property objects and snapshots. Legacy
properties such as `chroma`, `midi`, `height`, `semitones` and `freq` stay
12-TET; they treat an up or down as one semitone, which is its size in
12-EDO.

#### Deliberate differences from upstream

Behaviour that changes even for plain 12-TET input:

- **Chord detection ranking**: common chords in inversion come before rare
  chords in root position (`E C G` => `CM/E` first, upstream: `Em#5`). See
  [Chord detection and chords](#chord-detection-and-chords).

Every future fix that changes upstream behaviour is listed here.

Until the fork is published, packages keep their `@tonaljs/*` names, and the
install instructions below still refer to upstream Tonal. Use this repository
directly (e.g. as a local or git dependency) to get the microtonal features.

---

The rest of this README is the upstream Tonal documentation.

## About Tonal

`tonal` is a music theory library. Contains functions to manipulate tonal
elements of music (note, intervals, chords, scales, modes, keys). It deals with
abstractions (not actual music or sound).

`tonal` is implemented in Typescript and published as a collection of Javascript
npm packages.

It uses a functional programming style: all functions are pure, there is no data
mutation, and entities are represented by data structures instead of objects.

## Example

```js
import { Chord, Interval, Note, Scale } from "tonal";

Note.midi("C4"); // => 60
Note.freq("a4"); // => 440
Note.accidentals("c#2"); // => '#'
Note.transpose("C4", "5P"); // => "G4"
Interval.semitones("5P"); // => 7
Interval.distance("C4", "G4"); // => "5P"

// Scales
Scale.get("C major").notes; // => ["C", "D", "E", "F", "G", "A", "B"];
[1, 3, 5, 7].map(Scale.degrees("C major")); // => ["C", "E", "G", "B"]

Chord.get("Cmaj7").name; // => "C major seventh"

// Chord inversions
const triad = Chord.degrees("Cm");
[1, 2, 3].map(triad); // => ["C", "Eb", "G"];
[2, 3, 1].map(triad); // => ["Eb", "G", "C"];
[3, 1, 2].map(triad); // => ["G", "C", "Eb"];
```

## Install

Install all packages at once:

```bash
npm install --save tonal
```

You can read [CHANGELOG here](https://github.com/tonaljs/tonal/blob/main/docs/CHANGELOG.md).

## Usage

Tonal is compatible with both ES5 and ES6 modules, and browser.

#### ES6 `import`:

```js
import { Note, Scale } from "tonal";
```

#### ES5 `require`:

```js
const { Note, Scale } = require("tonal");
```

#### Browser

You can use the browser version from jsdelivr CDN directly in your html:

```html
<script src="https://cdn.jsdelivr.net/npm/tonal/browser/tonal.min.js"></script>
<script>
  console.log(Tonal.Key.minorKey("Ab"));
</script>
```

Or if you prefer, grab the
[minified browser ready version](https://raw.githubusercontent.com/tonaljs/tonal/master/packages/tonal/browser/tonal.min.js)
from the repository.

#### Bundle size

`tonal` includes all published modules.

Although the final bundle it is small, you can
reduce bundle sizes even more by installing the modules individually, and
importing only the functions you need.

Note that individual modules are prefixed with `@tonaljs/`. For example:

```bash
npm i @tonaljs/note
```

```js
import { transpose } from "@tonaljs/note";
transpose("A4", "P5");
```

## Documentation

Visit the [documentation site](https://tonaljs.github.io/tonal/docs) or the README.md of each module 👇

#### Notes and intervals

- [@tonaljs/note](/packages/note): Note operations (simplify, transposeBy )
- [@tonaljs/midi](/packages/midi): Midi number conversions
- [@tonaljs/interval](/packages/interval): Interval operations (add, simplify,
  invert)
- [@tonaljs/abc-notation](/packages/abc-notation): Parse ABC
  notation notes

#### Scales and chords

- [@tonaljs/scale](/packages/scale): Scales
- [@tonaljs/scale-type](/packages/scale-type): A dictionary of scales
- [@tonaljs/chord](/packages/chord): Chords
- [@tonaljs/chord-type](/packages/chord-type): A dictionary of chords
- [@tonaljs/chord-detect](/packages/chord-detect): Detect chords from notes
- [@tonaljs/pcset](/packages/pcset): Pitch class sets. Compare note groups.

#### Voicings

- [@tonaljs/voicing](/packages/voicing/): Voicings and voice leadings for chords
- [@tonaljs/voice-leading](/packages/voice-leading/): Voice leading logic for transitions between voicings
- [@tonaljs/voicing-dictionary](/packages/voicing-dictionary/): Collections of chord voicings

#### Keys, chord progressions

- [@tonaljs/key](/packages/key): Major and minor keys, it's scales and chords
- [@tonaljs/mode](/packages/mode): A dictionary of Greek modes (ionian,
  dorian...)
- [@tonaljs/progression](/packages/progression): Chord progressions
- [@tonaljs/roman-numeral](/packages/roman-numeral): Parse roman numeral symbols

#### Time, rhythm

- [@tonaljs/rhythm-pattern](/packages/rhythm-pattern): Generate and manipulate rhythmic patterns
- [@tonaljs/time-signature](/packages/time-signature): Parse time signatures
- [@tonaljs/duration-value](/packages/duration-value): Note duration values

#### Utilities

- [@tonaljs/core](/packages/core): Core functions (note, interval, transpose and
  distance)
- [@tonaljs/collection](/packages/collection): Utility functions to work with
  collections (range, shuffle, permutations)
- [@tonaljs/range](/packages/range): Create note ranges

## Contributing

Read [contributing document](/docs/CONTRIBUTING.md). To contribute open a PR and ensure:

- If is a music theory change (like the name of a scale) link to reliable references.
- If is a new feature, add documentation: changes to README of the affected module(s) are expected.
- Ad tests: changes to the test.ts file of the affected module(s) are expected.
- All tests are green

## Inspiration

This library takes inspiration from other music theory libraries:

- Teoria: https://github.com/saebekassebil/teoria
- Impro-Visor: https://www.cs.hmc.edu/~keller/jazz/improvisor/
- MusicKit: https://github.com/benzguo/MusicKit
- Music21: https://www.music21.org/music21docs/
- Sharp11: https://github.com/jsrmath/sharp11
- python-mingus: https://github.com/bspaans/python-mingus
- Open Music Theory: https://viva.pressbooks.pub/openmusictheory/

## Projects using tonal

Showcase of projects that are using Tonal:

- [Solfej](https://www.solfej.io/) by
  [Shayan Javadi](https://github.com/ShayanJavadi)
- [EarBeater](https://www.earbeater.com/online-ear-training/) by
  [Morten Vestergaard](https://github.com/vellebelle)
- [Sonid](https://sonid.app/)
  ([play store](https://play.google.com/store/apps/details?id=org.stroopwafel.music.app),
  [apple store](https://apps.apple.com/us/app/sonid/id1490221762?ls=1)) by
  [martijnmichel](https://github.com/martijnmichel)
- [Songcraft](https://songcraft.io/) by
  [Gabe G'Sell](https://github.com/gabergg)
- [React Guitar](https://react-guitar.com/) by
  [4lejandrito](https://github.com/4lejandrito)
- [Fretty.app](https://fretty.app/) by [tfeldmann](https://github.com/tfeldmann)
- [Chordify](https://ashleymays.github.io/Chordify) by [ashleymays](https://github.com/ashleymays)
- [Chordal](https://chordal.vercel.app) by [kad1kad](https://github.com/kad1kad)
- [muted.io](https://muted.io/) by [thisisseb](https://github.com/thisisseb)
- [Midi Sandbox](https://midisandbox.com/) by [jdlee022](https://github.com/jdlee022)
- [music, eternal](https://eternal.rob.computer) by [kousun12](https://github.com/kousun12)
- [Chromatone.center](https://chromatone.center) by [davay42](https://github.com/davay42)
- [Super Oscillator](https://github.com/lukehorvat/super-oscillator) by [lukehorvat](https://github.com/lukehorvat)
- [StringScales](https://stringscales.com/) by [Ambewas](https://github.com/ambewas)
- [Polychron](https://github.com/PolychronMidi/Polychron) by [i1li](https://github.com/i1li)
- [MusicTrainer](https://musictrainer.barnman.cc) by [zilongliu](https://github.com/Zilong-L)
- [RiffScore](https://riffscore.netlify.app/) by [joekotvas](https://github.com/joekotvas/)

Thank you all!

Add your project here by
[editing this file](https://github.com/tonaljs/tonal/edit/main/README.md)

## License

[MIT License](docs/LICENSE)
