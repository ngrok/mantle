"use client";

import {
	Children,
	createContext,
	forwardRef,
	isValidElement,
	useCallback,
	useContext,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type {
	ComponentProps,
	ComponentRef,
	CSSProperties,
	FocusEvent,
	KeyboardEvent,
	MouseEvent,
	ReactNode,
	Ref,
} from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

// This module is internal shared implementation — it is not exported from the
// package. The public components built on it are `List` (./list.js) and
// `SelectableList`, mirroring how `dialog/primitive` backs the dialog family.

/**
 * ARIA semantics for a {@link Root} / `VirtualRoot` collection and its
 * {@link Item}s. The element is always a `<div>` — per WAI-ARIA the *role*
 * carries the semantics, not the tag — so both flavors share one implementation.
 *
 * - `"list"` → `<div role="list">` of `<div role="listitem">` rows: a
 *   non-selecting list of actions/links (e.g. `List`). Native tab
 *   order, with `ArrowUp` / `ArrowDown` / `Home` / `End` moving real focus
 *   between the rows' controls (skipping disabled rows).
 * - `"grid"` → `<div role="grid">` of `<div role="row">` rows carrying
 *   `aria-selected`, whose children are the `role="gridcell"`s (e.g.
 *   `SelectableList`): a single tab stop with `aria-activedescendant`
 *   navigation that works across a virtualized window.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <Root semantics="grid" aria-label="Access keys" onActivate={toggleByIndex}>
 *   <Item selected>
 *     <div role="gridcell">Onboarding key</div>
 *   </Item>
 * </Root>
 * ```
 */
type ListSemantics = "list" | "grid";

/** Shared collection semantics, provided by {@link Root} / `VirtualRoot` and read by every {@link Item}. */
type ListContextValue = {
	semantics: ListSemantics;
};

const ListContext = createContext<ListContextValue | null>(null);

/**
 * Read the nearest {@link ListContext}. Throws when a {@link Item} is rendered
 * outside a `Root` / `VirtualRoot` so misuse fails loudly rather than rendering
 * a row with no semantics.
 */
function useListContext(part: string): ListContextValue {
	const context = useContext(ListContext);
	invariant(
		context,
		`List.${part} must be composed inside a list viewport (List.Viewport, List.VirtualViewport, or a SelectableList viewport).`,
	);
	return context;
}

/**
 * Per-row placement injected by `VirtualRoot` and read by a {@link Item} it
 * windows: the absolute position + transform, the virtualizer's measure ref,
 * and the windowed `aria-posinset` / `aria-setsize`. `null` for a
 * non-virtualized {@link Root}, where rows render in normal flow.
 */
type ListItemPlacement = {
	/** 1-based position within the full collection (`aria-posinset` on a listitem, `aria-rowindex` on a grid row). */
	posInSet: number;
	/** Full collection length (`aria-setsize` on a listitem; a grid exposes it as `aria-rowcount` on the collection instead). */
	setSize: number;
	/** Absolute position + `translateY` transform for the windowed row. */
	style: CSSProperties;
	/** The virtualizer's `measureElement` callback, composed onto the row. */
	measureRef: Ref<HTMLDivElement>;
};

/**
 * Per-row context: the row's index in the full collection (both flavors) plus
 * its virtual placement (`VirtualRoot` only). A {@link Item} reads it for its
 * `data-index`, its `aria-activedescendant` id, and — when windowed — its
 * position/measure/posinset.
 */
type ListItemContextValue = {
	index: number;
	placement: ListItemPlacement | null;
};

const ListItemContext = createContext<ListItemContextValue | null>(null);

/**
 * Grid keyboard-navigation state, provided by a grid {@link Root} / `VirtualRoot`
 * and read by each {@link Item} to derive its active state and — when the
 * collection owns row ids — its DOM id (the `aria-activedescendant` target).
 * `null` under `"list"` semantics (no roving).
 */
type GridNavContextValue = {
	/** The active row's index, or `-1` when nothing is active yet. */
	activeIndex: number;
	/**
	 * Stamps the collection's default `aria-activedescendant` target id onto the
	 * {@link Item} at an index. `null` when a consumer overrides `itemId` on the
	 * root: the referenced id then belongs to an element the consumer owns (e.g.
	 * `SelectableList` points it at the row's checkbox, because its row element —
	 * a `Choice.Root` — reserves `id` for the control), so the row keeps its own
	 * `id` prop instead of duplicating the consumer's id onto itself.
	 */
	stampItemId: ((index: number) => string) | null;
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
 * Item pill chrome — the inset, rounded surface that tints on hover / selection
 * with the shared menu-item tokens, matching the `MultiSelect` popover options.
 * The active grid row (keyboard `aria-activedescendant` target) tints with the
 * same hover color rather than a ring — `bg-active-menu-item` when unselected,
 * `bg-active-selected-menu-item` when also selected — so `data-[active]` reads
 * exactly like `:hover`. The active+selected rule carries an extra attribute
 * selector, so it wins over the plain selected tint by specificity.
 */
const listItemClassName =
	"rounded-md data-[state=selected]:bg-selected-menu-item data-[active]:bg-active-menu-item data-[active]:data-[state=selected]:bg-active-selected-menu-item";

/**
 * Props for {@link Root} / `VirtualRoot`. Standard `<div>` props (on the scroll
 * viewport) plus the collection `semantics` and the grid activation callback;
 * `aria-label` / `aria-labelledby` name the inner collection element, and
 * `children` are the composed {@link Item}s.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <Root semantics="list" aria-label="Accounts" className="max-h-80">
 *   <Item>
 *     <button type="button">Acme Inc</button>
 *   </Item>
 * </Root>
 * ```
 */
type ListRootProps = ComponentProps<"div"> & {
	/** ARIA semantics for the collection and its rows. Defaults to `"list"`. */
	semantics?: ListSemantics;
	/**
	 * Called with the active row's index when it is activated under `"grid"`
	 * semantics — by keyboard (`Space` / `Enter`) or by a bare click anywhere on
	 * the row that isn't handled by an interactive descendant (a checkbox, a
	 * label, a nested link/button). Wire it to selection.
	 */
	onActivate?: (index: number) => void;
	/**
	 * The DOM id that `aria-activedescendant` resolves to for a given row index.
	 * Defaults to a per-collection row id set on the {@link Item} element. Override
	 * it to reference an element you own (e.g. the row's checkbox) when your row
	 * element can't take that id.
	 */
	itemId?: (index: number) => string;
	/**
	 * Whether the row at an index is disabled — skipped by keyboard navigation
	 * and excluded from grid activation. Defaults to reading the composed row
	 * element's `disabled` prop (covering `<Item disabled>`); pass it when
	 * disabled state lives in your data rather than on the row elements (e.g.
	 * `SelectableList` reads it off `options[].disabled`).
	 */
	isItemDisabled?: (index: number) => boolean;
};

/**
 * Whether a composed row child is disabled — read from the `disabled` prop it
 * declares (e.g. `<Item disabled>`). The default keyboard-navigation disabled
 * source (see `ListRootProps["isItemDisabled"]`), derived from the row *elements*
 * (not the live DOM) so it works for windowed rows that aren't mounted. Safe
 * over an arbitrary node: non-elements and rows without the prop read as enabled.
 */
function isItemChildDisabled(node: ReactNode): boolean {
	if (!isValidElement<{ disabled?: boolean }>(node)) {
		return false;
	}
	return node.props.disabled === true;
}

/**
 * First index at or after `start`, stepping by `step` (+1 down, -1 up), whose
 * row is enabled; `-1` when no enabled row remains in that direction. The
 * shared skip-disabled walk behind both keyboard-navigation flavors.
 */
function findEnabledIndex({
	start,
	step,
	count,
	isItemDisabled,
}: {
	start: number;
	step: number;
	count: number;
	isItemDisabled: (index: number) => boolean;
}): number {
	for (let index = start; index >= 0 && index < count; index += step) {
		if (!isItemDisabled(index)) {
			return index;
		}
	}
	return -1;
}

/**
 * The keyboard-focusable control inside a composed row — where list-semantics
 * arrow navigation moves focus (a `List.Item`'s button or link).
 * Excludes disabled buttons and anything pulled out of the tab order with
 * `tabIndex={-1}` (e.g. a disabled `asChild` link).
 */
const ITEM_CONTROL_SELECTOR =
	'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/**
 * The focusable control of a mounted row element, or `null` when the row hosts
 * none (a static row is simply not a keyboard-navigation stop). An `asChild`
 * row may *be* the control (e.g. `<Item asChild><a href…>`), so the row
 * itself is checked before its descendants.
 */
function findItemControl(item: Element): HTMLElement | null {
	const control = item.matches(ITEM_CONTROL_SELECTOR)
		? item
		: item.querySelector(ITEM_CONTROL_SELECTOR);
	return control instanceof HTMLElement ? control : null;
}

/**
 * Resolve the composed row an event landed on: the closest `[data-index]`
 * element and its parsed index. `null` when the target isn't inside a row or
 * the stamped index isn't a valid non-negative integer. The shared first step
 * of every handler that maps a DOM event back to a row.
 */
function itemFromEventTarget(target: EventTarget | null): { item: Element; index: number } | null {
	const item = target instanceof Element ? target.closest("[data-index]") : null;
	if (item == null) {
		return null;
	}
	const index = Number(item.getAttribute("data-index"));
	if (!Number.isInteger(index) || index < 0) {
		return null;
	}
	return { item, index };
}

/**
 * Selector for the interactive elements inside a row that handle their own
 * click — a checkbox, a `<label>`, nested links/buttons. A bare row click that
 * lands inside one of these is left alone so grid activation never fires twice.
 */
const INTERACTIVE_ITEM_TARGET_SELECTOR =
	'a[href], button, input, select, textarea, label, [role="button"], [role="link"], [role="menuitem"], [contenteditable="true"]';

/**
 * Whether a row click originated on an element (within `row`) that already
 * handles the click — a checkbox, a label, or nested interactive content — so
 * the grid's click-to-activate should defer to it. Pure over the DOM; testable
 * in isolation.
 *
 * @example
 * ```ts
 * // click on the row's checkbox → true (activation must not fire twice)
 * isInteractiveItemTarget(checkboxEl, rowEl); // → true
 * // click on the row's description text → false (the row activates)
 * isInteractiveItemTarget(descriptionEl, rowEl); // → false
 * ```
 */
function isInteractiveItemTarget(target: EventTarget | null, item: Element): boolean {
	if (!(target instanceof Element)) {
		return false;
	}
	const interactive = target.closest(INTERACTIVE_ITEM_TARGET_SELECTOR);
	return interactive != null && item.contains(interactive);
}

/**
 * Collection-element props for `"list"` semantics arrow-key navigation:
 * `ArrowUp` / `ArrowDown` / `Home` / `End` pressed on a row's focused control
 * move **real focus** to the next enabled row's control (native tab order is
 * otherwise untouched, so this augments — never replaces — Tab). Handled keys
 * are always claimed so they step rows instead of scrolling the viewport, and
 * there is no wrap: arrowing past the last enabled row holds. A plain props
 * builder (no state), only built under `"list"` semantics — `"grid"` has its
 * own single-tab-stop `aria-activedescendant` model.
 */
function listFocusNavigationProps({
	count,
	isItemDisabled,
	focusItemAt,
}: {
	count: number;
	/** Whether the row at an index is disabled — skipped by arrow navigation. */
	isItemDisabled: (index: number) => boolean;
	/** Move focus to the control of the row at `index`, revealing (and, windowed, mounting) it. */
	focusItemAt: (index: number) => void;
}): Pick<ComponentProps<"div">, "onKeyDown"> {
	return {
		onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
			// Never steal keys from a text-editing control a row might host —
			// arrows move its caret and Home/End jump within its value.
			if (
				event.target instanceof HTMLElement &&
				(event.target.isContentEditable ||
					event.target.tagName === "INPUT" ||
					event.target.tagName === "TEXTAREA" ||
					event.target.tagName === "SELECT")
			) {
				return;
			}
			const source = itemFromEventTarget(event.target);
			if (source == null) {
				return;
			}
			let targetIndex = -1;
			switch (event.key) {
				case "ArrowDown":
					targetIndex = findEnabledIndex({
						start: source.index + 1,
						step: 1,
						count,
						isItemDisabled,
					});
					break;
				case "ArrowUp":
					targetIndex = findEnabledIndex({
						start: source.index - 1,
						step: -1,
						count,
						isItemDisabled,
					});
					break;
				case "Home":
					targetIndex = findEnabledIndex({ start: 0, step: 1, count, isItemDisabled });
					break;
				case "End":
					targetIndex = findEnabledIndex({ start: count - 1, step: -1, count, isItemDisabled });
					break;
				default:
					return;
			}
			event.preventDefault();
			if (targetIndex >= 0 && targetIndex !== source.index) {
				focusItemAt(targetIndex);
			}
		},
	};
}

/**
 * Build the collection element's ARIA + keyboard props for grid navigation, and
 * track the active row index. Under `"list"` semantics (disabled) it returns an
 * inert `-1` and no collection props, so a plain list keeps its native tab order.
 *
 * `Space` / `Enter` — and a bare click on a row, deferring to interactive
 * descendants that handle their own click — fire {@link onActivate}; arrows /
 * `Home` / `End` move the active index across the **full** `count` (not just
 * the mounted window), **skipping rows flagged by {@link isItemDisabled}** so
 * keyboard navigation only lands on actionable rows (matching the `MultiSelect`
 * popover), and `scrollToIndex` reveals + mounts the target. Scrolling happens
 * **only** on keyboard navigation — focus (from a Tab or a row click) just makes
 * the focused row active without moving the viewport, so clicking a row never
 * yanks the scroll. Because keyboard navigation keeps focus on the collection
 * (never on a row), it survives virtualization.
 *
 * Keys are handled only while the collection itself has focus: when a tabbable
 * in-row control (a link, an overflow-menu button) holds focus, its keys belong
 * to it — Enter must activate the control, not toggle the row. A press anywhere
 * on a row makes that row active *before* focus reaches the collection, so the
 * active row always tracks what the user last pointed at.
 */
function useGridNavigation({
	count,
	enabled,
	isItemDisabled,
	onActivate,
	itemId,
	scrollToIndex,
}: {
	count: number;
	enabled: boolean;
	/** Whether the row at an index is disabled — skipped by keyboard navigation. */
	isItemDisabled?: (index: number) => boolean;
	onActivate?: (index: number) => void;
	itemId: (index: number) => string;
	scrollToIndex: (index: number) => void;
}): {
	activeIndex: number;
	collectionProps: Pick<
		ComponentProps<"div">,
		"tabIndex" | "aria-activedescendant" | "onKeyDown" | "onFocus" | "onMouseDown" | "onClick"
	>;
} {
	const [activeIndex, setActiveIndex] = useState(-1);

	// Keep the active index in range as the collection shrinks (e.g. filtering).
	const clampedActiveIndex = activeIndex >= count ? count - 1 : activeIndex;

	if (!enabled) {
		return { activeIndex: -1, collectionProps: {} };
	}

	const isDisabled = (index: number) => isItemDisabled?.(index) ?? false;

	const enabledIndexFrom = (start: number, step: number): number =>
		findEnabledIndex({ start, step, count, isItemDisabled: isDisabled });

	// Make an enabled row active and scroll it into view; ignore `-1` (no target,
	// e.g. arrowing past the last enabled row) so the active row simply holds.
	const activate = (index: number) => {
		if (index < 0) {
			return;
		}
		setActiveIndex(index);
		// Only keyboard navigation scrolls — reveal + mount the newly active row.
		scrollToIndex(index);
	};

	return {
		activeIndex: clampedActiveIndex,
		collectionProps: {
			tabIndex: 0,
			"aria-activedescendant": clampedActiveIndex >= 0 ? itemId(clampedActiveIndex) : undefined,
			onMouseDown: (event: MouseEvent<HTMLDivElement>) => {
				// A press on row content makes that row active *before* focus lands on
				// the collection, so the Tab-in branch of onFocus below (which would
				// otherwise default to the first enabled row) keeps it. Without this, a
				// click on non-focusable content (e.g. a row's description) focuses the
				// collection directly and the active row desyncs from the clicked row —
				// the next Space would toggle the wrong row.
				const pressed = itemFromEventTarget(event.target);
				if (pressed != null && !isDisabled(pressed.index)) {
					setActiveIndex(pressed.index);
				}
			},
			onClick: (event: MouseEvent<HTMLDivElement>) => {
				// A bare click anywhere on a row activates it, matching Space/Enter —
				// but defer to anything that already handles its own click (a checkbox,
				// a label, nested links/buttons) so activation never fires twice, and
				// to a consumer handler earlier in the bubble that preventDefault-ed
				// to opt out.
				if (event.defaultPrevented) {
					return;
				}
				const clicked = itemFromEventTarget(event.target);
				if (
					clicked == null ||
					isDisabled(clicked.index) ||
					isInteractiveItemTarget(event.target, clicked.item)
				) {
					return;
				}
				// Clicks that arrive without a mousedown (assistive tech dispatches
				// them directly) still land on the row they activated.
				setActiveIndex(clicked.index);
				onActivate?.(clicked.index);
			},
			onFocus: (event: FocusEvent<HTMLDivElement>) => {
				// Focus entered the grid. The collection is the single tab stop, so the
				// active row is shown by its tint / `aria-activedescendant` — never a
				// real focus ring on a control. If focus landed on a descendant (e.g. a
				// clicked checkbox), make its row active and pull focus back to the
				// collection so a later arrow press doesn't light up that control with
				// `:focus-visible`. Never scroll here — only keyboard navigation moves
				// the viewport, so a click can't reset scroll.
				if (event.target !== event.currentTarget) {
					const focused = itemFromEventTarget(event.target);
					if (focused != null && !isDisabled(focused.index)) {
						setActiveIndex(focused.index);
					}
					// Pull focus back to the collection only when the focused descendant
					// isn't itself a tab stop — e.g. the row's own `tabIndex={-1}` control
					// that took focus from a click — so a later arrow press doesn't ring it
					// with `:focus-visible`. A genuinely tabbable control the row hosts (a
					// link, an overflow-menu button) keeps its focus so keyboard users can
					// reach and operate it instead of being bounced straight back to the
					// collection (which would otherwise trap forward-Tab inside the grid).
					if (!(event.target instanceof HTMLElement && event.target.tabIndex >= 0)) {
						event.currentTarget.focus({ preventScroll: true });
					}
					return;
				}
				// Focus is on the collection itself (a Tab-in): default to the first
				// enabled row. The functional update keeps the re-entrant focus() above
				// from clobbering a just-set active index.
				if (count > 0) {
					setActiveIndex((previous) => (previous < 0 ? enabledIndexFrom(0, 1) : previous));
				}
			},
			onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
				// Keys from a focused tabbable in-row control (a link, an overflow-menu
				// button) belong to that control: bail so Enter/Space activate it instead
				// of being preventDefault-ed into a row toggle. Grid navigation only ever
				// drives keys while the collection itself holds focus.
				if (event.target !== event.currentTarget) {
					return;
				}
				switch (event.key) {
					case "ArrowDown":
						event.preventDefault();
						activate(enabledIndexFrom(clampedActiveIndex < 0 ? 0 : clampedActiveIndex + 1, 1));
						break;
					case "ArrowUp":
						event.preventDefault();
						activate(
							clampedActiveIndex < 0
								? enabledIndexFrom(0, 1)
								: enabledIndexFrom(clampedActiveIndex - 1, -1),
						);
						break;
					case "Home":
						event.preventDefault();
						activate(enabledIndexFrom(0, 1));
						break;
					case "End":
						event.preventDefault();
						activate(enabledIndexFrom(count - 1, -1));
						break;
					case " ":
					case "Enter":
						// Arrow nav never lands on a disabled row, but guard anyway so a
						// disabled active row (e.g. after filtering) can't be activated.
						if (clampedActiveIndex >= 0 && !isDisabled(clampedActiveIndex)) {
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
 * The state + wiring shared by {@link Root} and `VirtualRoot`: the collection
 * contexts, the resolved row-id function, and the semantics-appropriate
 * keyboard-navigation props for the collection element. The flavor-specific
 * pieces — how to reveal a row and how to move real focus to a (possibly
 * unmounted) row — come in as callbacks, so shell-level fixes land in one place.
 */
function useListShell({
	count,
	focusItemAt,
	isItemDisabled,
	onActivate,
	itemId,
	scrollToIndex,
	semantics,
}: {
	count: number;
	/** Move focus to the control of the row at `index`, revealing (and, windowed, mounting) it. */
	focusItemAt: (index: number) => void;
	/** Whether the row at an index is disabled — skipped by keyboard navigation. */
	isItemDisabled: (index: number) => boolean;
	onActivate: ((index: number) => void) | undefined;
	itemId: ((index: number) => string) | undefined;
	/** Reveal the row at `index` (and, windowed, mount it). */
	scrollToIndex: (index: number) => void;
	semantics: ListSemantics;
}): {
	/** The active grid row's index (`-1` under `"list"` semantics or before navigation). */
	activeIndex: number;
	/** The semantics-appropriate ARIA + keyboard props for the collection element. */
	collectionProps: Pick<
		ComponentProps<"div">,
		"tabIndex" | "aria-activedescendant" | "onKeyDown" | "onFocus" | "onMouseDown" | "onClick"
	>;
	gridNav: GridNavContextValue;
	listContext: ListContextValue;
} {
	const baseId = useId();
	const listContext = useMemo<ListContextValue>(() => ({ semantics }), [semantics]);
	const resolveItemId = useMemo(
		() => itemId ?? ((index: number) => `${baseId}-item-${index}`),
		[itemId, baseId],
	);
	const { activeIndex, collectionProps: gridNavProps } = useGridNavigation({
		count,
		enabled: semantics === "grid",
		isItemDisabled,
		onActivate,
		itemId: resolveItemId,
		scrollToIndex,
	});
	const gridNav = useMemo<GridNavContextValue>(
		() => ({ activeIndex, stampItemId: itemId == null ? resolveItemId : null }),
		[activeIndex, resolveItemId, itemId],
	);
	const collectionProps =
		semantics === "list"
			? listFocusNavigationProps({ count, isItemDisabled, focusItemAt })
			: gridNavProps;

	return { activeIndex, collectionProps, gridNav, listContext };
}

/**
 * The markup shared by {@link Root} and `VirtualRoot`: the context providers
 * around the scroll viewport and the named collection element. Flavor-specific
 * collection attributes (the windowed shell's sizing style, `aria-rowcount`,
 * and its mount-guarded `aria-activedescendant`) arrive merged into
 * `collectionProps`.
 */
function ListShell({
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledby,
	"aria-multiselectable": ariaMultiselectable,
	children,
	className,
	collectionProps,
	gridNav,
	listContext,
	viewportProps,
	viewportRef,
}: {
	"aria-label": string | undefined;
	"aria-labelledby": string | undefined;
	"aria-multiselectable": ComponentProps<"div">["aria-multiselectable"];
	children: ReactNode;
	className: string | undefined;
	collectionProps: ComponentProps<"div">;
	gridNav: GridNavContextValue;
	listContext: ListContextValue;
	viewportProps: ComponentProps<"div">;
	/** A plain prop (not `ref`) so the internal shell stays React 18-compatible without forwardRef ceremony. */
	viewportRef: Ref<HTMLDivElement>;
}) {
	return (
		<ListContext.Provider value={listContext}>
			<GridNavContext.Provider value={gridNav}>
				<div
					ref={viewportRef}
					data-slot="list"
					className={cx(listViewportClassName, className)}
					{...viewportProps}
				>
					<div
						data-slot="list-collection"
						role={listContext.semantics === "grid" ? "grid" : "list"}
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledby}
						aria-multiselectable={ariaMultiselectable}
						className={listCollectionClassName}
						{...collectionProps}
					>
						{children}
					</div>
				</div>
			</GridNavContext.Provider>
		</ListContext.Provider>
	);
}
ListShell.displayName = "ListPrimitiveShell";

/**
 * Props for a {@link Item}. Standard `<div>` props (minus `role`, owned by the
 * collection semantics) plus its selection/disabled state. Compose one per item
 * and give it a React `key`; `Root` / `VirtualRoot` inject its index, grid id,
 * and (when windowed) placement.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <Root semantics="list" aria-label="Accounts" className="max-h-80">
 *   <Item selected>
 *     <button type="button">Acme Inc</button>
 *   </Item>
 * </Root>
 * ```
 */
type ListItemProps = Omit<ComponentProps<"div">, "role"> &
	WithAsChild & {
		/** Whether the row is selected — tints the pill and, in a grid, sets `aria-selected`. */
		selected?: boolean;
		/** Whether the row is disabled — suppresses the hover tint; grid keyboard navigation skips it and it carries `aria-disabled`. */
		disabled?: boolean;
	};

/**
 * A single composed row — a `<div role="listitem">` (list) or `<div role="row">`
 * with `aria-selected` / `aria-disabled` (grid), taking its semantics from the
 * enclosing `Root` / `VirtualRoot`. Owns the pill chrome and the
 * selected/disabled data attributes; in a grid it also carries the
 * `aria-activedescendant` id and active-row tint, and — when windowed — the
 * absolute placement, measure ref, and `aria-posinset` / `aria-setsize`
 * (list) or `aria-rowindex` (grid). Authoring the same `<Item>` works
 * virtualized or not, and even when a consumer's item component wraps it.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * // grid row (selectable): children are role="gridcell"s
 * <Item selected={isChecked}>
 *   <div role="gridcell"><Checkbox checked={isChecked} tabIndex={-1} /></div>
 *   <div role="gridcell">{label}</div>
 * </Item>
 * ```
 */
const Item = forwardRef<ComponentRef<"div">, ListItemProps>(
	({ asChild, children, className, disabled = false, selected = false, style, ...props }, ref) => {
		const { semantics } = useListContext("Item");
		const itemContext = useContext(ListItemContext);
		const gridNav = useContext(GridNavContext);
		const isGrid = semantics === "grid";
		const Comp = asChild ? Slot : "div";
		const placement = itemContext?.placement ?? null;
		const index = itemContext?.index;
		const isActive = isGrid && gridNav != null && index != null && gridNav.activeIndex === index;
		const measureRef = placement?.measureRef ?? null;
		// Identity-stable composition so a keyboard-nav re-render doesn't cycle the
		// virtualizer's measureElement (detaching + reattaching it per render).
		const composedRef = useComposedRefs(ref, measureRef);

		return (
			<Comp
				ref={composedRef}
				// Before the spread so a wrapping component can brand its rows (e.g.
				// SelectableItem passes "selectable-list-item"); `data-index` and the
				// role/ARIA wiring below stay enforced.
				data-slot="list-item"
				{...props}
				// Stamp the grid's default aria-activedescendant target id; when the
				// collection doesn't own row ids (a consumer `itemId` override), keep the
				// row's own `id` prop instead.
				id={
					isGrid && index != null && gridNav?.stampItemId != null
						? gridNav.stampItemId(index)
						: props.id
				}
				data-index={index}
				data-state={selected ? "selected" : "unselected"}
				data-disabled={disabled || undefined}
				data-active={isActive || undefined}
				role={isGrid ? "row" : "listitem"}
				aria-selected={isGrid ? selected : undefined}
				aria-disabled={isGrid && disabled ? true : props["aria-disabled"]}
				// Windowed placement: listitems take aria-posinset/aria-setsize; grid
				// rows take aria-rowindex (posinset/setsize are invalid on grid rows per
				// WAI-ARIA 1.2 — the collection carries aria-rowcount instead).
				aria-rowindex={isGrid ? placement?.posInSet : undefined}
				aria-posinset={isGrid ? undefined : placement?.posInSet}
				aria-setsize={isGrid ? undefined : placement?.setSize}
				className={cx(
					listItemClassName,
					!disabled &&
						"hover:bg-active-menu-item hover:data-[state=selected]:bg-active-selected-menu-item",
					// List rows convey keyboard focus with the same tint as hover (matching
					// the grid's active row) rather than a focus ring on the inner control —
					// the control suppresses its own outline and the row lights up instead.
					!isGrid &&
						!disabled &&
						"has-[:focus-visible]:bg-active-menu-item has-[:focus-visible]:data-[state=selected]:bg-active-selected-menu-item",
					className,
				)}
				style={placement ? { ...style, ...placement.style } : style}
			>
				{children}
			</Comp>
		);
	},
);
Item.displayName = "ListPrimitiveItem";

/**
 * Provides one non-virtualized row its index through {@link ListItemContext}
 * (with no placement — plain rows sit in normal flow). Extracted so the provider
 * value is a `useMemo` result rather than reconstructed inline; a `Children.map`
 * body can't call hooks itself.
 */
function PlainItem({ children, index }: { children: ReactNode; index: number }) {
	const value = useMemo<ListItemContextValue>(() => ({ index, placement: null }), [index]);

	return <ListItemContext.Provider value={value}>{children}</ListItemContext.Provider>;
}
PlainItem.displayName = "ListPrimitivePlainItem";

/**
 * The non-virtualized list shell: renders its composed {@link Item} children in
 * normal flow inside the scroll-viewport chrome, with the `role="list"` /
 * `role="grid"` semantics (and, for a grid, `aria-activedescendant` keyboard
 * navigation). The default out-of-the-box renderer — reach for the sibling
 * `VirtualRoot` in `./virtual.js` only when a collection needs windowing.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <Root semantics="list" aria-label="Accounts" className="max-h-80">
 *   {accounts.map((account) => (
 *     <Item key={account.id} selected={account.id === currentId}>
 *       <button className="w-full px-2 py-1.5 text-left">{account.name}</button>
 *     </Item>
 *   ))}
 * </Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"div">, ListRootProps>(
	(
		{
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledby,
			"aria-multiselectable": ariaMultiselectable,
			children,
			className,
			isItemDisabled,
			onActivate,
			itemId,
			semantics = "list",
			...props
		},
		ref,
	) => {
		const viewportRef = useRef<HTMLDivElement>(null);
		const composedViewportRef = useComposedRefs(viewportRef, ref);
		// The row elements, in order — the single array we both render from and read
		// each row's `disabled` prop off (the `isItemDisabled` default), so the
		// disabled lookup by index always lines up with what's rendered. Filtered to
		// elements (as `VirtualRoot` does) so a non-element child — a bare string, or
		// a render-prop that returned `null` for an option — can't be counted/indexed
		// as a navigable row here while the windowed shell drops it, which would
		// desync grid navigation between the two. Memoized so a keyboard-nav
		// re-render (which only changes `activeIndex`) doesn't re-walk the children.
		const itemChildren = useMemo(
			() => Children.toArray(children).filter(isValidElement),
			[children],
		);
		const scrollToIndex = useCallback((index: number) => {
			// Reveal the whole row (every Item stamps `data-index`, so this holds for
			// default and custom `itemId` alike) — scrolling just its control could
			// leave the row's edges clipped against the viewport.
			viewportRef.current
				?.querySelector(`[data-index="${index}"]`)
				?.scrollIntoView({ block: "nearest" });
		}, []);
		const focusItemAt = useCallback((index: number) => {
			const item = viewportRef.current?.querySelector(`[data-index="${index}"]`);
			if (item == null) {
				return;
			}
			findItemControl(item)?.focus({ preventScroll: true });
			// Reveal the whole row, not just its control (mirrors the grid's scroll fix).
			item.scrollIntoView({ block: "nearest" });
		}, []);
		const { collectionProps, gridNav, listContext } = useListShell({
			count: itemChildren.length,
			focusItemAt,
			isItemDisabled: isItemDisabled ?? ((index) => isItemChildDisabled(itemChildren[index])),
			onActivate,
			itemId,
			scrollToIndex,
			semantics,
		});

		return (
			<ListShell
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				aria-multiselectable={ariaMultiselectable}
				className={className}
				collectionProps={collectionProps}
				gridNav={gridNav}
				listContext={listContext}
				viewportProps={props}
				viewportRef={composedViewportRef}
			>
				{itemChildren.map((item, index) => (
					// Key off the child's own key (assigned by `Children.toArray`) so
					// reconciliation follows the consumer's keys across reorder/filter.
					<PlainItem key={item.key ?? index} index={index}>
						{item}
					</PlainItem>
				))}
			</ListShell>
		);
	},
);
Root.displayName = "ListPrimitiveRoot";

export {
	//,
	findItemControl,
	isInteractiveItemTarget,
	isItemChildDisabled,
	Item,
	ListItemContext,
	ListShell,
	Root,
	useListShell,
};

export type {
	//,
	ListRootProps,
	ListItemContextValue,
	ListItemPlacement,
	ListItemProps,
	ListSemantics,
};
