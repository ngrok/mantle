---
"@ngrok/mantle": minor
---

**BREAKING**: Drop React 18 support — `@ngrok/mantle` now requires `react@^19` and `react-dom@^19` peers (previously `^18 || ^19`).

- All components use React 19's native ref-as-prop instead of `forwardRef`. Call sites are unchanged (`<Button ref={ref} />` keeps working); exported components are now plain function components, and every public `*Props` type includes `ref` via `ComponentProps`.
- `composeRefs` and `useComposedRefs` now propagate React 19 ref cleanup functions: when a composed callback ref returns a cleanup, the composed ref returns a cleanup that invokes it (refs without cleanups still receive the legacy `null` write on detach).
- Removed redundant `displayName` assignments — component names are inferred from their declarations; intentional DevTools names on compound parts are kept.
