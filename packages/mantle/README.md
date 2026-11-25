<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ngrok/mantle/HEAD/.github/mantle-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/ngrok/mantle/HEAD/.github/mantle-light.svg">
    <img alt="Mantle" src="https://raw.githubusercontent.com/ngrok/mantle/HEAD/.github/mantle-light.svg" width="176" height="34" style="max-width: 100%;">
  </picture>
</p>
<h1 align="center">
  Mantle Design System
</h1>

[Mantle](https://mantle.ngrok.com) is [ngrok](https://ngrok.com/)’s UI library and design system. It’s inspired by [shadcn/ui](https://ui.shadcn.com), builds on native HTML and its own behavior hooks, and uses [Tailwind](https://tailwindcss.com/) for styling. It’s documented using [react-router](https://reactrouter.com/).

## Documentation

- [mantle.ngrok.com](https://mantle.ngrok.com) - our official component documentation site (reflects latest releases)

## Installation

Install `@ngrok/mantle` and all of the required `peerDependencies` with your preferred package manager:

| package manager | command                                            |
| --------------- | -------------------------------------------------- |
| npm             | npm install -E @ngrok/mantle @phosphor-icons/react |
| pnpm            | pnpm add -E @ngrok/mantle @phosphor-icons/react    |
| bun             | bun add -E @ngrok/mantle @phosphor-icons/react     |
| yarn            | yarn add -E @ngrok/mantle @phosphor-icons/react    |

Also install the required `devDependencies`:

| package manager | command                     |
| --------------- | --------------------------- |
| npm             | npm install -DE tailwindcss |
| pnpm            | pnpm add -DE tailwindcss    |
| bun             | bun add -DE tailwindcss     |
| yarn            | yarn add -DE tailwindcss    |

Next, check out the [Overview & Setup](https://mantle.ngrok.com/) docs and start using mantle components in your application!

## Using with AI Agents

Mantle runs a hosted, read-only [MCP](https://modelcontextprotocol.io) server at `https://mantle.ngrok.com/mcp`. It reads the API of the version you installed. [For AI Agents](https://mantle.ngrok.com/for-ai-agents) has the setup for each client, the system-prompt snippet, and the full list of `/api/*.json` and `llms.txt` endpoints.

The package also works offline:

- `@ngrok/mantle/agent.json`: the full component, hook, and utility records for the installed version, and the recipes that compose them.
- `@ngrok/mantle/llms.txt`: one line for each module and recipe, with its import path or docs URL and its summary.
- `dist/migrations/`: the codemods that the migration guides name.

## Design tokens

`@ngrok/mantle/tokens.json` holds mantle's design tokens in the [Design Tokens Community Group (DTCG)](https://www.designtokens.org/tr/2025.10/format/) format, with their light theme values. `@ngrok/mantle/tokens.dark.json` holds the tokens that change in the dark theme, and `@ngrok/mantle/tokens.resolver.json` is a DTCG resolver document that applies them. A token path joined with `-` names its Tailwind theme variable: `color.sky.500` is `--color-sky-500`.

## Code Block Tooling

Mantle ships runtime components from `@ngrok/mantle`, while build-time and server-side tooling lives in `@ngrok/mantle-vite-plugins`:

- `@ngrok/mantle/code-block`: runtime React components and `mantleCode` template tag
- `@ngrok/mantle-vite-plugins`: Vite + rehype integration via `mantleCodeBlockPlugins()`, and `mantleSourcesPlugin()` to trim the production Tailwind scan ([docs](https://mantle.ngrok.com/vite-plugins))
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

## Related Packages

| Package                                   | Description                                                                          | Links                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ngrok/mantle-vite-plugins`              | Vite plugins: trim the production Tailwind scan, highlight code blocks at build time | [GitHub](https://github.com/ngrok/mantle/tree/main/packages/mantle-vite-plugins) · [npm](https://www.npmjs.com/package/@ngrok/mantle-vite-plugins)                           |
| `@ngrok/mantle-server-syntax-highlighter` | Server-side syntax highlighting engine powered by Shiki                              | [GitHub](https://github.com/ngrok/mantle/tree/main/packages/mantle-server-syntax-highlighter) · [npm](https://www.npmjs.com/package/@ngrok/mantle-server-syntax-highlighter) |

## Contributing

Please read our [contribution guide](https://github.com/ngrok/mantle/blob/main/CONTRIBUTING.md) and [conventions](https://github.com/ngrok/mantle/blob/main/CONVENTIONS.md).
