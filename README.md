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

Work in progress on the `edo-ups-downs` branch.

1. **Core pitch model** — _done_ (`pitch`, `pitch-note`, `pitch-interval`,
   `pitch-distance`, plus the `note` and `interval` helpers). See
   [Implemented so far](#implemented-so-far).
2. **Pitch-class sets and chords** — _done_ (`pcset`, `chord-type`,
   `chord-detect`, `chord`).
3. **Scales, keys and the rest** — _done_ (`scale-type`, `scale`,
   `roman-numeral`, `progression`, `abc-notation`; `key` and `mode` work
   through transposition). See [Not converted](#not-converted) for what
   stays 12-TET.

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
  the ups: `simplify("C##↑")` => `"D↑"`. These respellings assume C## = D,
  which holds in 12- and 24-EDO but not in every EDO (in 19-EDO C## ≠ D).

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
- `intervals` names each step with the simplest spelling: fewest ups/downs,
  then plain qualities (P, M, m) before augmented/diminished, then ups before
  downs. In 24-EDO the neutral third is `↑3m`; in 19-EDO step 1 is `1A`.
- `Pcset.chromas()` still lists the 12-EDO chromas only.

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
| upminor seventh                  | 1P ↑3m 5P ↑7m | `m7(↑3,↑7)` |
| major seventh downmajor third    | 1P ↓3M 5P 7M  | `maj7(↓3)`  |
| minor downmajor seventh          | 1P 3m 5P ↓7M  | `m(↓maj7)`  |

Symbols put the altered degrees in parentheses: `^` already means major in
Tonal (`C^7`), and an arrow straight after the root is read as part of the
root (`C↓7` is a C↓ dominant seventh).

- `ChordType.get` finds these by name or symbol. `ChordType.all()` still
  returns only the 106 traditional chords, and the 12-EDO chroma index is
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

#### Scales

A microtonal scale dictionary is added, starting with Arabic maqamat
(ascending forms, from [Maqam World](https://www.maqamworld.com/en/maqam.php)):

| Name   | Intervals                 | Notes (traditional tonic) |
| ------ | ------------------------- | ------------------------- |
| rast   | 1P 2M ↓3M 4P 5P 6M ↓7M    | C D E↓ F G A B↓           |
| bayati | 1P ↓2M 3m 4P 5P 6m 7m     | D E↓ F G A Bb C           |
| saba   | 1P ↓2M 3m 4d 5P 6m 7m     | D E↓ F Gb A Bb C          |
| sikah  | 1P ↑2m ↑3m ↑4P 5P ↑6m ↑7m | E↓ F G A B↓ C D           |

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

#### Not converted

These stay 12-TET: `midi` and `Note.freq`/`Note.midi` (use `Note.edoFreq`),
`range` (`Range.chromatic`), `voicing`, `voice-leading` and
`voicing-dictionary`, `Pcset.chromas()`, the `chroma`/`setNum` fields of
`Chord.get`, `Scale.get` and the dictionaries (use `forEdo` or
`Pcset.get(…, { edo })`), and the Greek `mode` dictionary. Chord symbols with
an upped root followed by a type starting with `b` (`C↓b9sus`) don't parse,
the same ambiguity upstream has with `Cb9sus`.

#### 12-TET compatibility

Every upstream test still passes. The only changes to them add the new `ups: 0`
and `edo: 12` fields to expected property objects and snapshots. Legacy
properties such as `chroma`, `midi`, `height`, `semitones` and `freq` stay
12-TET; they treat an up or down as one semitone, which is its size in
12-EDO.

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
