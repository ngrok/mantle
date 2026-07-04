"use client";

import { forwardRef } from "react";
import type { ComponentProps, ComponentRef } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Root as ListRoot, Item as ListItem } from "./primitive.js";
import type { ListRootProps } from "./primitive.js";
import { VirtualRoot as ListVirtualRoot } from "./virtual.js";
import type { VirtualRootProps } from "./virtual.js";
import { Slot } from "../slot/index.js";

/**
 * Props for `List.Viewport` — the internal list primitive's `Root` props, minus
 * `semantics` (a `List` is always a `role="list"`) and the grid-only
 * `onActivate` / `itemId` knobs (inert under list semantics).
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   <List.Item onClick={() => {}}>
 *     <List.ItemTitle>Acme Inc</List.ItemTitle>
 *     <List.ItemDescription>Pay-as-you-go</List.ItemDescription>
 *   </List.Item>
 * </List.Viewport>
 * ```
 */
type ListViewportProps = Omit<ListRootProps, "semantics" | "onActivate" | "itemId">;

/**
 * The scrollable container for a `List`: a `role="list"` of clickable items
 * inside the bordered, rounded `bg-popover` viewport (styled after the
 * `MultiSelect` popover). Renders **every** item — the non-virtualized default.
 * Compose `List.Item` children directly. **Bound its height**
 * (`max-h-*`, `h-*`, or `min-h-0 flex-1`) so long lists scroll.
 *
 * Keyboard: items keep their native tab order, and `ArrowUp` / `ArrowDown` /
 * `Home` / `End` also move focus between items (skipping disabled ones); the
 * focused item lights up with the hover tint rather than a focus ring.
 *
 * For very long lists, swap in `List.VirtualViewport`, which windows the same
 * `Item` children — the call site is otherwise identical.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Viewport>
 * ```
 */
const Viewport = forwardRef<ComponentRef<"div">, ListViewportProps>((props, ref) => (
	<ListRoot ref={ref} semantics="list" {...props} />
));
Viewport.displayName = "ListViewport";

/**
 * Props for `List.VirtualViewport` — the internal list primitive's
 * `VirtualRoot` props (viewport props plus `estimateItemHeight` / `overscan`),
 * minus `semantics` and the grid-only `onActivate` / `itemId` knobs.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.VirtualViewport aria-label="Your accounts" className="max-h-80" estimateItemHeight={44}>
 *   <List.Item onClick={() => {}}>
 *     <List.ItemTitle>Acme Inc</List.ItemTitle>
 *     <List.ItemDescription>Pay-as-you-go</List.ItemDescription>
 *   </List.Item>
 * </List.VirtualViewport>
 * ```
 */
type ListVirtualViewportProps = Omit<VirtualRootProps, "semantics" | "onActivate" | "itemId">;

/**
 * The windowed counterpart to `List.Viewport`: renders only the visible slice
 * of its `List.Item` children via `@tanstack/react-virtual`. Authored
 * identically to `Viewport` — same `Item` children — so opting into
 * virtualization never changes the call site. Reach for it only when a list is
 * long enough to need it; **bound its height** so the virtualizer has a
 * viewport to measure.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.VirtualViewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.VirtualViewport>
 * ```
 */
const VirtualViewport = forwardRef<ComponentRef<"div">, ListVirtualViewportProps>((props, ref) => (
	<ListVirtualRoot ref={ref} semantics="list" {...props} />
));
VirtualViewport.displayName = "ListVirtualViewport";

/**
 * Props for `List.Item`. Extends `<button>` props (minus `type`, which is fixed
 * to `"button"`) with `asChild` and the optional `selected` accent.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   <List.Item selected onClick={() => {}}>
 *     <List.ItemTitle>Acme Inc</List.ItemTitle>
 *     <List.ItemDescription>Pay-as-you-go</List.ItemDescription>
 *   </List.Item>
 * </List.Viewport>
 * ```
 */
type ListItemProps = Omit<ComponentProps<"button">, "type"> &
	WithAsChild & {
		/**
		 * Marks the item as the selected/current one — gives its pill the accent
		 * tint and sets `aria-current` so the state is announced, not just shown.
		 * Optional; omit it for a plain action/navigation list.
		 */
		selected?: boolean;
	};

/**
 * A single clickable item in a `List`. Sits inside a `role="listitem"` pill
 * from the internal list primitive; renders a `<button>` by default (with
 * `onClick`), or your own element via `asChild` — e.g. an `<a>` for navigation
 * (account switching, SSO selection). The button/link fills its pill, so
 * clicking anywhere on the item triggers it, and the pill's hover / `selected`
 * accent is provided by the enclosing listitem.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * // Action items.
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Viewport>
 * ```
 *
 * @example
 * ```tsx
 * // Navigation items via asChild.
 * <List.Viewport aria-label="SSO providers" className="max-h-80">
 *   {providers.map((provider) => (
 *     <List.Item key={provider.id} asChild>
 *       <a href={`/sso/${provider.id}`}>
 *         <List.ItemTitle>{provider.name}</List.ItemTitle>
 *         <List.ItemDescription>{provider.domain}</List.ItemDescription>
 *       </a>
 *     </List.Item>
 *   ))}
 * </List.Viewport>
 * ```
 */
const Item = forwardRef<ComponentRef<"button">, ListItemProps>(
	({ asChild, className, disabled, onClick, selected, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";

		return (
			<ListItem selected={selected} disabled={disabled}>
				<Comp
					ref={ref}
					data-slot="list-item-control"
					// `role="list"` items carry no aria-selected; announce the selected /
					// current item (e.g. the active account) with aria-current instead so the
					// state isn't conveyed by the pill tint alone.
					aria-current={selected || undefined}
					// A real <button> for the default (fully inert when `disabled`). For asChild
					// the consumer owns the element (e.g. <a>), where the `disabled` attribute
					// isn't valid — so convey state with `aria-disabled` and actually make it
					// inert: drop it from the tab order (`tabIndex={-1}`), block pointer events
					// (`aria-disabled:pointer-events-none` below), and swallow the click in the
					// onClick handler below, because assistive tech dispatches clicks directly
					// (no hit testing) so `pointer-events` alone wouldn't stop an SR-activated
					// link.
					{...(asChild
						? { "aria-disabled": disabled || undefined, tabIndex: disabled ? -1 : undefined }
						: { type: "button", disabled })}
					onClick={(event) => {
						if (asChild && disabled) {
							event.preventDefault();
							event.stopPropagation();
							return;
						}
						onClick?.(event);
					}}
					className={cx(
						// The hover / selected tint lives on the enclosing listitem; this is the
						// transparent, clickable content area that fills it. Keyboard focus is
						// conveyed by the listitem's tint (it lights up like hover via
						// `has-[:focus-visible]`), so the control suppresses its own outline
						// instead of drawing a focus ring.
						"flex w-full cursor-pointer flex-col gap-0.5 rounded-md bg-transparent px-2 py-1.5 text-left text-sm",
						"disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:pointer-events-none",
						"focus-visible:outline-hidden",
						className,
					)}
					{...props}
				/>
			</ListItem>
		);
	},
);
Item.displayName = "ListItem";

/**
 * The emphasized title line inside a `List.Item`, in the stronger foreground
 * color. A styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Viewport>
 * ```
 */
const ItemTitle = forwardRef<ComponentRef<"span">, ComponentProps<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="list-item-title"
			className={cx("text-strong font-medium", className)}
			{...props}
		/>
	),
);
ItemTitle.displayName = "ListItemTitle";

/**
 * The de-emphasized sub-line inside a `List.Item`, in the muted body color. A
 * styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Viewport>
 * ```
 */
const ItemDescription = forwardRef<ComponentRef<"span">, ComponentProps<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="list-item-description"
			className={cx("text-body leading-4", className)}
			{...props}
		/>
	),
);
ItemDescription.displayName = "ListItemDescription";

/**
 * A scrollable, optionally-virtualized list of clickable items — the action /
 * navigation counterpart to `SelectableList` (e.g. an account switcher or SSO
 * provider picker). Compose `List.Item` children directly inside a
 * `List.Viewport`; each item is a `<button>` (or your own element via
 * `asChild`, e.g. an `<a>`), with an optional `selected` accent.
 *
 * It is a **non-selecting** semantic list (`role="list"` of `role="listitem"`),
 * not a selection widget — selection is `SelectableList`'s job. Non-virtualized
 * by default; swap `Viewport` → `VirtualViewport` (same children) for windowing.
 * Both public list components are built on the same internal list primitive
 * (`./primitive.js`, deliberately unexported — like `dialog/primitive`). Items
 * keep their native tab order, and `ArrowUp` / `ArrowDown` / `Home` / `End`
 * also move focus between them — the focused item tints like hover instead of
 * drawing a focus ring.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * Composition:
 * ```
 * List.Viewport   (or .VirtualViewport)
 * └── List.Item
 *     ├── List.ItemTitle
 *     └── List.ItemDescription
 * ```
 *
 * @example
 * ```tsx
 * <List.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>
 *         {account.plan} · {account.memberCount} members
 *       </List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Viewport>
 * ```
 */
const List = {
	/**
	 * The scrollable container (non-virtualized). Give it an `aria-label` and
	 * bound its height. Compose `Item` children.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.Viewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Viewport>
	 * ```
	 */
	Viewport,
	/**
	 * The virtualized container — windows the same `Item` children. Opt in for
	 * long lists; authored identically to `Viewport`.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.VirtualViewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.VirtualViewport>
	 * ```
	 */
	VirtualViewport,
	/**
	 * A clickable item — a `<button>` by default, or your own element via
	 * `asChild` (e.g. an `<a>`). Optional `selected` gives the accent treatment.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.Viewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Viewport>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title line inside a `List.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.Viewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Viewport>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line inside a `List.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/list
	 *
	 * @example
	 * ```tsx
	 * <List.Viewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Viewport>
	 * ```
	 */
	ItemDescription,
} as const;

export {
	//,
	List,
};

export type {
	//,
	ListItemProps,
	ListViewportProps,
	ListVirtualViewportProps,
};
