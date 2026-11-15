# Compound components ship as module namespaces, so an unused part tree-shakes

**Date:** 2026-11-15
**Status:** Proposed
**Contests:** [2025-07-16-compound-component-named-exports.md](./2025-07-16-compound-component-named-exports.md), which accepted that a compound component does not tree-shake inside its own boundary.

## Context

Each compound component is one object, such as `const Field = { Item, Label, Help, … }`. A bundler keeps every property of an object that the app reads, so the app ships every part and every dependency of every part. The 2025 decision expected that cost to be small. Two measurements show where it is not:

| Named import | Minified |    Gzip | Why                                               |
| ------------ | -------: | ------: | ------------------------------------------------- |
| `Field`      | 126.9 KB | 42.6 KB | `Field.Help` brings `Popover`                     |
| `Label`      |  30.7 KB | 10.0 KB | the same label, without the namespace             |
| `Alert`      |    78 KB | 23.7 KB | `Alert.DismissIconButton` brings the button graph |

A rolldown 1.3.2 build of each `dist` entry measured these numbers, with React left out.

A prototype checked which `dist` shape lets a consumer drop a part that it does not read. The part imported a module with no side effects, and a rolldown 1.3.2 consumer build read only `Field.Root`:

| `dist` shape                                                                                                           | Unused part dropped                            |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Object, bundled chunks (today)                                                                                         | no                                             |
| Object, one file for each module                                                                                       | no                                             |
| `export * as Field`, bundled chunks                                                                                    | no: rolldown builds a runtime namespace object |
| `export * as Field`, one file for each module                                                                          | yes                                            |
| Bundled chunks, plus an entry `export * as Field from "./field.parts.js"` over a `field.parts.js` entry of named parts | yes, also when another entry shares the part   |

## Decision

1. **Parts are named exports of a parts module.** `field/parts.ts` exports `Item`, `Label`, `Help`, and the other parts by their namespace names. `field/index.ts` has `export * as Field from "./parts.js"`. Call sites do not change: `Field.Help` reads the same.
2. **The build keeps the namespace in `dist`.** Each compound gets a `<name>.parts` entry, and the public `<name>.js` entry is the one line `export * as <Name> from "./<name>.parts.js"`. The shared chunks keep their component names, so the `@source "<name>-*.js"` globs and `mantleSourcesPlugin` keep working. We do not switch to one file for each module, because that changes every path that the Tailwind source globs match.
3. **Each part carries the JSDoc that the namespace member carries today.** A hover on `Field.Help` shows the JSDoc of the `Help` export. [COMPONENT_SPEC.md §4.2](../COMPONENT_SPEC.md#42-compound-components-the-full-tree-rule) changes from "on every namespace member and part" to "on every part". The namespace JSDoc moves to the parts module's leading comment.
4. **The agent manifest and the MCP `get` tool read the parts module.** Both parse the namespace object today. They must read the named exports of `parts.ts` and the `export * as` line in the `.d.ts`.
5. **The bump is `patch`.** Call sites, types, and behavior stay the same. A consumer that spreads or iterates a namespace (`{ ...Field }`, `Object.keys(Field)`) gets a frozen module namespace object. A search of the frontend apps (clone of 2026-10-29) found no such use.

## Consequences

- One migration moves all 47 namespace objects, so the library never has two shapes for one job. An `ast-grep` rule does most of the move. A test fails the build when a component entry is not a namespace re-export.
- The prototype measured rolldown only. Measure webpack and esbuild before the migration ships.
- `Field` without `Help` drops `Popover`, and `Alert` without `DismissIconButton` drops the button graph. An app that uses those parts elsewhere pays nothing new and saves nothing.
