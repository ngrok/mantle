---
"@ngrok/mantle": patch
---

The mantle build now runs every React Compiler validation, and lint enforces every rule that ports a compiler diagnostic. To pass them, these parts move a state update out of an effect, or make an effect read each value in its dependency list:

- `List` grid navigation clamps its active row during render when the list shrinks. A shrink that clamps the row now takes 1 commit instead of 2.
- Charts read the `aria-labelledby` text for the data-table caption with `useSyncExternalStore`. A chart mount with `aria-labelledby` now takes 2 commits instead of 3. When `aria-labelledby` names an element that contains the chart, the caption skips the text of the data table.
- `Sandbar.Root` sets its presence during render when `open` changes. Open and close still take 2 commits each.
- `AppLayout.SidePanel` resets its transition gate during render when it opens. An open still takes 2 commits.
- Charts clear the keyboard announcement during render, and the color effect passes `className` and `style` to the engine.
- `CodeBlock.Code` attaches the fold handler only to highlighted HTML, the only HTML that has fold toggles.

What changes for you:

- No API changes. You do not need to change your code.
- The validations do not change compiler output. A build with them and a build without them are byte-identical.
- The commit counts come from a React `Profiler` probe in the unit test environment, the same on 3 runs, against the previous source.
