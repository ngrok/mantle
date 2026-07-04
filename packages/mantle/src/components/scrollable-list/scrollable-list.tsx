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
 * minus `semantics` (a `ScrollableList` is always a `role="list"`) and the
 * grid-only `onActivate` / `rowId` knobs (inert under list semantics).
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
 *   <ScrollableList.Item onClick={() => {}}>
 *     <ScrollableList.ItemTitle>Acme Inc</ScrollableList.ItemTitle>
 *     <ScrollableList.ItemDescription>Pay-as-you-go</ScrollableList.ItemDescription>
 *   </ScrollableList.Item>
 * </ScrollableList.Viewport>
 * ```
 */
type ScrollableListViewportProps = Omit<ListRootProps, "semantics" | "onActivate" | "rowId">;

/**
 * The scrollable container for a `ScrollableList`: a `role="list"` of clickable
 * rows inside the bordered, rounded `bg-popover` viewport (styled after the
 * `MultiSelect` popover). Renders **every** row — the non-virtualized default.
 * Compose `ScrollableList.Item` children directly. **Bound its height**
 * (`max-h-*`, `h-*`, or `min-h-0 flex-1`) so long lists scroll.
 *
 * Keyboard: rows keep their native tab order, and `ArrowUp` / `ArrowDown` /
 * `Home` / `End` also move focus between rows (skipping disabled ones); the
 * focused row lights up with the hover tint rather than a focus ring.
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
	<ListRoot ref={ref} data-slot="scrollable-list-viewport" semantics="list" {...props} />
));
Viewport.displayName = "ScrollableListViewport";

/**
 * Props for `ScrollableList.VirtualViewport` — the `list` primitive's
 * `VirtualRoot` props (viewport props plus `estimateRowHeight` / `overscan`),
 * minus `semantics` and the grid-only `onActivate` / `rowId` knobs.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.VirtualViewport aria-label="Your accounts" className="max-h-80" estimateRowHeight={44}>
 *   <ScrollableList.Item onClick={() => {}}>
 *     <ScrollableList.ItemTitle>Acme Inc</ScrollableList.ItemTitle>
 *     <ScrollableList.ItemDescription>Pay-as-you-go</ScrollableList.ItemDescription>
 *   </ScrollableList.Item>
 * </ScrollableList.VirtualViewport>
 * ```
 */
type ScrollableListVirtualViewportProps = Omit<
	VirtualRootProps,
	"semantics" | "onActivate" | "rowId"
>;

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
 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.VirtualViewport>
 * ```
 */
const VirtualViewport = forwardRef<ComponentRef<"div">, ScrollableListVirtualViewportProps>(
	(props, ref) => (
		<ListVirtualRoot ref={ref} data-slot="scrollable-list-viewport" semantics="list" {...props} />
	),
);
VirtualViewport.displayName = "ScrollableListVirtualViewport";

/**
 * Props for `ScrollableList.Item`. Extends `<button>` props (minus `type`, which
 * is fixed to `"button"`) with `asChild` and the optional `selected` accent.
 *
 * @see https://mantle.ngrok.com/components/scrollable-list
 *
 * @example
 * ```tsx
 * <ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
 *   <ScrollableList.Item selected onClick={() => {}}>
 *     <ScrollableList.ItemTitle>Acme Inc</ScrollableList.ItemTitle>
 *     <ScrollableList.ItemDescription>Pay-as-you-go</ScrollableList.ItemDescription>
 *   </ScrollableList.Item>
 * </ScrollableList.Viewport>
 * ```
 */
type ScrollableListItemProps = Omit<ComponentProps<"button">, "type"> &
	WithAsChild & {
		/**
		 * Marks the row as the selected/current one — gives its pill the accent
		 * tint and sets `aria-current` so the state is announced, not just shown.
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
 * // Action rows.
 * <ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
 *       <ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.Viewport>
 * ```
 *
 * @example
 * ```tsx
 * // Navigation rows via asChild.
 * <ScrollableList.Viewport aria-label="SSO providers" className="max-h-80">
 *   {providers.map((provider) => (
 *     <ScrollableList.Item key={provider.id} asChild>
 *       <a href={`/sso/${provider.id}`}>
 *         <ScrollableList.ItemTitle>{provider.name}</ScrollableList.ItemTitle>
 *         <ScrollableList.ItemDescription>{provider.domain}</ScrollableList.ItemDescription>
 *       </a>
 *     </ScrollableList.Item>
 *   ))}
 * </ScrollableList.Viewport>
 * ```
 */
const Item = forwardRef<ComponentRef<"button">, ScrollableListItemProps>(
	({ asChild, className, disabled, onClick, selected, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";

		return (
			<ListRow selected={selected} disabled={disabled}>
				<Comp
					ref={ref}
					data-slot="scrollable-list-item"
					// `role="list"` rows carry no aria-selected; announce the selected /
					// current row (e.g. the active account) with aria-current instead so the
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
						// The hover / selected tint lives on the enclosing row; this is the
						// transparent, clickable content area that fills it. Keyboard focus is
						// conveyed by the row's tint (it lights up like hover via
						// `has-[:focus-visible]`), so the control suppresses its own outline
						// instead of drawing a focus ring.
						"flex w-full cursor-pointer flex-col gap-0.5 rounded-md bg-transparent px-2 py-1.5 text-left text-sm",
						"disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:pointer-events-none",
						"focus-visible:outline-hidden",
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
 * Both are built on the shared `list` primitive. Rows keep their native tab
 * order, and `ArrowUp` / `ArrowDown` / `Home` / `End` also move focus between
 * them — the focused row tints like hover instead of drawing a focus ring.
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
	 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
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
	 *       <ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
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
	Item,
	/**
	 * Emphasized title line inside a `ScrollableList.Item`.
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
	ItemTitle,
	/**
	 * De-emphasized sub-line inside a `ScrollableList.Item`.
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
