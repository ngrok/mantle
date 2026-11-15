# Browser checks

Look at every change a person sees in a browser: a component, a docs page, a recipe, or a preview. [Prove it works](./principles/prove-it-works.md) is the rule; this file is the procedure.

## The tool

[`.mcp.json`](../.mcp.json) configures the [Playwright MCP server](https://github.com/microsoft/playwright-mcp) for Claude Code. Another harness copies the same command.

Keep `--headless` and `--isolated` in every committed config. A headed browser takes focus from the person at the keyboard and fails on a host with no display. Parallel sessions share this checkout, and a shared on-disk profile locks the second session out.

## Procedure

1. Run `pnpm -w run start`, then open the URL that the dev server prints.
2. Open the page you changed. For a component, open its docs page. Each example is a framed preview. To see one with no site chrome, open its frame's new-tab link, `/preview/<page path>/<name>`. [preview-registry.ts](../apps/www/app/features/preview-registry.ts) lists the shell demos, `/preview/<name>`.
3. Check 320 × 640 and 1440 × 900 (`browser_resize`). 320px is the [minimum supported width](../apps/www/app/docs/base/breakpoints.mdx#minimum-supported-width); a layout problem below it is not a bug. Check both sizes, in light and dark. To change the theme, use the site theme switcher, or set the `mantle-ui-theme` cookie to `light` or `dark` and reload. Confirm that the `<html>` class shows the theme you set.
4. Do the task the change is for: click, type, use the keyboard, and follow links. A first-render screenshot proves no interaction.
5. Read `browser_console_messages`. A new error or hydration warning is a defect.
6. Run `browser_close` and stop the dev server when you are done.

Also check, by type:

- **Component:** each state you can reach (empty, loading, error, open, disabled), the focus order, and the visible focus ring.
- **Docs page:** code blocks, the props tables, light and dark examples, and every link.

## Report

Name the pages, widths, and themes you checked. A check you skipped is not a pass: say which one and why. Keep screenshots out of the commit.
