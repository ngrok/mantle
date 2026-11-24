"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "./use-controllable-state.js";

type Orientation = "horizontal" | "vertical";
type ActivationMode = "automatic" | "manual";

type UseTabsProps = {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** @default "horizontal" */
	orientation?: Orientation;
	/**
	 * `automatic` activates a tab when it gets focus. `manual` activates it on
	 * Enter, Space, or a press.
	 * @default "automatic"
	 */
	activationMode?: ActivationMode;
};

/**
 * The state of one tab set, which its parts read from context.
 */
type TabsBehavior = {
	baseId: string;
	value: string | undefined;
	/** Reads the committed value, so a callback that outlives its render reads the current one. */
	currentValue: () => string | undefined;
	select: (value: string) => void;
	/**
	 * The value of the tab that is the Tab stop: the last focused tab, else the
	 * selected one. A selection change after focus leaves the list makes the
	 * last focused tab stale.
	 */
	stop: string | undefined;
	focusTab: (value: string) => void;
	leaveList: () => void;
	orientation: Orientation;
	activationMode: ActivationMode;
};

/**
 * Owns the WAI-ARIA tabs pattern: one selected value, the roving Tab stop,
 * the ids that join each tab to its panel, and the activation mode. Call it in
 * the root part; spread `getTabListProps`, `getTabProps`, and
 * `getTabPanelProps` on the parts.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * @example
 * ```tsx
 * const tabs = useTabs({ defaultValue: "account" });
 * return <TabsContext value={tabs}>{children}</TabsContext>;
 * ```
 */
const useTabs = ({
	value: valueProp,
	defaultValue,
	onValueChange,
	orientation = "horizontal",
	activationMode = "automatic",
}: UseTabsProps): TabsBehavior => {
	const [value, setValue] = useControllableState({
		value: valueProp,
		defaultValue,
		onChange: (next: string | undefined) => {
			if (next != null) {
				onValueChange?.(next);
			}
		},
	});
	// Why `under` and `inside`: the focused tab stays the Tab stop while focus is
	// in the list. After focus leaves, a selection made outside the list, such as
	// a controlled change, is where focus comes back.
	const [focused, setFocused] = useState<{
		value: string;
		under: string | undefined;
		inside: boolean;
	} | null>(null);
	const valueRef = useRef(value);
	useLayoutEffect(() => {
		valueRef.current = value;
	});
	return {
		baseId: useId(),
		value,
		currentValue: () => valueRef.current,
		select: setValue,
		stop: focused != null && (focused.inside || focused.under === value) ? focused.value : value,
		focusTab: (next) => {
			setFocused({ value: next, under: value, inside: true });
		},
		leaveList: () => {
			setFocused((current) => current && { ...current, inside: false });
		},
		orientation,
		activationMode,
	};
};

const tabId = (tabs: TabsBehavior, value: string) => `${tabs.baseId}-trigger-${value}`;
const panelId = (tabs: TabsBehavior, value: string) => `${tabs.baseId}-content-${value}`;

/** The enabled tabs of a list, in DOM order. The DOM is the collection. */
const enabledTabs = (list: Element | null): HTMLElement[] =>
	list == null ? [] : Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)'));

/**
 * Focuses the first element of `order` that takes focus, such as one without
 * `display: none`. It stops once the candidate has focus or focus leaves
 * `from`, also when a consumer's focus handler sent it somewhere else.
 */
const focusFirst = (from: HTMLElement, order: HTMLElement[]) => {
	for (const candidate of order) {
		candidate.focus();
		const active = from.ownerDocument.activeElement;
		if (active === candidate || active !== from) {
			return;
		}
	}
};

/** The lists that a Shift+Tab took out of the Tab order until focus leaves them. */
const exitingLists = new WeakSet<HTMLElement>();

/**
 * Makes the list the entry point for a Tab forward: the list
 * precedes its tabs in the Tab order, and its focus moves to the first tab that
 * takes focus. The server HTML leaves it out, so the selected tab is the Tab
 * stop before hydration. A Shift+Tab from a tab takes the list out of the Tab
 * order until focus leaves, so focus does not come back to the tab.
 *
 * Each enabled tab attaches this ref, so a tab that mounts late or becomes
 * enabled makes its list the entry point too. A list with no enabled tab
 * stays out of the Tab order. Why the check: a consumer's `tabIndex`, and the
 * `-1` of a Shift+Tab, must survive.
 */
const joinList = (tab: HTMLElement | null) => {
	const list = tab?.closest<HTMLElement>('[role="tablist"]');
	if (list != null && !list.hasAttribute("tabindex")) {
		list.tabIndex = 0;
	}
};

/**
 * Keeps a press on the list's blank space from focusing the list, so a click
 * there activates no tab.
 */
const pressList = (event: MouseEvent<HTMLElement>) => {
	if (event.target === event.currentTarget) {
		event.preventDefault();
	}
};

const enterList = (event: FocusEvent<HTMLElement>) => {
	const list = event.currentTarget;
	if (event.target !== list) {
		return;
	}
	// Why this order: the APG enters on the selected tab, then the last focused
	// tab. A tab that cannot take focus, such as one hidden by CSS, is skipped.
	const tabs = enabledTabs(list);
	focusFirst(list, [
		...tabs.filter((tab) => tab.getAttribute("aria-selected") === "true"),
		...tabs.filter((tab) => tab.tabIndex === 0),
		...tabs,
	]);
};

/**
 * Wires the tab list: `role="tablist"`, its orientation, and the entry point
 * for a Tab forward. The arrow keys live on each tab, so a tab's own key handler can veto
 * them with `preventDefault()`.
 *
 * @example
 * ```tsx
 * <div {...getTabListProps(tabs)} />
 * ```
 */
const getTabListProps = (tabs: TabsBehavior) => ({
	role: "tablist",
	"aria-orientation": tabs.orientation,
	onFocus: enterList,
	onMouseDown: pressList,
});

/** The keys that move focus, and where each one moves it. */
const focusKeys: Record<string, "previous" | "next" | "first" | "last"> = {
	ArrowLeft: "previous",
	ArrowUp: "previous",
	ArrowRight: "next",
	ArrowDown: "next",
	Home: "first",
	PageUp: "first",
	End: "last",
	PageDown: "last",
};

/** The arrow keys that swap meaning in a right-to-left list. */
const rtlKeys: Record<string, string> = { ArrowLeft: "ArrowRight", ArrowRight: "ArrowLeft" };

/**
 * Moves focus from `tab` for an arrow, Home, or End key. Returns `false` for
 * any other key. A tab that cannot take focus, such as one with
 * `display: none`, is skipped.
 */
const moveFocus = (
	tabs: TabsBehavior,
	{ tab, eventKey, loop }: { tab: HTMLElement; eventKey: string; loop: boolean },
): boolean => {
	const list = tab.closest('[role="tablist"]');
	// Why the swap: in a right-to-left horizontal list, the previous tab is on the right.
	// The style read runs only for a left or right arrow.
	const swapped = rtlKeys[eventKey];
	const key =
		swapped != null && list != null && getComputedStyle(list).direction === "rtl"
			? swapped
			: eventKey;
	const ignored = tabs.orientation === "horizontal" ? /^Arrow(Up|Down)$/ : /^Arrow(Left|Right)$/;
	const intent = focusKeys[key];
	if (intent == null || ignored.test(key)) {
		return false;
	}
	const enabled = enabledTabs(list);
	const index = enabled.indexOf(tab);
	let order: HTMLElement[];
	if (intent === "first") {
		order = enabled;
	} else if (intent === "last") {
		order = enabled.toReversed();
	} else if (intent === "next") {
		order = [...enabled.slice(index + 1), ...(loop ? enabled.slice(0, index) : [])];
	} else {
		order = [
			...enabled.slice(0, Math.max(index, 0)).toReversed(),
			...(loop ? enabled.slice(index + 1).toReversed() : []),
		];
	}
	// Why select before focus: NVDA reads a tab when it takes focus, and again
	// when its selection changes. A tab that is already selected is read once.
	const target =
		tabs.activationMode === "automatic"
			? order.find(
					(candidate) =>
						typeof candidate.checkVisibility !== "function" ||
						candidate.checkVisibility({ visibilityProperty: true }),
				)
			: null;
	const prefix = `${tabs.baseId}-trigger-`;
	if (target == null || !target.id.startsWith(prefix)) {
		focusFirst(tab, order);
		return true;
	}
	flushSync(() => {
		tabs.select(target.id.slice(prefix.length));
	});
	// Why: the tab's focus must not select it a second time.
	const outer = pressedTab;
	pressedTab = target;
	try {
		focusFirst(tab, order);
	} finally {
		pressedTab = outer;
	}
	return true;
};

/** The tab that a press is focusing, so its focus does not select it a second time. */
let pressedTab: HTMLElement | null = null;

/** Focuses a tab without the focus ring, then selects it once. */
const pressTab = (tabs: TabsBehavior, tab: HTMLElement, value: string) => {
	// Why restore and not clear: a consumer's focus handler can press another
	// tab, and that nested press must not clear this one.
	const outer = pressedTab;
	pressedTab = tab;
	try {
		tab.focus({ focusVisible: false });
	} finally {
		pressedTab = outer;
	}
	tabs.select(value);
};

/**
 * Wires one tab: `role="tab"`, `aria-selected`, `aria-controls`, the roving
 * `tabIndex`, the arrow keys, and activation. The last focused tab is the Tab
 * stop, else the selected tab, so the server HTML has the selected tab in the
 * Tab order. A Tab forward into the list enters on the selected tab. A press focuses the tab without the focus ring. A link tab waits
 * for its click, so a press released off the link switches no tab and starts
 * no drag.
 *
 * @example
 * ```tsx
 * <button {...getTabProps(tabs, { value: "account" })} />
 * ```
 */
const getTabProps = (
	tabs: TabsBehavior,
	{ value, disabled = false, loop = true }: { value: string; disabled?: boolean; loop?: boolean },
) => {
	const selected = tabs.value === value;
	return {
		role: "tab",
		id: tabId(tabs, value),
		"aria-selected": selected,
		"aria-controls": panelId(tabs, value),
		tabIndex: tabs.stop === value ? 0 : -1,
		disabled,
		// Why `undefined` when disabled: React attaches the ref again when the tab becomes enabled.
		ref: disabled ? undefined : joinList,
		onMouseDown: (event: MouseEvent<HTMLElement>) => {
			const tab = event.currentTarget;
			// Why: a link follows only a press released on it, so a link tab waits
			// for the click. The cancel also stops the link drag.
			if (disabled || event.button !== 0 || event.ctrlKey || tab.matches("a[href]")) {
				event.preventDefault();
				return;
			}
			pressTab(tabs, tab, value);
		},
		onClick: (event: MouseEvent<HTMLElement>) => {
			const tab = event.currentTarget;
			// Why: a click with a modifier opens the link elsewhere.
			if (
				!disabled &&
				tab.matches("a[href]") &&
				event.button === 0 &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey
			) {
				pressTab(tabs, tab, value);
			}
		},
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
			const tab = event.currentTarget;
			if (event.key === "Tab" && event.shiftKey) {
				const list = tab.closest<HTMLElement>('[role="tablist"]');
				if (list?.getAttribute("tabindex") === "0") {
					list.tabIndex = -1;
					exitingLists.add(list);
				}
				return;
			}
			// Why the target check: a key in a field inside an `asChild` tab is not for the tab.
			if (disabled || event.target !== tab) {
				return;
			}
			if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
				if (moveFocus(tabs, { tab, eventKey: event.key, loop })) {
					event.preventDefault();
					return;
				}
			}
			const link = tab.matches("a[href]");
			// Why not Enter on a link: Enter clicks the link, and the click selects.
			if (event.key === " " || (event.key === "Enter" && !link)) {
				// Why only a link: Space scrolls the page from a link. On a button, the
				// default is the click that a consumer's `onClick` waits for.
				if (link) {
					event.preventDefault();
				}
				tabs.select(value);
			}
		},
		onFocus: (event: FocusEvent<HTMLElement>) => {
			if (disabled) {
				return;
			}
			const tab = event.currentTarget;
			tabs.focusTab(value);
			if (tab !== pressedTab && !selected && tabs.activationMode === "automatic") {
				tabs.select(value);
			}
		},
		onBlur: (event: FocusEvent<HTMLElement>) => {
			const list = event.currentTarget.closest<HTMLElement>('[role="tablist"]');
			const to = event.relatedTarget;
			if (list != null && !(to instanceof Node && list.contains(to))) {
				if (exitingLists.delete(list)) {
					list.tabIndex = 0;
				}
				tabs.leaveList();
			}
		},
	};
};

/**
 * Wires one tab panel: `role="tabpanel"`, its label, and a Tab stop. The
 * panel element always renders, so each tab's `aria-controls` resolves; an
 * inactive panel is `hidden`, and empty unless it is force-mounted. `shown`
 * says whether the panel renders its children: it is selected, force-mounted,
 * or hidden until found.
 *
 * An inactive panel that is hidden until found gets `hidden="until-found"`,
 * and after hydration `aria-hidden`, so it leaves the accessibility tree.
 * Find-in-page and a fragment link make the browser remove `hidden`;
 * `revealRef` then selects the panel's tab. When a controlled root keeps
 * another tab, the panel hides again.
 *
 * @example
 * ```tsx
 * const { shown, panelProps } = getTabPanelProps(tabs, { value: "account" });
 * return <div {...panelProps}>{shown ? children : null}</div>;
 * ```
 */
const getTabPanelProps = (
	tabs: TabsBehavior,
	{
		value,
		forceMount = false,
		hiddenUntilFound = false,
		hydrated = false,
	}: { value: string; forceMount?: boolean; hiddenUntilFound?: boolean; hydrated?: boolean },
) => {
	const selected = tabs.value === value;
	const shown = selected || forceMount || hiddenUntilFound;
	return {
		shown,
		panelProps: {
			role: "tabpanel",
			id: panelId(tabs, value),
			"aria-labelledby": tabId(tabs, value),
			// Why -1: an inactive panel hidden until found is invisible but focusable.
			tabIndex: hiddenUntilFound && !selected ? -1 : 0,
			// Why `hidden` on a force-mounted inactive panel: the panel stays in the
			// DOM and the server HTML, but not on screen.
			hidden: (!selected && !hiddenUntilFound) || undefined,
			// Why: the browser can remove `hidden` before hydration, which
			// `revealRef` handles; React would report it as a mismatch.
			suppressHydrationWarning: hiddenUntilFound || undefined,
			// Why uppercase: React renders `hidden` as a boolean, so `"until-found"`
			// would become `hidden=""`. React passes an unknown name through, and
			// HTML lowercases it. React warns about it in development.
			...(hiddenUntilFound && !selected ? { HIDDEN: "until-found" } : {}),
			// Why: `until-found` hides only the panel's contents, so the browser
			// and test role queries still expose an empty, labeled tabpanel.
			// Why `hydrated`: before hydration, nothing could clear `aria-hidden`
			// from a panel that the browser reveals.
			"aria-hidden": (hiddenUntilFound && hydrated && !selected) || undefined,
		},
		revealRef: hiddenUntilFound
			? (panel: HTMLElement | null) => {
					if (panel == null) {
						return;
					}
					// Why an observer and not `beforematch`: the browser removes `hidden`
					// after `beforematch`, and it can do so before hydration. A change
					// to `hidden` on an inactive panel covers both.
					const reconcile = () => {
						// Why `currentValue`: this ref outlives its render, and `flushSync`
						// below commits the selection before the reread.
						if (tabs.currentValue() === value || panel.hasAttribute("hidden")) {
							return;
						}
						flushSync(() => {
							tabs.select(value);
						});
						if (tabs.currentValue() !== value) {
							panel.setAttribute("hidden", "until-found");
						}
					};
					const observer = new MutationObserver(reconcile);
					observer.observe(panel, { attributeFilter: ["hidden"] });
					// Why a microtask: React does not flush a render from inside a commit.
					queueMicrotask(reconcile);
					return () => {
						observer.disconnect();
					};
				}
			: undefined,
	};
};

export {
	//,
	getTabListProps,
	getTabPanelProps,
	getTabProps,
	useTabs,
};
export type {
	//,
	ActivationMode,
	Orientation,
	TabsBehavior,
};
