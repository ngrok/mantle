# Contributing to Mantle

Thank you for your interest in contributing to the Mantle! We welcome contributions from the community and are grateful for your help in making our design system better.

Please review our [conventions](CONVENTIONS.md) before submitting changes — it is the single source of truth for code style and patterns.

## Getting started

First, [fork the repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) and clone to your local machine:

```sh
git clone git@github.com:<your username>/mantle.git
cd mantle
```

## Installation

From a fresh clone, run:

```sh
./scripts/setup
```

This installs [mise](https://mise.jdx.dev/) (if missing), provisions Node and pnpm at the versions pinned in `.nvmrc` and `package.json#packageManager`, and runs `pnpm install --frozen-lockfile`. The setup is idempotent — re-run it any time to re-sync the toolchain.

### Shell activation

`./scripts/setup` automatically appends the appropriate `mise activate` line to your shell's rc file (`~/.zshrc`, `~/.bashrc`, or fish config) the first time it runs, so tools and environment variables apply automatically when you `cd` into the repo. After setup, open a new terminal (or `source` your rc file) and `pnpm`, `node`, etc. will be on PATH.

If you'd rather add it manually, or your shell wasn't auto-detected:

```sh
# zsh
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc

# bash
echo 'eval "$(mise activate bash)"' >> ~/.bashrc

# fish
echo 'mise activate fish | source' >> ~/.config/fish/config.fish
```

Without activation, prefix commands with `mise x --`:

```sh
mise x -- pnpm --filter @app/www start
```

This is also the standard form for CI and other non-interactive environments.

### Doctor

To verify the active toolchain matches committed pins at any time:

```sh
mise run doctor
```

### Local environment overrides

For machine-specific or secret values (e.g. cache tokens), create a `mise.local.toml` (gitignored) at the repo root:

```toml
[env]
TURBO_TOKEN = "…"
```

These are merged with the committed `mise.toml [env]` whenever mise resolves the environment.

### Manual Installation

If you prefer to manage Node and pnpm yourself, match the committed pins:

1. Install [Node](https://nodejs.org/en/download) at the version listed in `.nvmrc`.
2. Enable pnpm at the version pinned in `package.json#packageManager`: `corepack enable pnpm && corepack install`.
3. Install workspace dependencies: `pnpm install --frozen-lockfile`.

### Bumping Node or pnpm

Tool versions are pinned in `.nvmrc` (Node) and `package.json#packageManager` (pnpm); resolved entries with download URLs and SHA256 checksums are locked in `mise.lock`. `mise.toml` sets `[settings] lockfile = true` so installs record into `mise.lock`. CI enforces that the committed lockfile stays in sync with the source pins.

To bump a version:

1. Update `.nvmrc` (Node) or `package.json#packageManager` (pnpm).
2. Run `mise run relock` to refresh `mise.lock` for all platforms.
3. Run `mise install` to materialize the new toolchain locally.
4. Commit `.nvmrc` / `package.json` and `mise.lock` together.

## Local Development

We use [Turborepo](https://turbo.build/) and pnpm workspaces to help manage the Mantle monorepo.

To get started, simply run:

```
pnpm -w run start
```

This will spin up the react-router documentation site, and is configured to watch for changes to components (so your changes will be instantly reflected).

## Scaffolding a New Component

If you use [Claude Code](https://claude.com/claude-code), the repo ships a `/scaffold-component` slash command that scaffolds a new mantle component end-to-end — component files, package.json export, docs page, route registration, navigation entry, and a changeset:

```
/scaffold-component <component-name>
```

The command definition lives at [`.claude/commands/scaffold-component.md`](./.claude/commands/scaffold-component.md) and is also a useful reference if you'd rather scaffold a component by hand — it captures the full set of steps and conventions a new component needs.

## Auditing an Existing Component

To validate that an existing component's docs, JSDoc, and scaffold wiring still match the conventions in `/scaffold-component` — and to auto-fix common drift like missing `@see` links, missing composition trees, mislabeled `Composition` headings, or missing nav/route entries — run the `/audit-component` slash command:

```
/audit-component <component-name>
```

Omit the name (or pass `all`) to sweep every component in `packages/mantle/src/components/`. The command definition lives at [`.claude/commands/audit-component.md`](./.claude/commands/audit-component.md) and doubles as a checklist if you'd rather audit by hand.

## Git Hooks

Pre-commit hooks run automatically via [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged). On every commit, staged files are formatted with oxfmt and linted with oxlint.

If you need to skip the pre-commit hook locally (e.g., WIP commits, rebasing), set the `SKIP_HOOKS` env var:

```sh
SKIP_HOOKS=1 git commit -m "wip"
```

> [!NOTE]
> This is a **local opt-out only**. CI always runs formatting and linting checks against your branch, so any issues are still caught before merge.

## Submitting a Pull Request

Before working on a large change, it is best to open an issue first to discuss.

After making your changes locally, go ahead and submit a pull request. The Mantle team will review your changes and provide feedback or suggestions for improvement. We may also make additional changes to your pull request to ensure that it meets the standards of Mantle.

We use [changesets](https://github.com/changesets/changesets) to help us manage versioning and changelogs. You can think of a changeset as an _intent to change_. If your changes require a publish and release, feel free to add a changeset to your PR, otherwise we can add one for you if you're unsure.

Handy command to add a changeset via the CLI:

```
pnpm -w run changeset
```

Some helpful tips:

- You don't have to use the cli if you prefer to just create one manually (though the cli is definitely easiest).
- Feel free to edit the changeset file however many times you want (it's just an `.md` file) while working on your PR.
- Check out their [common questions](https://github.com/changesets/changesets/blob/main/docs/common-questions.md) for more tips or read their [docs](https://github.com/changesets/changesets/tree/main/docs).

Once your pull request has been reviewed and any necessary changes have been made, it will be merged.

## Code of conduct

We ask that all contributors follow our [code of conduct](CODE_OF_CONDUCT.md) when contributing. This code of conduct outlines our expectations for behavior and helps ensure that the ngrok community is a welcoming and inclusive place for everyone.
