---
"@ngrok/mantle": patch
---

Ship the migration guides as ast-grep codemods. Every migration under `/migrations` that has a syntactic rewrite now ships its rules in the package at `dist/migrations/<NNNN>-<slug>.yml`, and each guide opens with a `Codemod` section that names what the rules apply and what stays manual.

Run one against your source from a `@ngrok/mantle` install:

```sh
npx --yes --package=@ast-grep/cli@0.45.3 ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/0008-tabs-separator.yml --update-all src
```

From a mantle checkout, `pnpm -w run migrate 0008 <path>` runs the same rules, and `--dry-run` prints the rewrites first. Run your formatter after either command: a codemod keeps the surrounding layout as it found it.
