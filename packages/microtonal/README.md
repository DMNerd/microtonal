# @dmnerd/microtonal

[Tonal](https://github.com/tonaljs/tonal), the music theory library, extended
to **any equal division of the octave (EDO)**: 19, 22, 24, 31-EDO and so on,
spelled with Kite's ups and downs notation, following his
[Notation Guide for EDOs 5-72](http://tallkite.com/misc_files/notation%20guide%20for%20edos%205-72.pdf).
12-TET behaviour stays the same as Tonal's.

```bash
npm install @dmnerd/microtonal
```

```js
import { Chord, Interval, Note, Scale } from "@dmnerd/microtonal";

Note.edoSteps("↓E4", 24); // => 103   (a quarter-tone below E4)
Interval.edoSteps("↓3M", 24); // => 7  (neutral third)
Interval.fromEdoSteps(7, 24); // => "3~"  (Kite's mid third)
Note.transposeEdoSteps("C#", 1, 24); // => "↑C#"

// Kite's chord names, in any EDO
Chord.get("C↓7").notes; // => ["C", "↓E", "G", "↓Bb"]
Chord.detect(["C", "↓E", "G"], { edo: 24 }); // => ["C~"]

// Everything from Tonal works as before
Scale.get("C major").notes; // => ["C", "D", "E", "F", "G", "A", "B"]
Chord.get("Cmaj7").name; // => "C major seventh"
```

The API is Tonal's, so code written for `tonal` works after changing the
import. Each Tonal module is also a subpath: `@tonaljs/note` becomes
`@dmnerd/microtonal/note`. ES modules, CommonJS and TypeScript types are
included, with no dependencies.

Documentation, the list of microtonal features and every difference from
upstream Tonal are in the
[repository README](https://github.com/DMNerd/microtonal#readme).

## License

MIT. Based on Tonal by [danigb](https://github.com/danigb) and contributors.
