---
"@ngrok/mantle": patch
---

fix(mantle): hooks bug fixes, JSDoc gaps, and `useRandomStableId` removal

- `useUndoRedo`: calling `undo`/`redo`/`push` multiple times within a single event handler now works correctly. Previously the callbacks read the previous render's stacks, so back-to-back `undo` calls returned the same snapshot twice and corrupted the history.
- Remove `useRandomStableId`. It had no consumers and React's built-in `useId` is the right tool; the hook also produced different ids on the server and client, making it a hydration-mismatch hazard.
- `composeRefs`/`useComposedRefs`: drop the deprecated `MutableRefObject` type and internal type assertions; document both with proper JSDoc.
- Add test coverage for `useCallbackRef`, `useIsomorphicLayoutEffect`, `useMatchesMediaQuery`, `usePrefersReducedMotion`/`getPrefersReducedMotion`, `useScrollBehavior`, `useUndoRedo`, and `useComposedRefs`.
