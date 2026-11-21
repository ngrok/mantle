/**
 * Re-exports for the List component: a scrollable, optionally-virtualized
 * list of clickable items (account switchers, SSO provider pickers).
 *
 * The list primitive backing it (and `SelectableList`) lives in
 * `./primitive.js` / `./virtual.js` and is deliberately **not** exported. It
 * is internal shared implementation, mirroring how `dialog/primitive` backs
 * the dialog family.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 */

import * as ListParts from "./list-parts.js";

/**
 * A scrollable, optionally-virtualized list of clickable items: the action /
 * navigation counterpart to `SelectableList` (e.g. an account switcher or SSO
 * provider picker). Compose `List.Item` children directly inside a
 * `List.Root`; each item is a `<button>` (or your own element via
 * `asChild`, e.g. an `<a>`), with an optional `current` accent.
 *
 * It is a **non-selecting** semantic list (`role="list"` of `role="listitem"`),
 * not a selection widget; selection is `SelectableList`'s job. Non-virtualized
 * by default; swap `Root` → `VirtualRoot` (same children) for windowing.
 * Both public list components are built on the same internal list primitive
 * (`./primitive.js`, deliberately unexported, like `dialog/primitive`). Items
 * keep their native tab order, and `ArrowUp` / `ArrowDown` / `Home` / `End`
 * also move focus between them. The focused item tints like hover instead of
 * drawing a focus ring.
 *
 * @useWhen Show a scrollable list of items that each run an action or navigate, such as an account
 * switcher.
 *
 * @siblings
 * - `SelectableList`: the user selects rows with checkboxes.
 * - `DropdownMenu`: the actions open in a menu from a button.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * Composition:
 * ```
 * List.Root   (or .VirtualRoot)
 * └── List.Item
 *     ├── List.ItemTitle
 *     └── List.ItemDescription
 * ```
 *
 * @example
 * ```tsx
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>
 *         {account.plan} · {account.memberCount} members
 *       </List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Root>
 * ```
 */
const List = ListParts;

export {
	//,
	List,
};

export type {
	//,
	ListItemProps,
	ListRootProps,
	ListVirtualRootProps,
} from "./list.js";
