# Compound components ship as module namespaces, so an unused part tree-shakes

**Date:** 2026-11-15
**Status:** Accepted (2026-11-21)
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

1. **Parts are named exports of a parts module.** `field/field-parts.ts` exports `Item`, `Label`, `Help`, and the other parts by their namespace names, and nothing else. `field/index.ts` imports it as `FieldParts` and declares `const Field = FieldParts` under the namespace JSDoc. Call sites do not change: `Field.Help` reads the same. The parts module is named after the component file, because `progress/` holds two namespaces.
2. **The build keeps the namespace in `dist`.** Each compound gets a `<name>-parts` entry, and the public `<name>.js` entry is the one line `export * as <Name> from "./<name>-parts.js"`. The build rewrites the `const` alias to that namespace import, and fails when a component entry does not take its namespace from its parts entry (`packages/mantle/scripts/compound-namespaces.ts`). The entry names keep the `<name>-` prefix, so the `@source "<name>-*.js"` globs and `mantleSourcesPlugin` keep working. We do not switch to one file for each module, because that changes every path that the Tailwind source globs match.
3. **Each part declaration carries its own JSDoc.** A hover on `Field.Help` shows the JSDoc of the `Help` declaration. [COMPONENT_SPEC.md §4.2](../COMPONENT_SPEC.md#42-compound-components-the-full-tree-rule) changes from "on every namespace member and part" to "on every part declaration". The namespace JSDoc moves to the `const` alias in `index.ts`: TypeScript 5.9 shows the JSDoc of a `const` on hover, and shows nothing for the JSDoc of an `export * as` statement or of a module's leading comment.
4. **The MCP `get` tool follows the namespace import.** The `.d.ts` reads `declare const Field: typeof FieldParts`, so `declarationsOf` follows `import * as FieldParts` into the exports of `field-parts.d.ts`. The agent manifest needs no change: it reads the JSDoc of `const Field` in `index.ts`, and `components-surface.json` does not change.
5. **The bump is `patch`.** Call sites, types, and behavior stay the same. A consumer that spreads or iterates a namespace (`{ ...Field }`, `Object.keys(Field)`) gets a frozen module namespace object. A search of the frontend apps (clone of 2026-10-29) found no such use.

## Consequences

- One migration moves all 48 namespace objects, so the library never has two shapes for one job. The build check above guards `dist`, and the lint rule `mantle/no-namespace-object` rejects a new namespace object.
- Measured on the migrated `dist` with React left out, for a page that renders `Button` and the parts a marketing page uses of `DropdownMenu`, `Tabs`, `Accordion`, `Card`, and `Dialog`: Vite 8 goes from 185.9 KB to 154.5 KB minified (58.0 KB to 51.1 KB gzip), and webpack 5 from 195.5 KB to 161.3 KB. `Field` with `Item`, `Label`, and `Control` goes from 124.2 KB to 38.0 KB in Vite 8.
- Mantle's bundler contract is Vite and Rolldown, and the guarantee holds for them. esbuild does not drop a part that reaches it through `export * as`. It is outside the contract, so mantle ships no esbuild workaround.
- `Field` without `Help` drops `Popover`, and `Alert` without `DismissIconButton` drops the button graph. An app that uses those parts elsewhere pays nothing new and saves nothing.
