"use client";

import { Root, Row } from "./primitive.js";
import { VirtualRoot } from "./virtual.js";

/**
 * A low-level, composition-based **list primitive**: the shared scroll + row
 * chrome and ARIA semantics behind `ScrollableList` and `SelectableList`. Reach
 * for it directly only when neither of those higher-level components fits — you
 * want the bordered, rounded `bg-popover` viewport and its hover / selected row
 * pills, but with your own state, layout, and (optionally) windowing.
 *
 * Compose `List.Row` children under a `List.Root` (or the windowed
 * `List.VirtualRoot`); state lives on the rows, not the list. `semantics`
 * chooses the ARIA shape: `"list"` renders a `role="list"` of `role="listitem"`
 * rows with native tab order plus `ArrowUp` / `ArrowDown` / `Home` / `End`
 * moving focus between rows (like `ScrollableList`), while `"grid"` renders a
 * `role="grid"` of `aria-selected` `role="row"`s with a single tab stop and
 * `aria-activedescendant` keyboard navigation that survives virtualization (like
 * `SelectableList`). `List.VirtualRoot` windows the same `Row` children via
 * `@tanstack/react-virtual`, so opting into virtualization never changes the
 * call site — **bound the height** so it has a viewport to measure.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * Composition:
 * ```
 * List.Root                          (or List.VirtualRoot)
 * └── List.Row
 *     └── (your row content — a button, gridcells, a link, …)
 * ```
 *
 * @example
 * ```tsx
 * <List.Root semantics="list" aria-label="Accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Row key={account.id} selected={account.id === currentId}>
 *       <button type="button" className="w-full px-2 py-1.5 text-left">
 *         {account.name}
 *       </button>
 *     </List.Row>
 *   ))}
 * </List.Root>
 * ```
 */
const List = {
	/**
	 * The non-virtualized list shell: renders its composed `List.Row` children in
	 * normal flow inside the scroll-viewport chrome, with the `role="list"` /
	 * `role="grid"` semantics (and, for a grid, `aria-activedescendant` keyboard
	 * navigation). The default renderer — reach for `List.VirtualRoot` only when a
	 * collection needs windowing.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.Root semantics="list" aria-label="Accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Row key={account.id} selected={account.id === currentId}>
	 *       <button type="button" className="w-full px-2 py-1.5 text-left">
	 *         {account.name}
	 *       </button>
	 *     </List.Row>
	 *   ))}
	 * </List.Root>
	 * ```
	 */
	Root,
	/**
	 * The windowed counterpart to `List.Root`: renders only the visible slice of
	 * its `List.Row` children via `@tanstack/react-virtual`, sharing the plain
	 * shell's chrome, semantics, and — for a grid — `aria-activedescendant`
	 * keyboard navigation. Authored identically to `List.Root`. **Bound the
	 * height** so the virtualizer has a viewport to measure.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.VirtualRoot semantics="grid" aria-label="Access keys" className="max-h-80" onActivate={toggleByIndex}>
	 *   {keys.map((key) => (
	 *     <List.Row key={key.id} selected={selected.has(key.id)}>
	 *       <div role="gridcell"><Checkbox checked={selected.has(key.id)} tabIndex={-1} /></div>
	 *       <div role="gridcell">{key.name}</div>
	 *     </List.Row>
	 *   ))}
	 * </List.VirtualRoot>
	 * ```
	 */
	VirtualRoot,
	/**
	 * A single composed row — a `<div role="listitem">` (list) or `<div role="row">`
	 * with `aria-selected` (grid), taking its semantics from the enclosing
	 * `List.Root` / `List.VirtualRoot`. Owns the pill chrome and the
	 * selected/disabled data attributes; supports `asChild` to render your own
	 * element. Compose one per item and give it a React `key`.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.Root semantics="list" aria-label="Accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Row key={account.id} selected={account.id === currentId}>
	 *       <button type="button" className="w-full px-2 py-1.5 text-left">
	 *         {account.name}
	 *       </button>
	 *     </List.Row>
	 *   ))}
	 * </List.Root>
	 * ```
	 */
	Row,
} as const;

export {
	//,
	List,
};
