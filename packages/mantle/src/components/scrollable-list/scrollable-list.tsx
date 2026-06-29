"use client";

import { Children, forwardRef, isValidElement } from "react";
import type { ComponentProps, ComponentRef, ReactElement, ReactNode } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";
import { VirtualList } from "../virtual-list/virtual-list.js";

type ScrollableListItemProps = Omit<ComponentProps<"button">, "type"> &
	WithAsChild & {
		/**
		 * Marks the row as selected/active — gives it the accent-tinted pill.
		 * Read by `ScrollableList.Root` to drive the row chrome. Optional; omit it
		 * for a plain action/navigation list.
		 */
		selected?: boolean;
	};

/**
 * A single clickable row in a `ScrollableList`. Renders a `<button>` by default
 * (with `onClick`); pass `asChild` to render as your own element — e.g. an `<a>`
 * for navigation (account switching, SSO selection). The row fills its bordered
 * cell, so clicking anywhere triggers it; the cell chrome (border, hover,
 * `selected` accent) is provided by the list.
 *
 * @see https://mantle.ngrok.com/components/preview/scrollable-list
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
			<Comp
				ref={ref}
				data-slot="scrollable-list-item"
				data-selected={selected || undefined}
				// A real <button> for the default; for asChild the consumer owns the element
				// (e.g. <a>), where `disabled` isn't valid — convey it with aria-disabled.
				{...(asChild ? { "aria-disabled": disabled || undefined } : { type: "button", disabled })}
				className={cx(
					// `rounded-md` matches the pill so the focus ring follows its shape. The
					// hover / selected tint lives on the wrapping pill (see VirtualList); this
					// is the transparent, clickable content area.
					"flex w-full cursor-pointer flex-col gap-0.5 rounded-md bg-transparent px-2 py-1.5 text-left text-sm",
					"disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50",
					"focus-visible:ring-focus-accent focus-visible:ring-inset focus-visible:ring-2 focus-visible:outline-hidden",
					className,
				)}
				{...props}
			/>
		);
	},
);
Item.displayName = "ScrollableListItem";

/**
 * The emphasized title line inside a `ScrollableList.Item`, in the stronger
 * foreground color. A styled `<span>`.
 *
 * @see https://mantle.ngrok.com/components/preview/scrollable-list
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
 * @see https://mantle.ngrok.com/components/preview/scrollable-list
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

type ScrollableListRootProps = Omit<
	ComponentProps<typeof VirtualList>,
	"count" | "getItemKey" | "isItemSelected" | "isItemDisabled" | "children"
> & {
	/** `ScrollableList.Item` rows. The list virtualizes them — only the visible window renders. */
	children: ReactNode;
};

/**
 * Root of a `ScrollableList`: a virtualized, scrollable list of clickable rows
 * styled like the `MultiSelect` popover — a bordered, rounded `bg-popover`
 * container whose rows highlight on hover / selection with an inset, rounded
 * pill. The inline counterpart to `SelectableList` for lists whose rows are
 * **actions or links** rather than multi-select checkboxes (e.g. an account
 * switcher or SSO provider picker).
 *
 * Compose `ScrollableList.Item` children directly — the list reads each item's
 * `selected` / `disabled` to style its row and virtualizes them. **Bound its
 * height** (`max-h-*`, `h-*`, or `min-h-0 flex-1` in a flex parent) so the
 * virtualizer has a scroll viewport; with an auto height it renders every row.
 *
 * @see https://mantle.ngrok.com/components/preview/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *       <ScrollableList.ItemDescription>
 *         {account.plan} · {account.memberCount} members
 *       </ScrollableList.ItemDescription>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"div">, ScrollableListRootProps>(
	({ children, ...props }, ref) => {
		const items = Children.toArray(children).filter(
			(child): child is ReactElement<ScrollableListItemProps> => isValidElement(child),
		);

		return (
			<VirtualList
				ref={ref}
				data-slot="scrollable-list"
				{...props}
				count={items.length}
				getItemKey={(index) => String(items[index]?.key ?? index)}
				isItemSelected={(index) => items[index]?.props.selected ?? false}
				isItemDisabled={(index) => items[index]?.props.disabled ?? false}
			>
				{(index) => items[index] ?? null}
			</VirtualList>
		);
	},
);
Root.displayName = "ScrollableListRoot";

/**
 * A virtualized, scrollable list of clickable rows — the action/navigation
 * counterpart to `SelectableList`. Compose `ScrollableList.Item` rows directly;
 * each is a `<button>` (or your own element via `asChild`, e.g. an `<a>`), with
 * an optional `selected` accent. Built on the same virtualized,
 * `MultiSelect`-popover-styled shell as `SelectableList`.
 *
 * @see https://mantle.ngrok.com/components/preview/scrollable-list
 *
 * @example
 * Composition:
 * ```
 * ScrollableList.Root
 * └── ScrollableList.Item
 *     ├── ScrollableList.ItemTitle
 *     └── ScrollableList.ItemDescription
 * ```
 *
 * @example
 * ```tsx
 * <ScrollableList.Root aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *       <ScrollableList.ItemDescription>
 *         {account.plan} · {account.memberCount} members
 *       </ScrollableList.ItemDescription>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.Root>
 * ```
 */
const ScrollableList = {
	/**
	 * Root: virtualizes its `ScrollableList.Item` children and renders the
	 * bordered, scrollable list. Bound its height for virtualization to engage.
	 *
	 * @see https://mantle.ngrok.com/components/preview/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Root aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
	 *     </ScrollableList.Item>
	 *   ))}
	 * </ScrollableList.Root>
	 * ```
	 */
	Root,
	/**
	 * A clickable row — a `<button>` by default, or your own element via
	 * `asChild` (e.g. an `<a>`). Optional `selected` gives the accent treatment.
	 *
	 * @see https://mantle.ngrok.com/components/preview/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Root aria-label="Your accounts" className="max-h-80">
	 *   {accounts.map((account) => (
	 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
	 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
	 *     </ScrollableList.Item>
	 *   ))}
	 * </ScrollableList.Root>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title line inside a `ScrollableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/preview/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
	 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
	 *   <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
	 * </ScrollableList.Item>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line inside a `ScrollableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/preview/scrollable-list
	 *
	 * @example
	 * ```tsx
	 * <ScrollableList.Item onClick={() => switchTo(account.id)}>
	 *   <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
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
	ScrollableListRootProps,
};
