---
name: ast-grep
description: "Search and rewrite TypeScript and TSX by syntax shape with ast-grep. Use WHENEVER you rename an export, a prop, or a part across many files, count the sites a lint rule would flag, or find a code shape that a text search would match wrongly (a call with a given argument count, a JSX element with a given prop, a type-only import). Use rg instead for a plain name, a string, or a comment."
---

# ast-grep

The root `package.json` pins `@ast-grep/cli`, so `pnpm exec ast-grep` runs the pinned version. Run every command from the repo root.

## When to use it instead of rg

- **Use `rg`** for an identifier, a string, a file name, or a comment. It is faster and needs no pattern that parses.
- **Use `ast-grep`** when the shape matters: arguments, JSX props, import kinds, or a node whose text spans lines. It ignores comments and strings, so a match is real code.
- **Use `ast-grep` for a codemod** that touches more than a few files. A hand edit misses a site, and a `sed` edit matches inside strings.

## Search

```sh
# Every call, with any arguments
pnpm exec ast-grep run -p 'forwardRef($$$)' -l tsx packages/mantle/src

# A JSX element with a given prop, whatever other props it has
pnpm exec ast-grep run -p '<Icon svg={$SVG} $$$REST />' -l tsx packages/mantle/src

# A type-only import from one module
pnpm exec ast-grep run -p 'import type { $$$NAMES } from "react"' -l tsx packages/mantle/src

# Count the sites: one JSON line for each match
pnpm exec ast-grep run -p 'useMemo($$$)' -l tsx packages/mantle/src --json=stream | wc -l

# Leave out the tests
pnpm exec ast-grep run -p 'useMemo($$$)' -l tsx --globs '!**/*.test.tsx' packages/mantle/src
```

## Rewrite

```sh
# Preview: prints a diff and changes nothing
pnpm exec ast-grep run -p 'oldName($$$ARGS)' -r 'newName($$$ARGS)' -l tsx packages/mantle/src

# Apply: -U writes every match
pnpm exec ast-grep run -p 'oldName($$$ARGS)' -r 'newName($$$ARGS)' -l tsx -U packages/mantle/src
```

After a rewrite, run `pnpm -w run fmt`, then read `git diff` before you commit. Run the same rewrite with `-l ts` for the `.ts` files.

A rule file holds more than one pattern, and the migration codemods use one: `pnpm exec ast-grep scan --rule packages/mantle/migrations/<NNNN>-<slug>/rules.yml <path>`. The `write-migration` skill owns those rules.

## Traps

- **`-l tsx` reads only `.tsx` files, and `-l ts` reads only `.ts` files.** Run both, or a count misses half the sites.
- **`$A` matches one node; `$$$A` matches zero or more.** `foo($A)` skips `foo(2, 3)`.
- **A JSX pattern with no `$$$` matches only that exact prop set.** `<Icon svg={$SVG} />` skips an `Icon` that also has a `className`. Add `$$$REST`.
- **A pattern that is not a whole node matches nothing, with no error.** `type="button"` alone finds no site. Wrap a prop in an element: `<$E $$$A type="button" $$$B>$$$C</$E>`.
- **ast-grep skips gitignored paths,** so `dist/`, `node_modules/`, and `local/` never match. That is what you want for a codemod.
- **A preview without `-U` changes nothing.** Do not take the diff it prints as a sign that the files changed.
