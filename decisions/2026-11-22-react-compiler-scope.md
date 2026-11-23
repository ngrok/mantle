# The React Compiler compiles only what improves INP

**Date:** 2026-11-22
**Status:** Accepted
**Replaces:** the compile rule from #1732 (`mark-memo-free-components.ts`)

## Context

Mantle compiled its dist with the React Compiler. Since #1732, the build skipped a component only when it called no hook and created no function in render, so every component with a hook compiled. On `main` at `d859fd15`, that cost 69.6 KB gzip across the dist (317.3 KB against 247.7 KB without the compiler) and 6 to 13 KB gzip on each measured page.

Cody Price set the rule on 2026-11-22: nothing compiles by default, except where memoization improves Interaction to Next Paint (INP). Bytes or render counts alone do not qualify. The code stays compiler-compliant through lint and the strict validation pass.

## How we measured

- **Harness.** A Vite 8 production app imports a chosen dist build through an alias. Chromium 159 runs headless through Playwright, with a 4× CPU throttle (CDP `Emulation.setCPUThrottlingRate`) and a fresh context for each case. One page runs at a time, and the variant order rotates each round.
- **Interactions.**
  - **MultiSelect typing:** five tags, 60 options filtered by the parent, `app-1` typed and deleted twice.
  - **Combobox typing:** 60 options filtered by the parent, the same keys.
  - **Select:** four open, arrow, and pick cycles.
  - **charts:** four `LineChart`s and two `BarChart`s, eight data refreshes, and a hover sweep.
  - **table:** a 100-row `DataTable` with five sorts, ten row selections, and two select-all clicks.
- **Metrics.** Event Timing gives each interaction's duration, which Chromium rounds to 8 ms, and its event processing time. A session's INP is its worst interaction, and in a typing session nearly every interaction is a keystroke, so the tables give the median keystroke and the mean interaction too. Page JS is the gzip `-9` sum of the JS that the page loads, React included.
- **Noise.** The orb's CPU speed drifted between rounds. Each case times a fixed loop before and after its interactions. Each figure is the median over 4 to 7 rounds of the variant-to-baseline ratio inside one round.
- **Scripts.** The [harness artifact](https://ampcode.com/artifacts/react-compiler-a-b-harness-1773-ae18b1e8-96aa-4696-ac5c-5abffdfb7ba7) holds the driver, the bench app, the variant builds, and the commands. ngrok workspace members can open it. It is not in the repo, because it needs a temporary build-config edit and several dist builds side by side.

## Results

### Where compiling improved INP

Compiled against uncompiled (annotation mode, no opt-ins):

| Interaction              | Compiled                           | Uncompiled          | Page JS cost of compiling |
| ------------------------ | ---------------------------------- | ------------------- | ------------------------- |
| MultiSelect typing       | median keystroke 16 ms, mean 27 ms | 40–48 ms, 46–51 ms  | +4.3 KB                   |
| Combobox typing          | median keystroke 40 ms, mean 44 ms | 48 ms, 56 ms        | +8.2 KB                   |
| Select open, arrow, pick | mean 48 ms                         | mean 44 ms (faster) | +8.2 KB                   |
| charts refresh           | INP 80 ms                          | INP 80 ms           | +5.7 KB                   |
| table sort and select    | INP 432–440 ms                     | INP 440 ms          | +2.1 KB                   |

Only the two typing interactions improved. A bisect that compiled one module at a time pointed at one hook: compiling `use-popup.ts` alone took the MultiSelect median keystroke down 50% and the mean interaction 37%. Compiling the picker component files, the other behavior hooks one at a time, or the MultiSelect `Item` and `TagValues` gave no gain.

### The cause, and the fix

`usePopup` returned a new ref callback on each render. React detaches and attaches a new ref callback, so each keystroke placed the popup again with a forced layout, joined the host to the document again, and entered the modal again. The compiler had hidden this by keeping the callback. `useListbox` had the same shape, and each picker composes the two refs with `useComposedRefs`, so a new listbox ref also re-runs the popup ref. Both hooks now keep their callback (`useCallback`, and `useCallbackRef` for the latest `move`). The popup fix alone recovered nothing; the two together recover all of it:

| Interaction (4 rounds)                      | Picker family compiled | Uncompiled, both refs fixed | Uncompiled, no fix |
| ------------------------------------------- | ---------------------- | --------------------------- | ------------------ |
| MultiSelect typing, median keystroke / mean | 16 / 26 ms             | 20 / 27 ms                  | 40 / 43 ms         |
| Combobox typing, median keystroke / mean    | 32 / 42 ms             | 36 / 41 ms                  | 48 / 54 ms         |
| Page JS (MultiSelect / Combobox page)       | 98.4 / 109.7 KB        | 93.9 / 101.4 KB             | 93.9 / 101.3 KB    |
| Heap after the session                      | 4.34 / 4.92 MB         | 4.20 / 4.68 MB              | 4.25 / 4.69 MB     |

So no component needs `"use memo"`.

### The same class of bug, found by tests

With nothing compiled, the full test suite found two more callbacks that only the compiler had kept:

- **`Select.Trigger`** composed its ref with an inline callback, so a caller's callback ref ran again on each re-render. The form reset listener now lives in an effect, and the trigger composes only stable refs.
- **`Slot`** composed the part's ref and the child's ref into a new callback on each render. `composeRefs` now returns the same callback for the same two refs, so `Slot` stays free of hooks.

One test, "a hover publish does not re-render the data table", counted renders of the chart's screen-reader table on the first hover. Only the compiled cache kept that count at zero. A render count alone does not qualify for an opt-in, so the test is gone.

## Decision

1. **Nothing compiles by default.** The build runs the React Compiler in annotation mode. A function that starts with `"use memo"`, or each function of a module that starts with it, ships compiled. Today no function does.
2. **Opt in only for a measured INP gain.** Use a browser A/B at 4× CPU like the one above. Put the numbers in the `Why` comment above the directive. Bytes or render counts alone do not qualify.
3. **Every component and hook stays compiler-compliant.** The build compiles each module in full to run the strict validations, then discards that output. oxlint keeps every rule that ports a compiler diagnostic.
4. **A stable identity that callers rely on is code, not compiler output.** A ref callback, or a value in an effect's dependency list, uses `useCallback`, `useMemo`, or a module cache.

## Alternatives considered

- **Keep the #1732 rule.** Rejected: it compiles every component with a hook, and most of them gain no INP.
- **Remove the compiler from the build.** Equal output today, because nothing opts in. Rejected for now: annotation mode keeps one place for a future measured opt-in, and the validation pass needs the compiler anyway.
- **Opt the picker family in.** Rejected: the gain came from one ref callback, and fixing that callback recovers it at no byte cost.

## Consequences

- The dist is 247.7 KB gzip, against 317.3 KB on `d859fd15` (−69.6 KB, −22%). A page saves 6 to 13 KB gzip of JS, and its heap shrinks up to 5%.
- The build takes about 4.7 s, against 5.0 s on `d859fd15`. A build with no compiler at all took 3.9 s, so the validation pass costs about 0.8 s.
- Uncompiled code re-renders a child whose props did not change. Code that needs a stable identity must say so itself (decision 4). The tests caught two such places, and the A/B caught two more.
