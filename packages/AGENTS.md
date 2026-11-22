# Packages

Read [CONVENTIONS.md](../CONVENTIONS.md) in full before you change code here.

- Imports are relative paths. Exports are named.
- `packages/mantle/src/components/` follows [COMPONENT_SPEC.md](../COMPONENT_SPEC.md).
- `packages/mantle/src/components/chart/` and each chart family (`bar-chart`, `line-chart`, `area-chart`, `scatter-plot`, `world-map`) follow [docs/charts.md](../docs/charts.md).
- `packages/mantle/src/behaviors/` follows [the behavior hooks decision](../decisions/2026-11-21-mantle-owned-behavior-hooks.md): SSR-correct, `useSyncExternalStore` for shared state, no effect where a render-time, event-time, or ref-callback alternative exists.
- `packages/mantle/bundle-budget.json` pins bundle sizes. Run `pnpm -w run check:bundle-budget` after a build; a change that shrinks a size lowers its budget with `--update`.
- Nothing under `packages/mantle/src` imports a router or an app framework ([docs/framework-boundary.md](../docs/framework-boundary.md)).
- A change to a published package needs a changeset ([VERSIONING.md](../VERSIONING.md)).
- Tests follow [docs/testing.md](../docs/testing.md).
