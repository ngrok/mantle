<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ngrok-oss/mantle/HEAD/.github/mantle-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/ngrok-oss/mantle/HEAD/.github/mantle-light.svg">
    <img alt="Mantle" src="https://raw.githubusercontent.com/ngrok-oss/mantle/HEAD/.github/mantle-light.svg" width="176" height="34" style="max-width: 100%;">
  </picture>
</p>
<h1 align="center">
  Mantle Design System
</h1>

[Mantle](https://mantle.ngrok.com) is [ngrok](https://ngrok.com/)’s UI library and design system. It’s inspired by [shadcn/ui](https://ui.shadcn.com) and uses [Radix](https://www.radix-ui.com) with [Tailwind](https://tailwindcss.com/) for styling. It’s documented using [react-router](https://reactrouter.com/).

## Documentation

- [mantle.ngrok.com](https://mantle.ngrok.com) - our official component documentation site (reflects latest releases)
- [develop.mantle.ngrok.com](https://develop.mantle.ngrok.com) - staging site for all merges to `main`

## Installation

Install `@ngrok/mantle` and all of the required `peerDependencies` with your preferred package manager:

| package manager | command                                                     |
| --------------- | ----------------------------------------------------------- |
| npm             | npm install -E @ngrok/mantle @phosphor-icons/react date-fns |
| pnpm            | pnpm add -E @ngrok/mantle @phosphor-icons/react date-fns    |
| bun             | bun add -E @ngrok/mantle @phosphor-icons/react date-fns     |
| yarn            | yarn add -E @ngrok/mantle @phosphor-icons/react date-fns    |

Also install the required `devDependencies`:

| package manager | command                     |
| --------------- | --------------------------- |
| npm             | npm install -DE tailwindcss |
| pnpm            | pnpm add -DE tailwindcss    |
| bun             | bun add -DE tailwindcss     |
| yarn            | yarn add -DE tailwindcss    |

Next, check out the [Overview & Setup](https://mantle.ngrok.com/) docs and start using mantle components in your application!

## Code Block Tooling

Mantle ships runtime components from `@ngrok/mantle`, while build-time and server-side tooling lives in `@ngrok/mantle-vite-plugins`:

- `@ngrok/mantle/code-block`: runtime React components and `mantleCode` template tag
- `@ngrok/mantle-vite-plugins`: Vite + rehype integration via `mantleCodeBlockPlugins()`
- `@ngrok/mantle-server-syntax-highlighter`: server-side highlighting engine for API routes/actions

This keeps Vite/Shiki/parser dependencies out of frontend installs that only need Mantle's runtime UI package.

### Vite + MDX

```ts
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";

const codeBlockPlugins = mantleCodeBlockPlugins();
```

### Server Highlighter

```ts
import { createMantleServerSyntaxHighlighter } from "@ngrok/mantle-server-syntax-highlighter";

const highlighter = createMantleServerSyntaxHighlighter();
const result = await highlighter.highlight({
	code: "const x = 1",
	language: "typescript",
});
```

## Scaffolding a New Component

If you're contributing a new mantle component and use [Claude Code](https://claude.com/claude-code), run the `/scaffold-component` slash command to scaffold one end-to-end (component files, package.json export, docs page, route, navigation entry, and changeset):

```
/scaffold-component <component-name>
```

See [`.claude/commands/scaffold-component.md`](https://github.com/ngrok-oss/mantle/blob/main/.claude/commands/scaffold-component.md) for the full step-by-step reference — it's also useful if you'd rather scaffold by hand.

To validate that an existing component's docs, JSDoc, and scaffold wiring match the conventions (and auto-fix common drift), run `/audit-component`:

```
/audit-component <component-name>
```

Omit the name (or pass `all`) to sweep every component. See [`.claude/commands/audit-component.md`](https://github.com/ngrok-oss/mantle/blob/main/.claude/commands/audit-component.md) for the full checklist.

## Git Hooks

Pre-commit hooks run automatically via [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged). On every commit, staged files are formatted with oxfmt and linted with oxlint.

### Opting Out

If you need to skip the pre-commit hook locally (e.g., WIP commits, rebasing), set the `SKIP_HOOKS` env var:

```bash
SKIP_HOOKS=1 git commit -m "wip"
```

> [!NOTE]
> This is a **local opt-out only**. CI will always run formatting and linting checks against your branch, so any issues will still be caught before merge.

## Related Packages

| Package                                   | Description                                                                            | Links                                                                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ngrok/mantle-vite-plugins`              | Vite + rehype plugins for code block highlighting and Tailwind CSS source optimization | [GitHub](https://github.com/ngrok-oss/mantle/tree/main/packages/mantle-vite-plugins) · [npm](https://www.npmjs.com/package/@ngrok/mantle-vite-plugins)                           |
| `@ngrok/mantle-server-syntax-highlighter` | Server-side syntax highlighting engine powered by Shiki                                | [GitHub](https://github.com/ngrok-oss/mantle/tree/main/packages/mantle-server-syntax-highlighter) · [npm](https://www.npmjs.com/package/@ngrok/mantle-server-syntax-highlighter) |

## Contributing

Please read our [contribution guide](https://github.com/ngrok-oss/mantle/blob/main/CONTRIBUTING.md) and [conventions](https://github.com/ngrok-oss/mantle/blob/main/CONVENTIONS.md).
