# Docs site

`apps/www` is the docs site at mantle.ngrok.com, built with React Router. Read [CONVENTIONS.md](../../CONVENTIONS.md) in full before you change code here.

- Imports use the `~/` alias.
- A component docs page follows [COMPONENT_SPEC.md §7](../../COMPONENT_SPEC.md#7-the-docs-page). Docs copy also follows the `ngrok-style` skill.
- Give each border a color class: `border-separator` for a divider, the surface token (`border-card-muted`, `border-popover`) for an edge, `border-form` for a control. Never a bare `border-b`: it draws in the text color ([Colors](./app/docs/base/colors.mdx#borders-and-dividers)).
- Router glue lives here as a recipe under `app/docs/recipes/` ([docs/framework-boundary.md](../../docs/framework-boundary.md)).
- The assistant's page-to-panel view transition is part of the experience. Keep its names, the `app-layout-card-under` page layer, and its stylesheet; `transition-contract.test.ts` fails when one goes ([Assistant Across Routes](./app/docs/recipes/assistant-across-routes.mdx#the-transition-is-required)).
- No `*.test.*` file goes under `app/routes/`. Tests follow [docs/testing.md](../../docs/testing.md).
- An edit to a JSDoc summary or an `@example` changes `app/utilities/__snapshots__/components-surface.json`. Regenerate it with `pnpm -F @app/www test -u`.
- A change to what the MCP returns (JSDoc `useWhen` or aliases, docs or recipe frontmatter, the `find` scorer) follows [docs/mcp-evals.md](../../docs/mcp-evals.md).
