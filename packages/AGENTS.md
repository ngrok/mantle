# Packages

Read [CONVENTIONS.md](../CONVENTIONS.md) in full before you change code here.

- Imports are relative paths. Exports are named.
- `packages/mantle/src/components/` follows [COMPONENT_SPEC.md](../COMPONENT_SPEC.md).
- `packages/mantle/src/components/chart/` and each chart family (`bar-chart`, `line-chart`, `area-chart`, `scatter-plot`, `world-map`) follow [docs/charts.md](../docs/charts.md).
- `packages/mantle/src/behaviors/` follows [the behavior hooks decision](../decisions/2026-11-21-mantle-owned-behavior-hooks.md): SSR-correct, `useSyncExternalStore` for shared state, no effect where a render-time, event-time, or ref-callback alternative exists.
- `packages/mantle/bundle-size.json` lists the page shapes whose gzip size CI reports on each pull request. Run `pnpm -w run report:bundle-size` after a build to see the sizes. The report does not block a merge; it fails only when an import with no render loads lazy code.
- Nothing under `packages/mantle/src` imports a router or an app framework ([docs/framework-boundary.md](../docs/framework-boundary.md)).
- A change to a published package needs a changeset ([VERSIONING.md](../VERSIONING.md)).
- Give each border a color class: `border-separator` for a divider, the surface token (`border-card-muted`, `border-popover`) for an edge, `border-form` for a control. Never a bare `border-b`: it draws in the text color ([Colors](../apps/www/app/docs/base/colors.mdx#borders-and-dividers)).
- Tests follow [docs/testing.md](../docs/testing.md).
- A JSDoc summary, `useWhen`, or alias feeds the MCP `find` tool. Run its golden queries ([docs/mcp-evals.md](../docs/mcp-evals.md)).
