"use client";

import type { ComponentProps, MouseEvent } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Root as ListPrimitiveRoot, Item as ListPrimitiveItem } from "./primitive.js";
import type { ListRootProps as ListPrimitiveRootProps } from "./primitive.js";
import { VirtualRoot as ListPrimitiveVirtualRoot } from "./virtual.js";
import type { VirtualRootProps as ListPrimitiveVirtualRootProps } from "./virtual.js";
import { Slot } from "../slot/index.js";

/**
 * Props for `List.Root` — the internal list primitive's `Root` props, minus
 * `semantics` (a `List` is always a `role="list"`) and the grid-only
 * `onActivate` / `itemId` knobs (inert under list semantics).
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   <List.Item onClick={() => {}}>
 *     <List.ItemTitle>Acme Inc</List.ItemTitle>
 *     <List.ItemDescription>Pay-as-you-go</List.ItemDescription>
 *   </List.Item>
 * </List.Root>
 * ```
 */
type ListRootProps = Omit<
	ListPrimitiveRootProps,
	"semantics" | "onActivate" | "itemId" | "isItemDisabled"
>;

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
 * For very long lists, swap in `List.VirtualRoot`, which windows the same
 * `Item` children — the call site is otherwise identical.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Root>
 * ```
 */
const Root = (props: ListRootProps) => <ListPrimitiveRoot semantics="list" {...props} />;
Root.displayName = "ListRoot";

/**
 * Props for `List.VirtualRoot` — the internal list primitive's
 * `VirtualRoot` props (viewport props plus `estimateItemHeight` / `overscan`),
 * minus `semantics` and the grid-only `onActivate` / `itemId` knobs.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.VirtualRoot aria-label="Your accounts" className="max-h-80" estimateItemHeight={44}>
 *   <List.Item onClick={() => {}}>
 *     <List.ItemTitle>Acme Inc</List.ItemTitle>
 *     <List.ItemDescription>Pay-as-you-go</List.ItemDescription>
 *   </List.Item>
 * </List.VirtualRoot>
 * ```
 */
type ListVirtualRootProps = Omit<
	ListPrimitiveVirtualRootProps,
	"semantics" | "onActivate" | "itemId" | "isItemDisabled"
>;

/**
 * The windowed counterpart to `List.Root`: renders only the visible slice
 * of its `List.Item` children via `@tanstack/react-virtual`. Authored
 * identically to `Root` — same `Item` children — so opting into
 * virtualization never changes the call site. Reach for it only when a list is
 * long enough to need it; **bound its height** so the virtualizer has a
 * viewport to measure.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.VirtualRoot aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.VirtualRoot>
 * ```
 */
const VirtualRoot = (props: ListVirtualRootProps) => (
	<ListPrimitiveVirtualRoot semantics="list" {...props} />
);
VirtualRoot.displayName = "ListVirtualRoot";

/**
 * Props for `List.Item`. Extends `<button>` props (minus `type`, which is fixed
 * to `"button"`) with `asChild` and the optional `current` accent.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   <List.Item current onClick={() => {}}>
 *     <List.ItemTitle>Acme Inc</List.ItemTitle>
 *     <List.ItemDescription>Pay-as-you-go</List.ItemDescription>
 *   </List.Item>
 * </List.Root>
 * ```
 */
type ListItemProps = Omit<ComponentProps<"button">, "type"> &
	WithAsChild & {
		/**
		 * Marks the item as the current one (e.g. the active account) — gives its
		 * pill the accent tint and sets `aria-current` so the state is announced,
		 * not just shown. Optional; omit it for a plain action/navigation list.
		 */
		current?: boolean;
	};

/**
 * A single clickable item in a `List`. Sits inside a `role="listitem"` pill
 * from the internal list primitive; renders a `<button>` by default (with
 * `onClick`), or your own element via `asChild` — e.g. an `<a>` for navigation
 * (account switching, SSO selection). The button/link fills its pill, so
 * clicking anywhere on the item triggers it, and the pill's hover / `current`
 * accent is provided by the enclosing listitem.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * // Action items.
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Navigation items via asChild.
 * <List.Root aria-label="SSO providers" className="max-h-80">
 *   {providers.map((provider) => (
 *     <List.Item key={provider.id} asChild>
 *       <a href={`/sso/${provider.id}`}>
 *         <List.ItemTitle>{provider.name}</List.ItemTitle>
 *         <List.ItemDescription>{provider.domain}</List.ItemDescription>
 *       </a>
 *     </List.Item>
 *   ))}
 * </List.Root>
 * ```
 */
const Item = ({ asChild, className, current, disabled, onClick, ref, ...props }: ListItemProps) => {
	const Comp = asChild ? Slot : "button";

	return (
		<ListPrimitiveItem selected={current} disabled={disabled}>
			<Comp
				ref={ref}
				data-slot="list-item-control"
				// `role="list"` items carry no aria-selected; announce the current
				// item (e.g. the active account) with aria-current so the state isn't
				// conveyed by the pill tint alone.
				aria-current={current || undefined}
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
				// Why: the asChild union (Slot | "button") no longer infers a single
				// event type; React event handlers are bivariant, so pin the param.
				onClick={(event: MouseEvent<HTMLButtonElement>) => {
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
				// After the spread so a consumer's own capture handler can't shadow the
				// disabled guard. Radix Slot composes the child's own onClick FIRST (in
				// the bubble phase), so the bubble-phase swallow above lands too late to
				// stop a router <Link> / consumer handler on the child. A capture-phase
				// preventDefault runs before any bubble onClick, so the child sees
				// defaultPrevented — blocking screen-reader / programmatic clicks (which
				// bypass the `pointer-events:none` hit-test block) from navigating.
				onClickCapture={
					asChild && disabled
						? (event) => {
								event.preventDefault();
								event.stopPropagation();
							}
						: props.onClickCapture
				}
			/>
		</ListPrimitiveItem>
	);
};
Item.displayName = "ListItem";

/**
 * The emphasized title line inside a `List.Item`, in the stronger foreground
 * color. A styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Root>
 * ```
 */
const ItemTitle = ({ className, ref, ...props }: ComponentProps<"span">) => (
	<span
		ref={ref}
		data-slot="list-item-title"
		className={cx("text-strong font-medium", className)}
		{...props}
	/>
);
ItemTitle.displayName = "ListItemTitle";

/**
 * The de-emphasized sub-line inside a `List.Item`, in the muted body color. A
 * styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <List.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <List.ItemTitle>{account.name}</List.ItemTitle>
 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
 *     </List.Item>
 *   ))}
 * </List.Root>
 * ```
 */
const ItemDescription = ({ className, ref, ...props }: ComponentProps<"span">) => (
	<span
		ref={ref}
		data-slot="list-item-description"
		className={cx("text-body leading-4", className)}
		{...props}
	/>
);
ItemDescription.displayName = "ListItemDescription";

/**
 * A scrollable, optionally-virtualized list of clickable items — the action /
 * navigation counterpart to `SelectableList` (e.g. an account switcher or SSO
 * provider picker). Compose `List.Item` children directly inside a
 * `List.Root`; each item is a `<button>` (or your own element via
 * `asChild`, e.g. an `<a>`), with an optional `current` accent.
 *
 * It is a **non-selecting** semantic list (`role="list"` of `role="listitem"`),
 * not a selection widget — selection is `SelectableList`'s job. Non-virtualized
 * by default; swap `Root` → `VirtualRoot` (same children) for windowing.
 * Both public list components are built on the same internal list primitive
 * (`./primitive.js`, deliberately unexported — like `dialog/primitive`). Items
 * keep their native tab order, and `ArrowUp` / `ArrowDown` / `Home` / `End`
 * also move focus between them — the focused item tints like hover instead of
 * drawing a focus ring.
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
const List = {
	/**
	 * The scrollable container (non-virtualized). Give it an `aria-label` and
	 * bound its height. Compose `Item` children.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/list
	 *
	 * @example
	 * ```tsx
	 * <List.Root aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Root>
	 * ```
	 */
	Root,
	/**
	 * The virtualized container — windows the same `Item` children. Opt in for
	 * long lists; authored identically to `Root`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/list
	 *
	 * @example
	 * ```tsx
	 * <List.VirtualRoot aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.VirtualRoot>
	 * ```
	 */
	VirtualRoot,
	/**
	 * A clickable item — a `<button>` by default, or your own element via
	 * `asChild` (e.g. an `<a>`). Optional `current` gives the accent treatment.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/list
	 *
	 * @example
	 * ```tsx
	 * <List.Root aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Root>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title line inside a `List.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/list
	 *
	 * @example
	 * ```tsx
	 * <List.Root aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Root>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line inside a `List.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/list
	 *
	 * @example
	 * ```tsx
	 * <List.Root aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <List.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <List.ItemTitle>{account.name}</List.ItemTitle>
	 *       <List.ItemDescription>{account.plan}</List.ItemDescription>
	 *     </List.Item>
	 *   ))}
	 * </List.Root>
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
	ListRootProps,
	ListVirtualRootProps,
};
