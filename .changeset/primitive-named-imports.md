---
"@ngrok/mantle": patch
---

`Combobox` and `MultiSelect` import ariakit from `@ariakit/react/combobox` and `@ariakit/react/store` instead of the `@ariakit/react` barrel. The barrel re-exports every ariakit component, so one `Combobox` import evaluated tabs, menus, dialogs, and the rest. Every other component that wraps a Radix or sonner primitive now imports it by name as well, so no mantle module holds a namespace import of a primitive. No public API changes.

A production bundle does not change, because `@ariakit/react` and `@ariakit/react-components` both set `sideEffects: false` and a bundler already drops the unused chunks. A dev server evaluates the module graph on every SSR request, and a test runner that isolates each file in a fresh process evaluates it once per file. Both see the saving. The table reports a fresh Node 24 process per import with the ESM `import` condition, five rounds, and the median wall time:

| Entry point                  | Modules before | Modules after | Import time before | Import time after |
| ---------------------------- | -------------- | ------------- | ------------------ | ----------------- |
| `@ngrok/mantle/combobox`     | 293            | 135           | 211 ms             | 87 ms             |
| `@ngrok/mantle/multi-select` | 312            | 157           | 218 ms             | 96 ms             |
| `@ngrok/mantle/dialog`       | 87             | 87            | 32 ms              | 32 ms             |
| `@ngrok/mantle/select`       | 97             | 97            | 37 ms              | 37 ms             |
| `@ngrok/mantle/toast`        | 34             | 34            | 16 ms              | 16 ms             |
| `@ngrok/mantle/button`       | 28             | 28            | 17 ms              | 16 ms             |

The Radix and sonner rows do not move, because each of those packages already ships one component per package. Those imports change for consistency only.
