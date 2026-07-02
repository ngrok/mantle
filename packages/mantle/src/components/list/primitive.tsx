"use client";

import {
	Children,
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useId,
	useMemo,
	useState,
} from "react";
import type {
	ComponentProps,
	ComponentRef,
	CSSProperties,
	FocusEvent,
	KeyboardEvent,
	ReactNode,
	Ref,
} from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

/**
 * ARIA semantics for a {@link Root} / `VirtualRoot` collection and its
 * {@link Row}s. The element is always a `<div>` — per WAI-ARIA the *role*
 * carries the semantics, not the tag — so both flavors share one implementation.
 *
 * - `"list"` → `<div role="list">` of `<div role="listitem">` rows: a
 *   non-selecting list of actions/links (e.g. `ScrollableList`). Native tab
 *   order; no roving.
 * - `"grid"` → `<div role="grid">` of `<div role="row">` rows carrying
 *   `aria-selected`, whose children are the `role="gridcell"`s (e.g.
 *   `SelectableList`): a single tab stop with `aria-activedescendant`
 *   navigation that works across a virtualized window.
 */
type ListSemantics = "list" | "grid";

/** Shared collection semantics, provided by {@link Root} / `VirtualRoot` and read by every {@link Row}. */
type ListContextValue = {
	semantics: ListSemantics;
};

const ListContext = createContext<ListContextValue | null>(null);

/**
 * Read the nearest {@link ListContext}. Throws when a {@link Row} is rendered
 * outside a `Root` / `VirtualRoot` so misuse fails loudly rather than rendering
 * a row with no semantics.
 */
function useListContext(part: string): ListContextValue {
	const context = useContext(ListContext);
	invariant(context, `List.${part} must be rendered inside List.Root or List.VirtualRoot.`);
	return context;
}

/**
 * Per-row placement injected by `VirtualRoot` and read by a {@link Row} it
 * windows: the absolute position + transform, the virtualizer's measure ref,
 * and the windowed `aria-posinset` / `aria-setsize`. `null` for a
 * non-virtualized {@link Root}, where rows render in normal flow.
 */
type ListRowPlacement = {
	/** 1-based position within the full collection (`aria-posinset`). */
	posInSet: number;
	/** Full collection length (`aria-setsize`). */
	setSize: number;
	/** Absolute position + `translateY` transform for the windowed row. */
	style: CSSProperties;
	/** The virtualizer's `measureElement` callback, composed onto the row. */
	measureRef: Ref<HTMLDivElement>;
};

/**
 * Per-row context: the row's index in the full collection (both flavors) plus
 * its virtual placement (`VirtualRoot` only). A {@link Row} reads it for its
 * `data-index`, its `aria-activedescendant` id, and — when windowed — its
 * position/measure/posinset.
 */
type ListRowContextValue = {
	index: number;
	placement: ListRowPlacement | null;
};

const ListRowContext = createContext<ListRowContextValue | null>(null);

/**
 * Grid keyboard-navigation state, provided by a grid {@link Root} / `VirtualRoot`
 * and read by each {@link Row} to derive its `id` (the `aria-activedescendant`
 * target) and active state. `null` under `"list"` semantics (no roving).
 */
type GridNavContextValue = {
	/** The active row's index, or `-1` when nothing is active yet. */
	activeIndex: number;
	/**
	 * The DOM id of the row (or its focusable descendant) that
	 * `aria-activedescendant` resolves to for a given index. Defaults to a stable
	 * per-collection row id, but a consumer can override it to point at a real
	 * element it owns — e.g. `SelectableList` points it at the row's checkbox,
	 * because its row element (a `Choice.Root`) reserves `id` for the control.
	 */
	rowId: (index: number) => string;
};

const GridNavContext = createContext<GridNavContextValue | null>(null);

/**
 * Scroll-viewport chrome — a bordered, rounded `bg-popover` box that rows scroll
 * inside of and clip against, styled after the `MultiSelect` popover (minus its
 * shadow). The `p-1` inset (rather than `px-1` on the collection) is what gives
 * every row's rounded pill its breathing room from the border: it insets the
 * collection itself, so a `VirtualRoot`'s absolutely-positioned rows — whose
 * `left: 0` / `width: 100%` resolve against the collection's *padding* box —
 * clear the border by the same amount as a plain `Root`'s in-flow rows.
 * **Bound its height** (`max-h-*`, `h-*`, or `min-h-0 flex-1`) so a `VirtualRoot`
 * has a viewport to measure.
 */
const listViewportClassName =
	"border-popover bg-popover scrollbar overscroll-none overflow-x-hidden overflow-y-auto rounded-md border p-1";

/**
 * Collection chrome (the `role="list"` / `role="grid"` element). `relative`
 * anchors the absolutely-positioned rows a `VirtualRoot` emits; the row inset
 * lives on the viewport (see {@link listViewportClassName}) so in-flow and
 * windowed rows clear the border identically. `flex flex-col gap-px` gives the
 * `MultiSelect`-style 1px gap between in-flow rows so adjacent selected pills
 * read as distinct (windowed rows are out of flow, so `VirtualRoot` reproduces
 * the same gap via the virtualizer's `gap` option). `outline-hidden` hides the
 * focus ring on the (focusable) grid container — the active *row* tints instead.
 */
const listCollectionClassName = "relative flex w-full flex-col gap-px outline-hidden";

/**
 * Row pill chrome — the inset, rounded surface that tints on hover / selection
 * with the shared menu-item tokens, matching the `MultiSelect` popover options.
 * The active grid row (keyboard `aria-activedescendant` target) tints with the
 * same hover color rather than a ring — `bg-active-menu-item` when unselected,
 * `bg-active-selected-menu-item` when also selected — so `data-[active]` reads
 * exactly like `:hover`. The active+selected rule carries an extra attribute
 * selector, so it wins over the plain selected tint by specificity.
 */
const listRowClassName =
	"rounded-md data-[state=selected]:bg-selected-menu-item data-[active]:bg-active-menu-item data-[active]:data-[state=selected]:bg-active-selected-menu-item";

/**
 * Props for {@link Root} / `VirtualRoot`. Standard `<div>` props (on the scroll
 * viewport) plus the collection `semantics` and the grid activation callback;
 * `aria-label` / `aria-labelledby` name the inner collection element, and
 * `children` are the composed {@link Row}s.
 */
type ListRootProps = ComponentProps<"div"> & {
	/** ARIA semantics for the collection and its rows. Defaults to `"list"`. */
	semantics?: ListSemantics;
	/**
	 * Called with the active row's index when it is activated by keyboard
	 * (`Space` / `Enter`) under `"grid"` semantics. Wire it to selection.
	 */
	onActivate?: (index: number) => void;
	/**
	 * The DOM id that `aria-activedescendant` resolves to for a given row index.
	 * Defaults to a per-collection row id set on the {@link Row} element. Override
	 * it to reference an element you own (e.g. the row's checkbox) when your row
	 * element can't take that id.
	 */
	rowId?: (index: number) => string;
};

/**
 * Build the collection element's ARIA + keyboard props for grid navigation, and
 * track the active row index. Under `"list"` semantics (disabled) it returns an
 * inert `-1` and no collection props, so a plain list keeps its native tab order.
 *
 * `Space` / `Enter` fire {@link onActivate}; arrows / `Home` / `End` move the
 * active index across the **full** `count` (not just the mounted window), and
 * `scrollToIndex` reveals + mounts it. Scrolling happens **only** on keyboard
 * navigation — focus (from a Tab or a row click) just makes the focused row
 * active without moving the viewport, so clicking a row never yanks the scroll.
 * Because keyboard navigation keeps focus on the collection (never on a row), it
 * survives virtualization.
 */
function useGridNavigation({
	count,
	enabled,
	onActivate,
	rowId,
	scrollToIndex,
}: {
	count: number;
	enabled: boolean;
	onActivate?: (index: number) => void;
	rowId: (index: number) => string;
	scrollToIndex: (index: number) => void;
}): {
	activeIndex: number;
	collectionProps: Pick<
		ComponentProps<"div">,
		"tabIndex" | "aria-activedescendant" | "onKeyDown" | "onFocus"
	>;
} {
	const [activeIndex, setActiveIndex] = useState(-1);

	// Keep the active index in range as the collection shrinks (e.g. filtering).
	const clampedActiveIndex = activeIndex >= count ? count - 1 : activeIndex;

	if (!enabled) {
		return { activeIndex: -1, collectionProps: {} };
	}

	const move = (nextIndex: number) => {
		const clamped = Math.max(0, Math.min(nextIndex, count - 1));
		setActiveIndex(clamped);
		// Only keyboard navigation scrolls — reveal + mount the newly active row.
		scrollToIndex(clamped);
	};

	return {
		activeIndex: clampedActiveIndex,
		collectionProps: {
			tabIndex: 0,
			"aria-activedescendant": clampedActiveIndex >= 0 ? rowId(clampedActiveIndex) : undefined,
			onFocus: (event: FocusEvent<HTMLDivElement>) => {
				// Focus entered the grid. The collection is the single tab stop, so the
				// active row is shown by its tint / `aria-activedescendant` — never a
				// real focus ring on a control. If focus landed on a descendant (e.g. a
				// clicked checkbox), make its row active and pull focus back to the
				// collection so a later arrow press doesn't light up that control with
				// `:focus-visible`. Never scroll here — only keyboard navigation moves
				// the viewport, so a click can't reset scroll.
				if (event.target !== event.currentTarget) {
					const focusedRow =
						event.target instanceof Element ? event.target.closest("[data-index]") : null;
					const focusedIndex = focusedRow
						? Number(focusedRow.getAttribute("data-index"))
						: Number.NaN;
					if (Number.isInteger(focusedIndex) && focusedIndex >= 0) {
						setActiveIndex(focusedIndex);
					}
					event.currentTarget.focus({ preventScroll: true });
					return;
				}
				// Focus is on the collection itself (a Tab-in): default to the first row.
				// The functional update keeps the re-entrant focus() above from
				// clobbering a just-set active index back to 0.
				if (count > 0) {
					setActiveIndex((previous) => (previous < 0 ? 0 : previous));
				}
			},
			onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
				switch (event.key) {
					case "ArrowDown":
						event.preventDefault();
						move(clampedActiveIndex < 0 ? 0 : clampedActiveIndex + 1);
						break;
					case "ArrowUp":
						event.preventDefault();
						move(clampedActiveIndex < 0 ? 0 : clampedActiveIndex - 1);
						break;
					case "Home":
						event.preventDefault();
						move(0);
						break;
					case "End":
						event.preventDefault();
						move(count - 1);
						break;
					case " ":
					case "Enter":
						if (clampedActiveIndex >= 0) {
							event.preventDefault();
							onActivate?.(clampedActiveIndex);
						}
						break;
					default:
						break;
				}
			},
		},
	};
}

/**
 * Props for a {@link Row}. Standard `<div>` props (minus `role`, owned by the
 * collection semantics) plus its selection/disabled state. Compose one per item
 * and give it a React `key`; `Root` / `VirtualRoot` inject its index, grid id,
 * and (when windowed) placement.
 */
type ListRowProps = Omit<ComponentProps<"div">, "role"> &
	WithAsChild & {
		/** Whether the row is selected — tints the pill and, in a grid, sets `aria-selected`. */
		selected?: boolean;
		/** Whether the row is disabled — suppresses the hover tint. */
		disabled?: boolean;
	};

/**
 * A single composed row — a `<div role="listitem">` (list) or `<div role="row">`
 * with `aria-selected` (grid), taking its semantics from the enclosing `Root` /
 * `VirtualRoot`. Owns the pill chrome and the selected/disabled data attributes;
 * in a grid it also carries the `aria-activedescendant` id and active-row tint,
 * and — when windowed — the absolute placement, measure ref, and
 * `aria-posinset` / `aria-setsize`. Authoring the same `<List.Row>` works
 * virtualized or not, and even when a consumer's item component wraps it.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * // grid row (selectable): children are role="gridcell"s
 * <List.Row selected={isChecked}>
 *   <div role="gridcell"><Checkbox checked={isChecked} tabIndex={-1} /></div>
 *   <div role="gridcell">{label}</div>
 * </List.Row>
 * ```
 */
const Row = forwardRef<ComponentRef<"div">, ListRowProps>(
	({ asChild, children, className, disabled = false, selected = false, style, ...props }, ref) => {
		const { semantics } = useListContext("Row");
		const rowContext = useContext(ListRowContext);
		const gridNav = useContext(GridNavContext);
		const isGrid = semantics === "grid";
		const Comp = asChild ? Slot : "div";
		const placement = rowContext?.placement ?? null;
		const index = rowContext?.index;
		const isActive = isGrid && gridNav != null && index != null && gridNav.activeIndex === index;

		return (
			<Comp
				ref={composeRefs(ref, placement?.measureRef ?? null)}
				{...props}
				id={isGrid && gridNav != null && index != null ? gridNav.rowId(index) : props.id}
				data-slot="list-row"
				data-index={index}
				data-state={selected ? "selected" : "unselected"}
				data-disabled={disabled || undefined}
				data-active={isActive || undefined}
				role={isGrid ? "row" : "listitem"}
				aria-selected={isGrid ? selected : undefined}
				aria-posinset={placement?.posInSet}
				aria-setsize={placement?.setSize}
				className={cx(
					listRowClassName,
					!disabled &&
						"hover:bg-active-menu-item hover:data-[state=selected]:bg-active-selected-menu-item",
					className,
				)}
				style={placement ? { ...style, ...placement.style } : style}
			>
				{children}
			</Comp>
		);
	},
);
Row.displayName = "ListRow";

/**
 * Provides one non-virtualized row its index through {@link ListRowContext}
 * (with no placement — plain rows sit in normal flow). Extracted so the provider
 * value is a `useMemo` result rather than reconstructed inline; a `Children.map`
 * body can't call hooks itself.
 */
function PlainRow({ children, index }: { children: ReactNode; index: number }) {
	const value = useMemo<ListRowContextValue>(() => ({ index, placement: null }), [index]);

	return <ListRowContext.Provider value={value}>{children}</ListRowContext.Provider>;
}
PlainRow.displayName = "ListPlainRow";

/**
 * The non-virtualized list shell: renders its composed {@link Row} children in
 * normal flow inside the scroll-viewport chrome, with the `role="list"` /
 * `role="grid"` semantics (and, for a grid, `aria-activedescendant` keyboard
 * navigation). The default out-of-the-box renderer — reach for the sibling
 * `VirtualRoot` in `./virtual.js` only when a collection needs windowing.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.Root semantics="list" aria-label="Accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <List.Row key={account.id} selected={account.id === currentId}>
 *       <button className="w-full px-2 py-1.5 text-left">{account.name}</button>
 *     </List.Row>
 *   ))}
 * </List.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"div">, ListRootProps>(
	(
		{
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledby,
			children,
			className,
			onActivate,
			rowId,
			semantics = "list",
			...props
		},
		ref,
	) => {
		const baseId = useId();
		const count = Children.count(children);
		const context = useMemo<ListContextValue>(() => ({ semantics }), [semantics]);
		const resolveRowId = useMemo(
			() => rowId ?? ((index: number) => `${baseId}-row-${index}`),
			[rowId, baseId],
		);

		const scrollToIndex = useCallback(
			(index: number) => {
				document.getElementById(resolveRowId(index))?.scrollIntoView({ block: "nearest" });
			},
			[resolveRowId],
		);
		const { activeIndex, collectionProps } = useGridNavigation({
			count,
			enabled: semantics === "grid",
			onActivate,
			rowId: resolveRowId,
			scrollToIndex,
		});
		const gridNav = useMemo<GridNavContextValue>(
			() => ({ activeIndex, rowId: resolveRowId }),
			[activeIndex, resolveRowId],
		);

		return (
			<ListContext.Provider value={context}>
				<GridNavContext.Provider value={gridNav}>
					<div
						ref={ref}
						data-slot="list"
						className={cx(listViewportClassName, className)}
						{...props}
					>
						<div
							role={semantics === "grid" ? "grid" : "list"}
							aria-label={ariaLabel}
							aria-labelledby={ariaLabelledby}
							className={listCollectionClassName}
							{...collectionProps}
						>
							{Children.map(children, (row, index) => (
								<PlainRow index={index}>{row}</PlainRow>
							))}
						</div>
					</div>
				</GridNavContext.Provider>
			</ListContext.Provider>
		);
	},
);
Root.displayName = "ListRoot";

export {
	//,
	GridNavContext,
	ListContext,
	ListRowContext,
	listCollectionClassName,
	listRowClassName,
	listViewportClassName,
	Root,
	Row,
	useGridNavigation,
};

export type {
	//,
	GridNavContextValue,
	ListContextValue,
	ListRootProps,
	ListRowContextValue,
	ListRowPlacement,
	ListRowProps,
	ListSemantics,
};
