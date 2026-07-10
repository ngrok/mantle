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

[Mantle](https://mantle.ngrok.com) is [ngrok](https://ngrok.com/)’s UI library and design system. It’s inspired by [shadcn/ui](https://ui.shadcn.com) and uses [Radix](https://www.radix-ui.com) with [Tailwind](https://tailwindcss.com/) for styling. It’s documented using [react-router](https://reactrouter.com/).

## Documentation

- [mantle.ngrok.com](https://mantle.ngrok.com) - our official component documentation site (reflects latest releases)
- [develop.mantle.ngrok.com](https://develop.mantle.ngrok.com) - staging site for all merges to `main`

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

Mantle ships machine-readable entry points for coding agents — see [For AI Agents](https://mantle.ngrok.com/for-ai-agents) for the system-prompt snippet, conventions, and the full list of `/api/*.json` and `llms.txt` endpoints. An offline pointer file (`@ngrok/mantle/agent.json`) is included in the published package as a fallback when network access isn't available.

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

## Related Packages

| Package                                   | Description                                                                            | Links                                                                                                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ngrok/mantle-vite-plugins`              | Vite + rehype plugins for code block highlighting and Tailwind CSS source optimization | [GitHub](https://github.com/ngrok/mantle/tree/main/packages/mantle-vite-plugins) · [npm](https://www.npmjs.com/package/@ngrok/mantle-vite-plugins)                           |
| `@ngrok/mantle-server-syntax-highlighter` | Server-side syntax highlighting engine powered by Shiki                                | [GitHub](https://github.com/ngrok/mantle/tree/main/packages/mantle-server-syntax-highlighter) · [npm](https://www.npmjs.com/package/@ngrok/mantle-server-syntax-highlighter) |

## Contributing

Please read our [contribution guide](https://github.com/ngrok/mantle/blob/main/CONTRIBUTING.md) and [conventions](https://github.com/ngrok/mantle/blob/main/CONVENTIONS.md).
