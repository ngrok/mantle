# Docs site

`apps/www` is the docs site at mantle.ngrok.com, built with React Router. Read [CONVENTIONS.md](../../CONVENTIONS.md) in full before you change code here.

- Imports use the `~/` alias.
- A component docs page follows [COMPONENT_SPEC.md §7](../../COMPONENT_SPEC.md#7-the-docs-page). Docs copy also follows the `ngrok-style` skill.
- Router glue lives here as a recipe under `app/docs/recipes/` ([docs/framework-boundary.md](../../docs/framework-boundary.md)).
- No `*.test.*` file goes under `app/routes/`. Tests follow [docs/testing.md](../../docs/testing.md).
- An edit to a JSDoc summary or an `@example` changes `app/utilities/__snapshots__/components-surface.json`. Regenerate it with `pnpm -F @app/www test -u`.
