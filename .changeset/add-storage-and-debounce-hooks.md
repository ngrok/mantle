---
"@ngrok/mantle": minor
---

feat(mantle): add `useDebounce`, `useLocalStorage`, and `useSessionStorage` hooks

- `useDebounce(value, { waitMs })` returns a debounced copy of a value that only updates after the value stops changing for `waitMs` milliseconds. The sibling of `useDebouncedCallback` for values instead of functions.
- `useLocalStorage(key, defaultValue)` is SSR-safe, `useSyncExternalStore`-backed localStorage string state. The setter keeps every same-key hook instance in the tab in sync, cross-tab changes arrive via the native `storage` event, and corrupt entries resolve to the default instead of throwing.
- `useSessionStorage(key, defaultValue)` is the per-tab sibling of `useLocalStorage` with the same contract, backed by sessionStorage.
