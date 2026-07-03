"use client";

import { forwardRef } from "react";
import type { ComponentProps, ComponentRef } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Root as ListRoot, Row as ListRow } from "../list/primitive.js";
import type { ListRootProps } from "../list/primitive.js";
import { VirtualRoot as ListVirtualRoot } from "../list/virtual.js";
import type { VirtualRootProps } from "../list/virtual.js";
import { Slot } from "../slot/index.js";

/**
 * Props for `ScrollableList.Viewport` — the `list` primitive's `Root` props,
 * minus `semantics` (a `ScrollableList` is always a `role="list"`).
 */
type ScrollableListViewportProps = Omit<ListRootProps, "semantics">;

/**
 * The scrollable container for a `ScrollableList`: a `role="list"` of clickable
 * rows inside the bordered, rounded `bg-popover` viewport (styled after the
 * `MultiSelect` popover). Renders **every** row — the non-virtualized default.
 * Compose `ScrollableList.Item` children directly. **Bound its height**
 * (`max-h-*`, `h-*`, or `min-h-0 flex-1`) so long lists scroll.
 *
 * For very long lists, swap in `ScrollableList.VirtualViewport`, which windows
 * the same `Item` children — the call site is otherwise identical.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.Viewport>
 * ```
 */
const Viewport = forwardRef<ComponentRef<"div">, ScrollableListViewportProps>((props, ref) => (
	<ListRoot ref={ref} data-slot="scrollable-list" semantics="list" {...props} />
));
Viewport.displayName = "ScrollableListViewport";

/**
 * Props for `ScrollableList.VirtualViewport` — the `list` primitive's
 * `VirtualRoot` props (viewport props plus `estimateRowHeight` / `overscan`),
 * minus `semantics`.
 */
type ScrollableListVirtualViewportProps = Omit<VirtualRootProps, "semantics">;

/**
 * The windowed counterpart to `ScrollableList.Viewport`: renders only the
 * visible slice of its `ScrollableList.Item` children via
 * `@tanstack/react-virtual`. Authored identically to `Viewport` — same `Item`
 * children — so opting into virtualization never changes the call site. Reach
 * for it only when a list is long enough to need it; **bound its height** so
 * the virtualizer has a viewport to measure.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.VirtualViewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.VirtualViewport>
 * ```
 */
const VirtualViewport = forwardRef<ComponentRef<"div">, ScrollableListVirtualViewportProps>(
	(props, ref) => (
		<ListVirtualRoot ref={ref} data-slot="scrollable-list" semantics="list" {...props} />
	),
);
VirtualViewport.displayName = "ScrollableListVirtualViewport";

/**
 * Props for `ScrollableList.Item`. Extends `<button>` props (minus `type`, which
 * is fixed to `"button"`) with `asChild` and the optional `selected` accent.
 */
type ScrollableListItemProps = Omit<ComponentProps<"button">, "type"> &
	WithAsChild & {
		/**
		 * Marks the row as selected/active — gives its pill the accent tint.
		 * Optional; omit it for a plain action/navigation list.
		 */
		selected?: boolean;
	};

/**
 * A single clickable row in a `ScrollableList`. Sits inside a `role="listitem"`
 * pill from the `list` primitive; renders a `<button>` by default (with
 * `onClick`), or your own element via `asChild` — e.g. an `<a>` for navigation
 * (account switching, SSO selection). The button/link fills its pill, so
 * clicking anywhere on the row triggers it, and the pill's hover / `selected`
 * accent is provided by the enclosing row.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * // Action row.
 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *   <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
 * </ScrollableList.Item>
 *
 * // Navigation row via asChild.
 * <ScrollableList.Item asChild>
 *   <a href={`/accounts/${account.id}`}>
 *     <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *   </a>
 * </ScrollableList.Item>
 * ```
 */
const Item = forwardRef<ComponentRef<"button">, ScrollableListItemProps>(
	({ asChild, className, disabled, selected, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";

		return (
			<ListRow selected={selected} disabled={disabled}>
				<Comp
					ref={ref}
					data-slot="scrollable-list-item"
					data-selected={selected || undefined}
					// A real <button> for the default (fully inert when `disabled`). For asChild
					// the consumer owns the element (e.g. <a>), where the `disabled` attribute
					// isn't valid — so convey state with `aria-disabled` and actually make it
					// inert: drop it from the tab order (`tabIndex={-1}`) and block pointer
					// events (`aria-disabled:pointer-events-none` below), since `aria-disabled`
					// alone is advisory and wouldn't stop a click or Enter from activating it.
					{...(asChild
						? { "aria-disabled": disabled || undefined, tabIndex: disabled ? -1 : undefined }
						: { type: "button", disabled })}
					className={cx(
						// `rounded-md` matches the pill so the focus ring follows its shape. The
						// hover / selected tint lives on the enclosing row; this is the
						// transparent, clickable content area that fills it.
						"flex w-full cursor-pointer flex-col gap-0.5 rounded-md bg-transparent px-2 py-1.5 text-left text-sm",
						"disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:pointer-events-none",
						"focus-visible:ring-focus-accent focus-visible:ring-inset focus-visible:ring-2 focus-visible:outline-hidden",
						className,
					)}
					{...props}
				/>
			</ListRow>
		);
	},
);
Item.displayName = "ScrollableListItem";

/**
 * The emphasized title line inside a `ScrollableList.Item`, in the stronger
 * foreground color. A styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *   <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
 * </ScrollableList.Item>
 * ```
 */
const ItemTitle = forwardRef<ComponentRef<"span">, ComponentProps<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="scrollable-list-item-title"
			className={cx("text-strong font-medium", className)}
			{...props}
		/>
	),
);
ItemTitle.displayName = "ScrollableListItemTitle";

/**
 * The de-emphasized sub-line inside a `ScrollableList.Item`, in the muted body
 * color. A styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *   <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
 * </ScrollableList.Item>
 * ```
 */
const ItemDescription = forwardRef<ComponentRef<"span">, ComponentProps<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="scrollable-list-item-description"
			className={cx("text-body leading-4", className)}
			{...props}
		/>
	),
);
ItemDescription.displayName = "ScrollableListItemDescription";

/**
 * A scrollable, optionally-virtualized list of clickable rows — the action /
 * navigation counterpart to `SelectableList` (e.g. an account switcher or SSO
 * provider picker). Compose `ScrollableList.Item` rows directly inside a
 * `ScrollableList.Viewport`; each row is a `<button>` (or your own element via
 * `asChild`, e.g. an `<a>`), with an optional `selected` accent.
 *
 * It is a **non-selecting** semantic list (`role="list"` of `role="listitem"`),
 * not a selection widget — selection is `SelectableList`'s job. Non-virtualized
 * by default; swap `Viewport` → `VirtualViewport` (same children) for windowing.
 * Both are built on the shared `list` primitive.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * Composition:
 * ```
 * ScrollableList.Viewport   (or .VirtualViewport)
 * └── ScrollableList.Item
 *     ├── ScrollableList.ItemTitle
 *     └── ScrollableList.ItemDescription
 * ```
 *
 * @example
 * ```tsx
 * <ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *       <ScrollableList.ItemDescription>
 *         {account.plan} · {account.memberCount} members
 *       </ScrollableList.ItemDescription>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.Viewport>
 * ```
 */
const ScrollableList = {
	/**
	 * The scrollable container (non-virtualized). Give it an `aria-label` and
	 * bound its height. Compose `Item` children.
	 *
	 * @see https://mantle.ngrok.com/components/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 *     </ScrollableList.Item>
	 *   ))}
	 * </ScrollableList.Viewport>
	 * ```
	 */
	Viewport,
	/**
	 * The virtualized container — windows the same `Item` children. Opt in for
	 * long lists; authored identically to `Viewport`.
	 *
	 * @see https://mantle.ngrok.com/components/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.VirtualViewport aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 *     </ScrollableList.Item>
	 *   ))}
	 * </ScrollableList.VirtualViewport>
	 * ```
	 */
	VirtualViewport,
	/**
	 * A clickable row — a `<button>` by default, or your own element via
	 * `asChild` (e.g. an `<a>`). Optional `selected` gives the accent treatment.
	 *
	 * @see https://mantle.ngrok.com/components/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
	 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 *   <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
	 * </ScrollableList.Item>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title line inside a `ScrollableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
	 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 * </ScrollableList.Item>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line inside a `ScrollableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
	 *   <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
	 * </ScrollableList.Item>
	 * ```
	 */
	ItemDescription,
} as const;

export {
	//,
	ScrollableList,
};

export type {
	//,
	ScrollableListItemProps,
	ScrollableListViewportProps,
	ScrollableListVirtualViewportProps,
};
