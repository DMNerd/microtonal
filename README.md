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

## Install

```bash
npm install @dmnerd/microtonal
```

The API is Tonal's, so code written for `tonal` works after changing the
import:

```js
import { Chord, Interval, Note } from "@dmnerd/microtonal"; // was "tonal"

Note.edoSteps("↓E4", 24); // => 103
Chord.get("C7sus4no5").notes; // => ["C", "F", "Bb"]
```

Upstream publishes every module as its own package (`@tonaljs/note`, ...).
This fork publishes one package with no dependencies; each module is also a
subpath, so `@tonaljs/<module>` becomes `@dmnerd/microtonal/<module>`:

```js
import { transpose } from "@dmnerd/microtonal/note"; // was "@tonaljs/note"
```

It ships ES modules, CommonJS (`require`) and TypeScript types. In the
browser, use an ES module CDN such as
`https://cdn.jsdelivr.net/npm/@dmnerd/microtonal/+esm`; there is no
`<script>` build with a global like upstream's `tonal.min.js`.

## How it works: ups and downs

The fork uses Kite Giedraitis's ups and downs notation, the standard way to
spell notes in any EDO. It follows his
[Notation Guide for EDOs 5-72](http://tallkite.com/misc_files/notation%20guide%20for%20edos%205-72.pdf)
(from his book _Alternative Tunings: Theory, Notation and Practice_), and the
[Xenharmonic Wiki page](https://en.xen.wiki/w/Kite%27s_ups_and_downs_notation)
where the guide is silent:

- Tonal already describes every note and interval as a number of **fifths** and
  **octaves**. That description is tuning-independent.
- The fork adds a third count, **ups** (`↑`, or `^` when typing) and **downs**
  (`↓`, or `v`), each one step of the EDO in use.
- A pitch's size in N-EDO is `fifths × F + octaves × N + ups`, where F is the
  EDO's best fifth, `round(N × log2(3/2))`. For 12-EDO F = 7, which reproduces
  Tonal's existing results exactly.

For example, in 24-EDO a sharp is 2 steps and an up is 1 (a quarter-tone), so
`↓E` is a quarter-tone below E, and the neutral third halfway between minor and
major is the mid third `3~`.

Names follow Kite's notation: the arrows come before the note (`↑Db4`),
plain qualities take ups and downs (31-EDO `↑2M`, `↓3m`, not `3d`, `2A`), a
perfect interval with arrows drops its quality (`↑4`, `↓8`), the interval
halfway between two qualities is mid (`~`), intervals have no quality where a
sharp is 0 steps (`↑3` in 14-EDO), and chord symbols use global arrows,
added notes and alterations (`C↓7`, `C,↓7`, `C(↓5)`). EDOs where a sharp is
one step (12, 19) need no arrows at all.

Where the fork writes things differently, it is to stay compatible with
Tonal:

- **Arrow glyphs**: names are written with `↑` and `↓`. Kite's ASCII `^` and
  `v` are read as input (`^Db`, `vM3`, `Cv7`, `vVI`), but `^` already means
  major in Tonal chord symbols, so the glyphs keep both readable.
- **Interval order**: Tonal writes the number first (`3M`, `5P`), so Kite's
  `vM3` is `↓3M` and `~3` is `3~`. Kite's order is read as input.
- **`^` in chord symbols**: where `^` forms a Tonal chord symbol it keeps
  Tonal's meaning (`C^7` is C major seventh, `C^` is C major). Write Kite's
  up-seven as `C↑7`.
- **Suspended chords**: a bare `C2` or `C4` is Tonal's add9 or quartal chord;
  with an arrow or other notes (`C↓4`, `C4,6`) it is Kite's suspended chord.
- **Harmonic and subharmonic chords** are `har7` and `sub7` only: `h7` is
  Tonal's half-diminished chord.
- **Many arrows** are repeated (`↑↑↑↑`); Kite's shorthand for four or more
  (`v>`, `>`) is not used.
- **11th and 13th chords**: a bare `C11` or `C13` is Tonal's chord, without
  the 3rd or the 11th. With arrows, added notes or alterations (`C↑11`,
  `C↓M13`) they have every lower degree, as Kite defines them.

See [Notes and intervals](#notes-and-intervals) and
[Chord types](#chord-types).

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
5. **Steps and spelling** — _done_: `Interval.fromEdoSteps`,
   `Note.transposeEdoSteps`, one rule for invalid EDOs (`isEdo`,
   `edoOption`), spellings that don't cross a neighbouring natural, interval
   names with plain qualities and arrows as in Kite's notation, 7-limit
   chords (harmonic and downminor seventh), every EDO spelled by fifths as on
   the Xenharmonic Wiki, with a global proportional fallback
   (`setEdoSpelling`) and per-EDO overrides (`setEdoProfile`).
6. **Scales of other EDOs** — _done_: mahur and bayati shuri, the seven mosh
   (mohajira) modes, and temperament scales built per EDO from their
   generator (`ScaleType.addTemperament`, `Scale.get(name, { edo })`).
7. **More microtonal chords** — _done_: harmonic and subharmonic chords
   (`har7`, `sub7`…) built per EDO from their ratios
   (`ChordType.addFromRatios`, `Chord.get(name, { edo })`).
8. **Microtonal MIDI** — _done_: `Note.edoMidi` and `Midi.freqToMidiBend`
   (MIDI note plus pitch bend).

9. **Published to npm** — _done_: as one package,
   [`@dmnerd/microtonal`](https://www.npmjs.com/package/@dmnerd/microtonal).
   See [Install](#install) and [Releasing](#releasing).
10. **Kite's notation throughout** — _done_: arrows before the note, mid
    intervals (`3~`), no quality on perfect intervals with arrows or where a
    sharp is 0 steps, Kite's chord names (`ChordType.get` reads global
    arrows, added notes and alterations), `vVI` roman numerals.
11. **Kite's notation guide** — _done_: interval names follow the guide's
    Table 2.1 in every EDO (with upmid and downmid where a sharp is odd),
    mid notes are spelled from the nearer quality, picker views prefer plain
    letters with arrows and stacked accidentals where a sharp is one step,
    and chord names follow Section 3 (alterations replace arrows,
    `CvmM7`, 11th and 13th chords). Checked against the guide's tables:
    every one of its note spellings lands on its step, and 304 of its 306
    chord names give its notes (the rest are bare `C4`, `C2`, `C11`, `C13`).

### Syncing with upstream

Upstream fixes are merged, not rebased, so the history of both stays intact:

```sh
git remote add upstream https://github.com/tonaljs/tonal.git  # once
git fetch upstream
git merge upstream/main
npm run lint && npm run build && npx vitest run
```

Conflicts usually come from code both sides changed: the chord and scale
dictionaries (`chord-type`, `scale-type`: keep the microtonal list and EDO
caches), `Pcset` normalization (keep the in-place scan that works in any EDO),
and the browser bundle (rebuild it). Upstream tests that count dictionary
entries or snapshot exports may need their numbers updated; any change in
behaviour goes in [Deliberate differences](#deliberate-differences-from-upstream).
Then update the last sync commit above.

### Releasing

The package is built from `packages/microtonal`. It bundles every workspace
package from source (the internal `@tonaljs/*` names never reach npm), so the
other packages don't need building or publishing first. Don't use
`npm run publish-packages`: that is upstream's flow for the `@tonaljs/*`
packages.

```sh
npm run test:all                                 # format, lint, build, test
npm version <patch|minor|major> -w @dmnerd/microtonal --no-git-tag-version
npm publish -w @dmnerd/microtonal                # builds it again first
```

Then commit the version bump and tag it (`git tag microtonal@<version>`).
Versions follow semver for this package alone, unrelated to Tonal's versions.

### Implemented so far

#### Notes and intervals

**Ups and downs in names.** Notes and intervals accept ups/downs; names are
always written back with arrows before the note, and before the number for
intervals. A perfect interval with arrows has no quality, as in Kite's
notation:

```js
import { Interval, Note } from "@dmnerd/microtonal";

Note.get("^C#4").name; // => "↑C#4"   (Kite's ASCII also accepted)
Note.get("C#↑4").name; // => "↑C#4"   (so are arrows after the note)
Note.get("vEb").name; // => "↓Eb"
Note.get("↓E4").ups; // => -1
Interval.get("vM3").name; // => "↓3M"
Interval.get("^P4").name; // => "↑4"
Interval.get("-↑5P").name; // => "-↑5"
```

A new `ups` property (`0` when there are none) is added to `Note` and
`Interval` objects and to the `Pitch` type. The fifths/octaves `coord` is
unchanged, so it still describes the unmarked note.

**Mid intervals.** Kite's mid (`~`) is the interval halfway between minor and
major, between perfect and augmented (4th), or between perfect and
diminished (5th). It is a step where a sharp is an even number of steps.
Where a sharp is odd, the mid falls between two steps, and the first up or
down reaches the nearest one: in 53-EDO `↓3~` and `↑3~` are the two steps
around the neutral third (Kite's downmid and upmid).

```js
Interval.get("~3").name; // => "3~"
Interval.edoSteps("3~", 24); // => 7   (the neutral third)
Interval.edoSteps("3~", 41); // => 12
Interval.edoSteps("3~", 53); // => NaN (between steps 15 and 16)
Interval.edoSteps("↓3~", 53); // => 15
Interval.invert("3~"); // => "6~"
edoPlainInterval("3~", 24); // => "↓3M"  (the same step without a mid)
```

A mid is stored as half an accidental (`alt` of `-0.5` or `0.5`), so its
legacy `semitones` is fractional (`3.5`). Notes can't be mid: transposing by a
mid needs an EDO: `transpose("C", "3~", 24)` => `"↓E"`, and the `edo`
option of `Chord.get` and `Scale.get` passes it on. A mid note is spelled
from the nearer of major and minor, as the guide does (24-EDO `↓E`, 53-EDO
`↓3~` is `↑↑Eb`), ties going to downs. In EDOs where a sharp is 0 steps,
`transpose` with an EDO leaves out sharps and flats, which move nothing
there (14-EDO `transpose("D", "3M", 14)` => `"F"`).

**Intervals without a quality.** Where a sharp is 0 steps (7, 14, 21, 28,
35-EDO) major and minor are the same size, and Kite leaves the quality out.
An interval written without one (`"3"`, `"↑3"`) is read as major or
perfect (`Interval.get("3").name` is `"3M"`); names without a quality are
only written for those EDOs.

**Sizes in any EDO.** New functions give sizes in steps of N-EDO; ups and
downs are one step each:

```js
Note.edoSteps("E4", 24); // => 104   (C0 = 0)
Note.edoChroma("↓E", 24); // => 7    (quarter-tone below E)
Note.edoChroma("F#", 19); // => 9
Interval.edoSteps("↓3M", 24); // => 7  (neutral third)
Interval.edoSteps("-5P", 19); // => -11
```

The low-level versions are exported from the package root: `edoSteps(pitch, edo)`,
`edoChroma(pitch, edo)`, `edoFifth(edo)` (the EDO's best fifth) and
`edoSharp(edo)` (size of a sharp: 1 in 12/19-EDO, 2 in 24/31-EDO).

**EDO profiles: fifths or proportional.** Like the Xenharmonic Wiki, the
fork spells every EDO by stacking fifths. `edoProfile(edo)` gives the fifth, the size of a sharp and how far the fifth
is from 3/2:

```js
edoProfile(22);
// => { edo: 22, fifth: 13, sharp: 3, fifthErrorCents: 7.1, spelling: "fifths" }
edoProfile(13).fifth; // => 7  (its best fifth, 8, makes the minor 2nd descend)
edoSharp(28); // => 0   (sharps don't move the pitch: only ups and downs do)
edoSharp(16); // => -1  (a sharp lowers the pitch, major is narrower than minor)
```

- The fifth is the EDO's best one, except where that makes the minor second
  descend (13- and 18-EDO), which use the next narrower fifth.
- A sharp of 0 (7, 14, 21, 28, 35-EDO) makes major and minor the same size;
  a negative sharp (9, 11, 16, 23-EDO) makes major narrower than minor.
  Interval arithmetic still works, as the wiki's "harmonic notation".
- EDOs below 5, 6-EDO and 8-EDO are `"proportional"` (the wiki writes 6 and 8
  as subsets of 12- and 24-EDO): `edoSteps`/`edoChroma` (and everything built
  on them: pitch-class sets, `forEdo`, chord and scale detection) scale the
  12-TET size to the EDO, rounded, and ups and downs stay one step each.

Apps that want a major and a minor triad to stay apart in every EDO can
switch to the **proportional fallback**, which spells an EDO by fifths only
when a sharp is at least one step and the fifth is within 15 cents of 3/2,
and sizes the others proportionally (5–11, 13–16, 18, 20, 21, 23, 25, 28, 30
and 35-EDO). Single EDOs can be overridden either way, or given another
fifth, e.g. for EDOs with two usable fifths:

```js
setEdoSpelling("proportional-fallback"); // every EDO without an override
Interval.edoSteps("3M", 28); // => 9  (proportional: 4 × 28/12 = 9.33)
setEdoProfile(28, { spelling: "fifths" }); // just 28-EDO by fifths again
setEdoProfile(57, { fifth: 34 }); // 57-EDO by its sharp fifth (34\57)
setEdoProfile(57); // remove the override
```

Every per-EDO result (names, sets, chord and scale types) is cached by
`edoKey(edo)`, which changes with the settings, so they can change at any
time.

Microtonal chords and scales are only offered in EDOs spelled by fifths with
a sharp of at least two steps.

**Frequencies, MIDI and step names.** `Note.edoFreq` tunes a note in any
EDO (A4 = 440Hz unless you pass another reference), `Note.edoMidi` gives the
MIDI note and 14-bit pitch bend that play it (8192 is no bend; the bend range
is ±2 semitones unless `bendRange` is set, and it must match the synth's), and
`Note.fromEdoSteps` names an EDO step. `Midi.freqToMidiBend(freq)` does the
MIDI part for any frequency:

```js
Note.edoFreq("↑A4", 24); // => 452.89…  (a quarter tone above A4)
Note.edoFreq("C4", 19, { refNote: "C4", refFreq: 256 }); // => 256
Note.edoMidi("↓E4", 24); // => { midi: 64, cents: -50, bend: 6144 }
Note.fromEdoSteps(104, 24); // => "E4"   (C0 = 0)
Note.fromEdoSteps(103, 24); // => "↓E4"
Note.fromEdoSteps(7, 24, { pitchClass: true }); // => "↓E"
```

Steps are spelled with the simplest name above C (fewest ups and downs), the
same rule as `Pcset.intervals`; `edoIntervalNames(edo)` gives the whole list.

`Interval.fromEdoSteps` does the same for a signed interval size (whole
octaves included), and `Note.transposeEdoSteps` moves a note by a number of
steps, keeping its letter where it can:

```js
Interval.fromEdoSteps(7, 24); // => "3~"
Interval.fromEdoSteps(31, 24); // => "10~"
Interval.fromEdoSteps(-11, 19); // => "-5P"
Interval.fromEdoSteps(40, 41); // => "↓8"  (an octave less one step)
Note.transposeEdoSteps("C#", 1, 24); // => "↑C#"
Note.transposeEdoSteps("E4", -1, 24); // => "↓E4"
```

In "proportional" EDOs, where a spelled interval can land on another step,
`transposeEdoSteps` respells the target step like `Note.edoNames` instead.
Interval names never wrap past the octave (no `7A` for a small step), so
`fromEdoSteps` always gives back the exact size: tested in EDOs 5 to 72.

**Invalid EDOs.** An EDO is a positive whole number (`isEdo`). Every function given anything else returns its empty
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
Note.edoNames(24, "sharp"); // => ["C", "↑C", "C#", "↓D", "D", …]
Note.edoNames(24, "flat"); // => ["C", "↑C", "Db", "↓D", "D", …]
Note.edoNames(19, "sharp"); // => ["C", "C#", "Db", "D", …, "E", "E#", "F", …]
Note.edoNames(31, "sharp"); // => ["C", "↑C", "C#", "Db", "↓D", "D", …]
Note.edoNames(26, "sharp"); // => ["C", "C#", "C##", "Db", "D", …]
Note.fromEdoSteps(103, 24, { accidental: "sharp" }); // => "↓E4"
```

Every natural and up to triple sharp and flat, with any number of ups or
downs, is a candidate; the winner has, in order:

1. the fewest ups or downs, counting each accidental past the first as one
   more (so 31-EDO step 1 is `↑C`, not `B##`), and a spelling that lands on
   or past a neighbouring natural as one and a half more (so 41-EDO step 1
   is `↑C`, not `B#`, which is above C there, and the 53-EDO 5/4 third is
   `↓E`, not `Fb`, which is below E). `E#` in 19-EDO lies between E and F, so
   it stays. Where a sharp is one step (12, 19, 26, 33, 40, 47-EDO), ups and
   downs aren't used at all: stacked accidentals instead (26-EDO `C##`).
2. the fewest accidentals: a plain letter with an arrow before an accidental
   with one (24-EDO `↓D`, not `↑C#`), as the notation guide spells notes
3. ups in the sharp view, downs in the flat view
4. no `E#`, `B#`, `Cb` or `Fb` when something else ties (17-EDO step 1 is
   `Db`, not `B#`)
5. sharps in the sharp view, flats in the flat view

This reproduces the usual 12-TET names and needs no ups where the EDO has
enough sharps and flats (19-EDO). Every name spells its own step: tested for
both views in EDOs 5 to 72, and the names are among those the notation guide
lists for each step (except four in 18b, 59 and 64-EDO).

**Operations keep ups and downs:**

- `Note.transpose` / `Interval.distance` — `transpose("C4", "↓3M")` =>
  `"↓E4"`, `distance("↑C", "G")` => `"↓5"`. A descending interval's ups
  count against its direction: `transpose("C4", "-↑3M")` => `"↓Ab3"`.
- `Note.transposeFifths`, `Note.transposeOctaves`,
  `Interval.transposeFifths`.
- `Interval.add` / `subtract` — `add("↓3M", "3m")` => `"↓5"`.
- `Interval.invert` flips them — `invert("↓3M")` => `"↑6m"`.
- `Interval.simplify` — `simplify("↓10M")` => `"↓3M"`.
- `Note.simplify` / `Note.enharmonic` respell the note in 12-TET and keep
  the ups: `simplify("↑C##")` => `"↑D"`. That assumes C## = D, which holds in
  12- and 24-EDO but not in every EDO (in 19-EDO C## ≠ D). Pass `{ edo }` to
  respell the note's exact step in that EDO instead, with the spelling rules
  of `Note.edoNames`:

  ```js
  Note.simplify("C##", { edo: 19 }); // => "Db"  (C## is Db in 19-EDO)
  Note.simplify("E#", { edo: 19 }); // => "E#"  (E# is not F)
  Note.simplify("↑Db", { edo: 24 }); // => "↓D"
  Note.enharmonic("↓D", undefined, { edo: 24 }); // => "↑C#"
  Note.enharmonic("E#4", undefined, { edo: 19 }); // => "Fb4"
  Note.enharmonic("C#", "Db", { edo: 19 }); // => ""  (different steps)
  ```

  `simplify` keeps the note's direction (sharps and ups use the sharp view,
  flats and downs the flat view); `enharmonic` uses the other view, or its
  next spelling when both views agree on a spelling with arrows, or checks
  that `destName` is the same step and gives it the right octave.

#### Pitch-class sets

A chroma of length N is a set of N-EDO pitch classes. Pass `{ edo }` to build
one from notes, intervals or a set number; every `Pcset` has a new `edo`
property (`12` for traditional sets):

```js
import { Pcset } from "@dmnerd/microtonal";

Pcset.get(["C", "↓E", "G"], { edo: 24 }).chroma;
// => "100000010000001000000000"
Pcset.intervals(["C", "↓E", "G"], { edo: 24 }); // => ["1P", "3~", "5P"]
Pcset.isEqual(["C", "↓E"], ["C", "↑Eb"], { edo: 24 }); // => true
```

- A chroma only counts as valid when its length matches the edo (12 by
  default), so upstream behaviour for malformed chromas is unchanged.
- A `Pcset` object keeps its own edo, so `isSubsetOf`, `isSupersetOf`,
  `isNoteIncludedIn`, `filter`, `modes` and `notes` work on N-EDO sets
  directly. Subset and equality checks compare chromas instead of 32-bit set
  numbers, so they work for any EDO. `setNum` itself is only exact up to
  53-EDO.
- `intervals` names each step in two parts:
  - **Within a degree** the name follows Table 2.1 of Kite's notation guide:
    a size is named from the nearest quality (m, ~, M, A, d; or P, ~, A, d
    for 4ths and 5ths; P, A, d for unisons), ties going to a plain quality,
    then to the quality nearest m, M or P (so `↓2m`, not `↑2d`), then to ups.
    So where a sharp is 3 steps a unison two steps up is `↓1A`, not `↑↑1`;
    where a sharp is odd the steps around a mid are `↓3~` and `↑3~`; where a
    sharp is 2 steps the up-4th is `↑4` (the guide's "also called a
    mid-4th"). This reproduces the guide's table for every sharpness and
    applies to every EDO from 5 to 72.
  - **Which degree** (the guide leaves this open) is chosen by cost: each up
    or down costs 1; an augmented or diminished interval (other than the
    tritone) 1.5, or 2.5 where a sharp is 5 or more steps; an interval that
    lands on or past a neighbouring major scale degree 1.5 more; a mid 0.5 (a
    mid 4th or 5th 1). Ties go to plain qualities (P, M, m), then ups, then
    upminor and downmajor before upmajor and downminor, then the usual
    degree.

  EDOs whose sharp is one step (12, 19, 47) use no ups or downs, with
  stacked accidentals where needed (47-EDO step 3 is `1AAA`); the step below
  the octave is `↓8` or `8d`, and where a sharp is 0 steps intervals have no
  quality. In 24-EDO the neutral third is `3~`; in 31-EDO step 7 is `↓3m`,
  not `2A`; in 19-EDO step 1 is `1A`; in 41-EDO step 1 is `↑1`, not `7A`; in
  14-EDO step 5 is `↑3`; in 53-EDO step 15 is `↓3~`, and 4:5:6:7 is
  `1P ↓3M 5P ↓7m`.

- `Pcset.chromas()` still lists the 12-EDO chromas only.
- `normalized` (the smallest rotation starting with a pitch class) is found by
  comparing rotations in place on the chroma written twice, for every EDO.
  Upstream rotates the 12-bit set number with bit shifts, which can't hold
  EDOs past 31; the in-place scan gives the same results and is as fast in
  12-EDO (about 0.5 µs per new set in 53-EDO, versus 34 µs when building
  every rotation).

#### Chord types

**Kite's chord names.** Chord symbols follow Kite's chord names (Section 3
of the notation guide), and `ChordType.get` (so `Chord.get`) reads them on
top of any Tonal chord type:

- An arrow or mid right after the root is a **global arrow**: it changes the
  3rd, 6th (not the 13th), 7th and 11th, or the 2nd or 4th of a suspended
  chord (`C↓7` is `C ↓E G ↓Bb`, `C↑13` is `C ↑E G ↑Bb D ↑F A`). A chord with
  none of those (`C↓5`) is invalid. It doesn't reach a note the chord type
  writes with its own accidental (`C↑9#11` keeps F#), or a major 7th written
  after another quality: `C↓mM7` is `C ↓Eb G B` (minor triad plus M7) and
  `C↓m↓M7` downs both, while `C↓M7` is `C ↓E G ↓B`. A mid can't make a major
  7th mid (`C~M7` is `C ~E G B`).
- An **added note** follows the chord type, after a comma when it would
  otherwise merge with it: `C↓,7` is `C ↓E G Bb`, `C,↓7` is `C E G ↓Bb`,
  `Cm↓7`, `C7↓9`, `C↓6,9`. Accidentals are relative to the major scale
  (`C,b6` adds Ab, `C,#7` adds B#); a 7th alone is minor. An added note on a
  degree the chord has replaces it. `no5` leaves a note out.
- **Alterations** go in parentheses and change a note of the chord:
  `C(↓5)`, `CM9(↓5↓7)`, `Cm7(↓b5)`. An alteration replaces the note's ups and
  downs (`C↓m9(↑7)` has ↑Bb) and, when it has one, its quality
  (`C~11(M3)`). A 2nd or 4th replaces the 3rd (`C(b4)` is `C Fb G`).
  Alterations may come before more added notes: `C↓(↓5)7`, `C6(↓5)9`.
- Kite's short chord types are read after an arrow or with added or altered
  notes: `4` and `2` (suspended, `C↓4`, `C4(b5)`), `a`, `a7`, `d` and `d7`
  (`C↑a`, `C↓a7`, `C↓d`, `Cd,7`), `M9` and `M13`. A bare `C4` or `C2` stays
  Tonal's quartal or add9 chord.
- With arrows, added notes or alterations, 11th and 13th chords have every
  lower degree, as Kite defines them (Tonal's `11` has no 3rd and its `13` no
  11th).
- ASCII arrows are read too (`Cv7`, `C^m`, `C,v7`), except where `^` forms a
  Tonal chord symbol (`C^7` stays major seventh).
- A chord that equals a dictionary chord gets that chord's name and symbol
  (`Chord.get("C,7").symbol` => `"C7"`).

```js
Chord.get("C↓7").notes; // => ["C", "↓E", "G", "↓Bb"]
Chord.get("C,↓7").notes; // => ["C", "E", "G", "↓Bb"]
Chord.get("Cm7(↓b5)").notes; // => ["C", "Eb", "↓Gb", "Bb"]
Chord.get("C~", { edo: 24 }).notes; // => ["C", "↓E", "G"]
```

A mid chord needs an EDO to be spelled; without one its mid note is `""`.

A microtonal chord dictionary is added for chord detection, with Kite's
symbols:

| Name                               | Intervals     | Symbol           |
| ---------------------------------- | ------------- | ---------------- |
| mid                                | 1P 3~ 5P      | `~`              |
| mid seventh                        | 1P 3~ 5P 7~   | `~7`             |
| dominant seventh mid third         | 1P 3~ 5P 7m   | `~,7`            |
| major seventh mid third            | 1P 3~ 5P 7M   | `~,M7`           |
| minor mid seventh                  | 1P 3m 5P 7~   | `m~7`            |
| downmajor                          | 1P ↓3M 5P     | `↓`, `n`         |
| upmajor                            | 1P ↑3M 5P     | `↑`              |
| upminor                            | 1P ↑3m 5P     | `↑m`             |
| downminor                          | 1P ↓3m 5P     | `↓m`             |
| suspended downsecond               | 1P ↓2M 5P     | `↓sus2`          |
| suspended upfourth                 | 1P ↑4 5P      | `↑sus4`          |
| dominant seventh downmajor third   | 1P ↓3M 5P 7m  | `↓,7`, `n7`      |
| downmajor seventh                  | 1P ↓3M 5P ↓7m | `↓7`             |
| dominant seventh downminor seventh | 1P 3M 5P ↓7m  | `,↓7`            |
| upminor seventh                    | 1P ↑3m 5P ↑7m | `↑m7`            |
| downminor seventh                  | 1P ↓3m 5P ↓7m | `↓m7`            |
| major seventh downmajor third      | 1P ↓3M 5P 7M  | `↓,M7`, `↓,maj7` |
| minor downmajor seventh            | 1P 3m 5P ↓7M  | `m↓M7`, `m↓maj7` |

The mid chords come first, so where a sharp is two steps (17, 24, 31-EDO) a
downmajor or upminor third is named mid, as Kite does (`C~`). Where a sharp
is four steps they are other chords (41-EDO `C~` is `C ↓↓E G`).

**Harmonic and subharmonic chords.** Following the Xenharmonic Wiki's `har`
and `sub` names, chords defined by frequency ratios are built in each EDO from
the nearest steps, so they are found with an `edo` (never in 12-EDO, which
keeps the traditional dictionary):

| Name                 | Ratios                 | Symbol  |
| -------------------- | ---------------------- | ------- |
| harmonic seventh     | 4:5:6:7                | `har7`  |
| harmonic ninth       | 4:5:6:7:9              | `har9`  |
| harmonic eleventh    | 4:5:6:7:9:11           | `har11` |
| harmonic sixth       | 6:7:9:10               | `har6`  |
| subharmonic seventh  | 7:6:5:4 (subharmonics) | `sub7`  |
| subharmonic ninth    | 9:7:6:5:4              | `sub9`  |
| subharmonic eleventh | 11:9:7:6:5:4           | `sub11` |
| subharmonic sixth    | 12:10:8:7              | `sub6`  |

```js
Chord.get("Char7", { edo: 72 }).notes; // => ["C", "↓E", "G", "↓↓Bb"]
Chord.detect(["C", "E", "G", "Bbb"], { edo: 19 }); // => ["Char7"]
ChordType.addFromRatios(["1/1", "5/4", "3/2", "15/8"], ["j7"], "just maj7");
```

`ChordType.forEdo` offers them where no other chord has the same notes: in
24- and 31-EDO 4:5:6:7 keeps its spelled name `,↓7`, in 41- and 53-EDO `↓7`.
The wiki's short forms (`h7`, `s7`) aren't used, since `h7` is already the
half-diminished chord in Tonal.

- `ChordType.get` finds these by name or symbol. `ChordType.all()` still
  returns only the 108 traditional chords, and the 12-EDO chroma index is
  untouched: in 12-EDO `↓3M` is just `3m`, so a downmajor chord would
  otherwise shadow the minor chord. `ChordType.allMicrotonal()` lists them.
- `ChordType.forEdo(edo)` returns the chord types of an EDO, with `chroma`,
  `setNum`, `normalized` and `edo` computed in that EDO. It leaves out chords
  whose tones merge in that EDO. It includes microtonal chords only where an
  up is smaller than a sharp (17, 22, 24, 31, 41, 53-EDO…), and only when
  they differ from every traditional chord. When two microtonal chords are the
  same set, the first one listed wins: in 24-EDO mid, downmajor and upminor
  are the same neutral triad, so it is named `~`.

#### Chord detection and chords

`detect` takes an `edo` option:

```js
import { Chord } from "@dmnerd/microtonal";

Chord.detect(["C", "↓E", "G"], { edo: 24 }); // => ["C~"]
Chord.detect(["C", "↑Eb", "G"], { edo: 24 }); // => ["C~"]
Chord.detect(["↓E", "G", "C"], { edo: 24 }); // => ["C~/↓E"]
Chord.detect(["C", "↓E", "G"], { edo: 53 }); // => ["C↓"]
Chord.detect(["C", "E", "G"], { edo: 31 }); // => ["CM", …]
```

- In EDOs other than 12, the notes are compared as pitch classes of that EDO
  against `ChordType.forEdo(edo)`.
- `assumePerfectFifth` works in any EDO. Its hard-coded 12-bit masks are
  replaced by step ranges derived from the EDO; they give the same steps in
  12-EDO.
- `Chord.get` understands upped or downed roots and basses (`"↓Em"`,
  `"^Ebmaj7"`, `"C↓/↓E"`): only arrows before the root belong to it, so
  `E↓m` is E downminor and `↓Em` is ↓E minor. Inversions keep their ups, and
  `Chord.transpose("Cm", "↓2M")` => `"↓Dm"`.

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

A microtonal scale dictionary is added: Arabic maqamat (ascending forms, from
[Maqam World](https://www.maqamworld.com/en/maqam.php)) and the mosh modes.

| Name         | Intervals                 | Notes (traditional tonic) |
| ------------ | ------------------------- | ------------------------- |
| rast         | 1P 2M ↓3M 4P 5P 6M ↓7M    | C D ↓E F G A ↓B           |
| bayati       | 1P ↓2M 3m 4P 5P 6m 7m     | D ↓E F G A Bb C           |
| saba         | 1P ↓2M 3m 4d 5P 6m 7m     | D ↓E F Gb A Bb C          |
| sikah        | 1P ↑2m ↑3m ↑4 5P ↑6m ↑7m  | ↓E F G A ↓B C D           |
| huzam        | 1P ↑2m ↑3m ↑4d ↑5 ↑6m ↑7m | ↓E F G Ab B C D           |
| iraq         | 1P ↑2m ↑3m 4P ↑5d ↑6m ↑7m | ↓B C D ↓E F G A           |
| nairuz       | 1P 2M ↓3M 4P 5P ↓6M 7m    | C D ↓E F G ↓A Bb          |
| suznak       | 1P 2M ↓3M 4P 5P 6m 7M     | C D ↓E F G Ab B           |
| mahur        | 1P 2M ↓3M 4P 5P 6M 7M     | C D ↓E F G A B            |
| bayati shuri | 1P ↓2M 3m 4P 5d 6M 7m     | D ↓E F G Ab B C           |
| husayni      | 1P ↓2M 3m 4P 5P ↓6M 7m    | D ↓E F G A ↓B C           |
| hijaz        | 1P 2m 3M 4P 5P ↓6M 7m     | D Eb F# G A ↓B C          |

Maqam World shows the scales as images, so huzam, 'iraq, nairuz and suznak are
built from the ajnas each page names (huzam: Sikah on the tonic, Hijaz on the
3rd, Rast on the 6th; 'iraq: Sikah, Bayati on the 3rd, Rast on the 6th;
nairuz: Rast, Bayati on the 5th; suznak: Rast, Hijaz on the 5th; mahur:
Rast, Upper 'Ajam on the 5th; bayati shuri: Bayati, Hijaz on the 4th; hijaz:
Hijaz, Rast on the 4th, as its Nahawand form is Tonal's phrygian dominant).
Turkish makams with the same scale are aliases: Uşşak is bayati (Uşşak
tetrachord plus Bûselik pentachord on Nevâ), Hüseyni is husayni (Hüseyni
pentachord plus Uşşak tetrachord), both from their comma sizes in the AEU
system, so 53-EDO gives the Turkish commas. Maqamat
whose pages don't pin every note down are left out: jiharkah's 3rd and 4th
degrees are "played lower than notated" by no fixed amount.

The seven modes of mosh (3L 4s), the neutral third scale of mohajira, come
from the [Xenharmonic Wiki](https://en.xen.wiki/w/3L_4s), named as there
(with the alternative names as aliases). They are spelled so that 17, 24 and
31-EDO give the wiki's step patterns:

| Name            | Intervals                | Steps   |
| --------------- | ------------------------ | ------- |
| dril (mohajira) | 1P 2M ↑3m ↑4 5P 6M ↑7m   | LsLsLss |
| gil             | 1P 2M ↑3m ↑4 5P ↑6m ↑7m  | LsLssLs |
| kleeth          | 1P 2M ↑3m 4P 5P ↑6m ↑7m  | LssLsLs |
| bish            | 1P ↑2m ↑3m 4P 5P ↑6m ↑7m | sLsLsLs |
| fish            | 1P ↑2m ↑3m 4P 5P ↑6m 7m  | sLsLssL |
| jwl             | 1P ↑2m ↑3m 4P ↓5 ↑6m 7m  | sLssLsL |
| led             | 1P ↑2m 3m 4P ↓5 ↑6m 7m   | ssLsLsL |

They follow the same rules as the microtonal chords: reachable by name
(`Scale.get("C rast")`, aliases like `"maqam rast"` and `"segah"`), not part
of `ScaleType.all()` or `Scale.names()`, listed by
`ScaleType.allMicrotonal()`, and included by `ScaleType.forEdo(edo)` only
where an up is smaller than a sharp.

**Temperament scales.** Scales of regular temperaments are defined by a
generator, not a spelling, so they are built in each EDO the temperament
belongs to (generators and EDOs from each temperament's Xenharmonic Wiki
page), in their brightest mode, as TAMNAMS lists first. They are only found
with an `edo`:

| Name          | Shape | EDOs           |
| ------------- | ----- | -------------- |
| porcupine[7]  | 1L 6s | 15, 22         |
| magic[7]      | 3L 4s | 19, 22, 41     |
| kleismic[7]   | 4L 3s | 15, 19, 34, 53 |
| slendric[5]   | 1L 4s | 31, 36, 41     |
| sensi[8]      | 3L 5s | 19, 27, 46     |
| orwell[9]     | 4L 5s | 22, 31, 53     |
| negri[9]      | 1L 8s | 19, 29         |
| miracle[10]   | 1L 9s | 31, 41, 72     |
| pajara[10]    | 2L 8s | 22             |
| blackwood[10] | 5L 5s | 15, 20, 25     |

```js
Scale.get("C porcupine[7]", { edo: 22 }).notes;
// => ["C", "D", "↓E", "Gb", "G", "↓A", "↑Bb"]
ScaleType.forEdo(22).map((t) => t.name); // => [..., "porcupine[7]", ...]
ScaleType.addTemperament("porcupine[8]", {
  size: 8,
  generator: 163,
  edos: [15, 22],
});
```

`Scale` functions take an `edo` option:

```js
import { Scale } from "@dmnerd/microtonal";

Scale.get("↓E sikah").notes; // => ["↓E", "F", "G", "A", "↓B", "C", "D"]
Scale.detect(["C", "D", "↓E", "F", "G", "A", "↓B"], { edo: 24 });
// => ["C rast"]
Scale.scaleChords("rast", { edo: 24 }); // => [..., "~", "~7"]
Scale.modeNames("C rast", { edo: 24 });
// => [["C", "rast"], ["D", "husayni"], ["↓E", "sikah"], ["G", "nairuz"], ["↓B", "iraq"]]
Scale.rangeOf("C rast", { edo: 24 })("C4", "C5");
// => ["C4", "D4", "↓E4", "F4", "G4", "A4", "↓B4", "C5"]
```

`detect`, `scaleChords`, `extended`, `reduced`, `modeNames` and `rangeOf`
accept `{ edo }`; without it they behave exactly as upstream. `get` needs
it only for temperament scales and to spell mid intervals; `degrees` and
`steps` only transpose.

#### Keys, modes, roman numerals and progressions

- `Key` and `Mode` work with upped or downed tonics, since they transpose
  12-TET patterns: `Key.majorKey("↓E").scale` =>
  `["↓E", "↓F#", "↓G#", "↓A", "↓B", "↓C#", "↓D#"]`.
- Roman numerals take ups and downs in front: `RomanNumeral.get("↓III")`
  has interval `"↓3M"`. Kite's ASCII `v` is a down only before an upper case
  numeral (`vVI` is `↓VI`), since `v` alone is the numeral five. The chord
  type after a numeral follows Kite's chord names and is written with
  arrows as chord symbols are: `RomanNumeral.get("vVI^m").name` =>
  `"↓VI↑m"`, `"Iv"` => `"I↓"`, while Tonal symbols stay as written
  (`"I^7"`). Roman numeral objects get an `ups` property.
- `Progression.toRomanNumerals("C", ["↓E↓m"])` => `["↓III↓m"]`, and
  `fromRomanNumerals("C", ["↓III"])` => `["↓E"]`. Both follow Kite's example
  `Cv - Gv - vA^m` = `Iv - Vv - vVI^m`, written `I↓ V↓ ↓VI↑m`.
- `AbcNotation.scientificToAbcNotation` returns `""` for notes with ups or
  downs (ABC has no standard for them) instead of silently dropping them.

#### Ranges

`Range.chromatic` takes an `edo` option: it counts in steps of that EDO
(numbers are EDO steps, C0 = 0) and spells the notes like `Note.edoNames`,
with flats and downs unless `sharps` is set:

```js
Range.chromatic(["C4", "D4"], { edo: 24 });
// => ["C4", "↓Db4", "Db4", "↓D4", "D4"]
Range.chromatic(["C4", "D4"], { edo: 24, sharps: true });
// => ["C4", "↑C4", "C#4", "↑C#4", "D4"]
```

`Range.numeric` stays in MIDI numbers.

#### Not converted

These stay 12-TET: `Note.freq`/`Note.midi` (use `Note.edoFreq`/`Note.edoMidi`),
`Range.numeric`, `voicing`, `voice-leading` and
`voicing-dictionary`, `Pcset.chromas()`, the `chroma`/`setNum` fields of
`Chord.get`, `Scale.get` and the dictionaries (use `forEdo` or
`Pcset.get(…, { edo })`), and the Greek `mode` dictionary. Chord symbols with
an upped root followed by a type starting with `b` (`↓Cb9sus`) don't parse,
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
- **Quartal triad**: the three-note quartal voicing `1P 4P 7m` is added as
  "quartal triad" (`7sus4no5`; upstream only has the four-note `quartal`), so
  the dictionary has 108 chords. It ranks with the less common named chords,
  so `C F Bb` still detects `Fsus4/C` first, with `C7sus4no5` added last.
- **Kite's chord names**: `Chord.get` and `ChordType.get` also read chord
  names built from a known type with added notes and alterations, which
  upstream returns empty: `Chord.get("C(b5)")` is `C E Gb`, `Chord.get("C,9")`
  is the add9 chord. See [Chord types](#chord-types).
- **Intervals without a quality**: `Interval.get("3")` is a major third
  (upstream: empty), as Kite writes intervals in EDOs where a sharp is 0
  steps.
- **Roman numerals**: a chord type after a numeral may start with `v` or
  contain the letters of a numeral (`"Iv"`, `"↓III,↓7"`, `"IIdim"`;
  upstream: empty), and one that names a known chord another way is
  written with that chord's symbol (`"I,7"` is `"I7"`).

Every future fix that changes upstream behaviour is listed here.

## Documentation

This README covers what the fork adds or changes. Everything else works as in
Tonal, so the [Tonal documentation](https://tonaljs.github.io/tonal/docs)
applies: read `tonal` as `@dmnerd/microtonal` and `@tonaljs/<module>` as
`@dmnerd/microtonal/<module>` (see [Install](#install)). Inside this
repository, packages keep their upstream `@tonaljs/*` names so that merging
upstream stays simple; only `@dmnerd/microtonal` is published.

## License

[MIT License](docs/LICENSE). This fork is based on
[Tonal](https://github.com/tonaljs/tonal), copyright (c) 2015 danigb and the
Tonal contributors, and keeps its copyright and license notice.
