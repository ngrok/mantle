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

[Mantle](https://mantle.ngrok.com) is [ngrok](https://ngrok.com/)'s UI library and design system, inspired by [shadcn/ui](https://ui.shadcn.com) and built on native HTML, its own behavior hooks, [Tailwind](https://tailwindcss.com/), and [React Router](https://reactrouter.com/).

This monorepo is managed with pnpm workspaces, [Turborepo](https://turbo.build/), and [mise](https://mise.jdx.dev/).

## Documentation

- [mantle.ngrok.com](https://mantle.ngrok.com): official component documentation (reflects latest releases)

## Packages

| Package                                                                                  | Description                                                                          | npm                                                                          |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`@ngrok/mantle`](./packages/mantle)                                                     | UI component library (React, Tailwind)                                               | [npm](https://www.npmjs.com/package/@ngrok/mantle)                           |
| [`@ngrok/mantle-vite-plugins`](./packages/mantle-vite-plugins)                           | Vite plugins: trim the production Tailwind scan, highlight code blocks at build time | [npm](https://www.npmjs.com/package/@ngrok/mantle-vite-plugins)              |
| [`@ngrok/mantle-server-syntax-highlighter`](./packages/mantle-server-syntax-highlighter) | Server-side syntax highlighting engine powered by Shiki                              | [npm](https://www.npmjs.com/package/@ngrok/mantle-server-syntax-highlighter) |
| [`@ngrok/oxlint-plugin`](./packages/oxlint-plugin)                                       | oxlint rules for the JSX shapes that crash a translated page                         | [npm](https://www.npmjs.com/package/@ngrok/oxlint-plugin)                    |

## Local Development

From a fresh clone:

```sh
./scripts/setup
```

This installs [mise](https://mise.jdx.dev/) (if missing), provisions Node and pnpm at the pinned versions, and installs workspace dependencies. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor guide: conventions, scaffolding and audit slash commands, the version-bump workflow, and pre-commit hook details.

## Using with AI Agents

Mantle ships machine-readable entry points for coding agents. See [For AI Agents](https://mantle.ngrok.com/for-ai-agents) for the system-prompt snippet, conventions, and the full list of `/api/*.json` and `llms.txt` endpoints. Agents with MCP support can connect to the hosted server at `https://mantle.ngrok.com/mcp`.

## Code of Conduct

Please follow our [code of conduct](./CODE_OF_CONDUCT.md) when contributing.

## License

[MIT](./LICENSE)
