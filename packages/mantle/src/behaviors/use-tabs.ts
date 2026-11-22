"use client";

import { useId, useState } from "react";
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
	select: (value: string) => void;
	/** The value of the tab that is the Tab stop: the last focused tab, else the selected one. */
	stop: string | undefined;
	setFocused: (value: string) => void;
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
	const [focused, setFocused] = useState<string | null>(null);
	return {
		baseId: useId(),
		value,
		select: setValue,
		stop: focused ?? value,
		setFocused,
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
 * Makes the list itself a Tab stop only while no enabled tab is one, such as
 * when no tab is selected or the selected tab is disabled. A focus on the list
 * then moves to the selected tab, or to the first enabled one.
 */
const watchTabStop = (list: HTMLElement | null) => {
	if (list == null) {
		return;
	}
	const sync = () => {
		const hasStop = enabledTabs(list).some((tab) => tab.tabIndex === 0);
		// Why the checks: a write to `tabindex` would wake this observer again.
		if (hasStop && list.hasAttribute("tabindex")) {
			list.removeAttribute("tabindex");
		} else if (!hasStop && list.getAttribute("tabindex") !== "0") {
			list.tabIndex = 0;
		}
	};
	const observer = new MutationObserver(sync);
	observer.observe(list, {
		subtree: true,
		childList: true,
		attributeFilter: ["tabindex", "disabled"],
	});
	sync();
	return () => {
		observer.disconnect();
	};
};

const enterList = (event: FocusEvent<HTMLElement>) => {
	if (event.target !== event.currentTarget) {
		return;
	}
	const tabs = enabledTabs(event.currentTarget);
	(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0])?.focus();
};

/**
 * Wires the tab list: `role="tablist"`, its orientation, and the fallback Tab
 * stop. The arrow keys live on each tab, so a tab's own key handler can veto
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
	"data-orientation": tabs.orientation,
	ref: watchTabStop,
	onFocus: enterList,
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
	for (const candidate of order) {
		candidate.focus();
		if (candidate.ownerDocument.activeElement === candidate) {
			break;
		}
	}
	return true;
};

/** The tab that a press is focusing, so its focus does not select it a second time. */
let pressedTab: HTMLElement | null = null;

/** Focuses a tab without the focus ring, then selects it once. */
const pressTab = (tabs: TabsBehavior, tab: HTMLElement, value: string) => {
	pressedTab = tab;
	tab.focus({ focusVisible: false });
	pressedTab = null;
	tabs.select(value);
};

/**
 * Wires one tab: `role="tab"`, `aria-selected`, `aria-controls`, the roving
 * `tabIndex`, the arrow keys, and activation. The last focused tab is the Tab
 * stop, else the selected tab, so the server HTML has the selected tab in the
 * Tab order. A press focuses the tab without the focus ring. A link tab waits
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
		"data-state": selected ? "active" : "inactive",
		"data-disabled": disabled ? "" : undefined,
		"data-orientation": tabs.orientation,
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
			tabs.setFocused(value);
			if (event.currentTarget !== pressedTab && !selected && tabs.activationMode === "automatic") {
				tabs.select(value);
			}
		},
	};
};

/**
 * Wires one tab panel: `role="tabpanel"`, its label, and a Tab stop. The
 * panel element always renders, so each tab's `aria-controls` resolves; an
 * inactive panel is empty and `hidden`. `shown` says whether the panel renders
 * its children: it is selected, force-mounted, or hidden until found.
 *
 * A panel that is hidden until found gets `hidden="until-found"`.
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
	}: { value: string; forceMount?: boolean; hiddenUntilFound?: boolean },
) => {
	const selected = tabs.value === value;
	const shown = selected || forceMount || hiddenUntilFound;
	return {
		shown,
		panelProps: {
			role: "tabpanel",
			id: panelId(tabs, value),
			"aria-labelledby": tabId(tabs, value),
			tabIndex: 0,
			"data-state": selected ? "active" : "inactive",
			"data-orientation": tabs.orientation,
			hidden: !shown || undefined,
			// Why uppercase: React renders `hidden` as a boolean, so `"until-found"`
			// would become `hidden=""`. React passes an unknown name through, and
			// HTML lowercases it. React warns about it in development.
			...(hiddenUntilFound && !selected ? { HIDDEN: "until-found" } : {}),
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
						if (panel.dataset.state !== "inactive" || panel.hasAttribute("hidden")) {
							return;
						}
						flushSync(() => {
							tabs.select(value);
						});
						if (panel.dataset.state === "inactive") {
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
