---
"@ngrok/mantle": patch
---

Bump runtime dependencies: `@ariakit/react` to 0.4.40 and `@tanstack/react-virtual` to 3.14.13.

The `@ariakit/react` bump reaches `Combobox` and `MultiSelect`, whose items build on ariakit's `Command`. Version 0.4.40 fixes `Command` keyboard activation with Enter and Space in Vitest's default jsdom environment, so a consumer test that runs in jsdom and presses Enter or Space on an item now selects it. The fix only reaches jsdom.

The `@tanstack/react-virtual` bump reaches `List.VirtualRoot` and `SelectableList.VirtualViewport`, which compose the virtualizer's `measureElement` onto each row as a ref callback. The virtualizer no longer calls `flushSync` from that callback, so React's development build no longer logs the `flushSync` warning when a row measures. The bump also keeps a row's key in the measurement cache, so a `getItemKey` callback that reads mutable data cannot change the identity of a measured row, and the debounced scroll-end fallback now reads the current scroll offset instead of overwriting a measurement adjustment with stale state.
