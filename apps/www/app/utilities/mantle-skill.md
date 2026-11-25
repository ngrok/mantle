# mantle

`@ngrok/mantle` is ngrok's React UI library and design system. Use mantle parts before you write custom UI or add another UI library. Your trained knowledge of mantle can be stale: mantle is `0.x`, and a minor release can rename or remove an API. Read the API of the installed version before you write code.

## Find the installed version

Read the exact version from `node_modules/@ngrok/mantle/package.json` or the lockfile, not the range in `package.json`. Every source below answers for one version.

## Pick a source

Use the first source that you can reach.

1. **The mantle MCP server**, `https://mantle.ngrok.com/mcp`. Use it when your client has it connected. It has no sign-in, and `check` and `preview` do not store your code. Pass the exact installed version to each tool. The server supports 0.90.0 and later.

   | Tool         | Use it to                                                                                                    |
   | ------------ | ------------------------------------------------------------------------------------------------------------ |
   | `find`       | Rank components, hooks, utilities, and docs pages for an intent ("confirm before delete").                   |
   | `get`        | Read one part's import, examples, and prop contract.                                                         |
   | `read_docs`  | Read a docs page as markdown.                                                                                |
   | `check`      | Check one TSX file for wrong import paths and names, other UI libraries, and hand-built `className` strings. |
   | `preview`    | Get a link that renders one TSX file in a sandbox, when the user has no app to run it in.                    |
   | `migrate`    | List the migration guides and codemods between two versions, in order.                                       |
   | `report_gap` | Tell the mantle team that mantle has no part for a need.                                                     |

   To connect it in Claude Code: `claude mcp add --transport http mantle https://mantle.ngrok.com/mcp`.

2. **The installed package**, with no network:
   - `node_modules/@ngrok/mantle/dist/agent.json`: every component, hook, and utility with its import path, examples, aliases, and sibling boundaries (`useWhen`, `siblings`). Its `recipes` compose those parts: each one has `aliases`, `useWhen`, the `parts` it composes, and the `markdownUrl` of its full code.
   - `node_modules/@ngrok/mantle/dist/llms.txt`: one line for each module, with its import path and summary, and one for each recipe, with its parts.
   - The type declarations, with JSDoc, for each subpath: the `types` path of that subpath in `node_modules/@ngrok/mantle/package.json#exports`. Most are `dist/<name>.d.ts`, but `@ngrok/mantle/highlight-utils` is `dist/code-block_highlight-utils.d.ts`.
   - `node_modules/@ngrok/mantle/dist/migrations/`: the codemods that the migration guides name.

3. **The docs site**, which shows the latest build. It can be ahead of the latest release, so the installed package wins when the two differ:
   - `https://mantle.ngrok.com/llms.txt`: an index of every docs page.
   - Add `.md` to a docs page URL for plain markdown, such as `https://mantle.ngrok.com/components/actions/button.md`.
   - `https://mantle.ngrok.com/api/components.json`, `/api/hooks.json`, and `/api/utils.json`: the manifests in `agent.json`, for the latest build.
   - `https://mantle.ngrok.com/llms-full.txt` is several megabytes. Do not read all of it. Search it for `# Framed preview sources` when you build an app shell.

## Workflow

1. **Find the part.** Call `find` with the user's goal, or search `agent.json` by `name`, `aliases`, `useWhen`, and `summary`. Pick a component from its `useWhen` and `siblings` boundary, not from its name alone. When a recipe matches, start from its `parts`.
2. **Read the contract.** Call `get`, or read the part's type declarations (see the `types` path above) and its `.md` docs page. Copy the import path from `importPath`. Do not guess props.
3. **Compose.** Follow the import rules and the part tree in the examples. Arrange the parts by the design principles (`read_docs` with `base/design-principles`, or `https://mantle.ngrok.com/base/design-principles.md`): balance, grouping, hierarchy, typography, consistency, and feedback.
4. **Check.** Call `check` on each TSX file that you change, and fix what it reports. Without the server, compare each import with `importPath` and each prop with the type declarations.
5. **Disclose.** In your final reply, list each part that you built instead of a mantle part, and why. Name the gap report when you filed one. Claim a mantle part only with evidence: its import and the JSX that renders it. An import alone is not evidence.
6. **Upgrade.** Before you change the mantle version, call `migrate` (or read `https://mantle.ngrok.com/migrations`) and run each guide and codemod in order.

## Import rules

- Import each part from its own subpath: `import { Button } from "@ngrok/mantle/button";`. There is no root `@ngrok/mantle` import.
- Import subpaths are flat. The docs URL `/components/actions/button` has a category segment, and the import path does not.
- Some parts share a parent's subpath: `IconButton` from `@ngrok/mantle/button`, `PasswordInput` from `@ngrok/mantle/input`, and `ProgressBar` and `ProgressDonut` from `@ngrok/mantle/progress`. The `importPath` field is always correct.
- Hooks come from `@ngrok/mantle/hooks`. Utilities have their own subpaths, such as `@ngrok/mantle/cx` and `@ngrok/mantle/color`.
- A compound component is a namespace of parts. Render the full tree from its examples, starting at `X.Root`:

  ```tsx
  import { Button } from "@ngrok/mantle/button";
  import { Dialog } from "@ngrok/mantle/dialog";

  <Dialog.Root>
  	<Dialog.Trigger asChild>
  		<Button appearance="outlined" intent="neutral">
  			Edit
  		</Button>
  	</Dialog.Trigger>
  	<Dialog.Content>
  		<Dialog.Header>
  			<Dialog.Title>Edit profile</Dialog.Title>
  		</Dialog.Header>
  	</Dialog.Content>
  </Dialog.Root>;
  ```

- Use `asChild` to render a part as another element, such as a router `Link`, and keep its styles and behavior. Do not wrap the part in another element for this.
- Compose `className` with `cx` from `@ngrok/mantle/cx`. Do not use `clsx`, `classnames`, or string interpolation in `className`.
- Import one Phosphor icon per module: `import { FireIcon } from "@phosphor-icons/react/Fire";`. Do not import the `@phosphor-icons/react` barrel. ngrok's own icons come from `@ngrok/mantle/icons`.

## App setup

- The app's CSS entry imports `@ngrok/mantle/mantle.css` and then `@ngrok/mantle/source-all.css`, in the same CSS file. Without `source-all.css`, Tailwind generates none of the classes that mantle uses, and the components render without styles.
- To trim the production stylesheet in a Vite app, add `mantleSourcesPlugin()` from `@ngrok/mantle-vite-plugins` next to `tailwindcss()` in `vite.config.ts`. The CSS file does not change.
- Mount `ThemeProvider` and `Toaster` once at the root. Add `TooltipProvider` once at the root for shared tooltip delay settings.

## Component rules

- `Button` and `IconButton` have no default `appearance` or `intent`, so set both. A primary action is `appearance="filled" intent="neutral"`. `Button` takes `"accent"`, `"danger"`, or `"neutral"`; keep `"accent"` for deliberate brand emphasis. `IconButton` takes `"neutral"` only and requires a `label`.
- Pair each form control with a `Label`. Use real controls (`Input`, `Checkbox`, `RadioGroup`), never a `<div>` with a click handler.
- `Tooltip` is for short label hints, `Popover` for interactive content, and `HoverCard` for preview cards that are not essential.
- `DataTable` is for rows that the user sorts, filters, pages through, selects, or expands into a detail panel or sub-rows. `Table` is for static rows and has no row expansion.
- Color scales use Tailwind's `50`–`950` steps, such as `text-accent-600`. There is no `1`–`12` scale. Text colors are `text-strong`, `text-body`, `text-muted`, and `text-placeholder`.

## Translation-safe markup

Browser translation engines move text nodes. If React inserts an element before a moved text node, it throws `NotFoundError` and the page goes blank.

- Never render a conditional element immediately before bare text children. Wrap the text in a `<span>`, move the element after the text, or render it always.
- Pass a `Button` or `Badge` icon through the `icon` prop, never as a child.
- Mark code, keys, file names, IDs, and passcodes `translate="no"`. The attribute does not fix a crash: fix the structure.
