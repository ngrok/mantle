"use client";

import { useId } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
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
	orientation: Orientation;
	activationMode: ActivationMode;
};

/**
 * Owns the WAI-ARIA tabs pattern: one selected value, the ids that join each
 * tab to its panel, and the activation mode. Call it in the root part; spread
 * `getTabListProps`, `getTabProps`, and `getTabPanelProps` on the parts.
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
	return { baseId: useId(), value, select: setValue, orientation, activationMode };
};

const tabId = (tabs: TabsBehavior, value: string) => `${tabs.baseId}-trigger-${value}`;
const panelId = (tabs: TabsBehavior, value: string) => `${tabs.baseId}-content-${value}`;

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
 * Wires the tab list: `role="tablist"`, its orientation, and the arrow, Home,
 * and End keys that move focus between the enabled tabs. One key handler
 * serves every tab. The DOM is the collection, so a tab needs no registry.
 *
 * @example
 * ```tsx
 * <div {...getTabListProps(tabs, { loop: true })} />
 * ```
 */
const getTabListProps = (tabs: TabsBehavior, { loop = true }: { loop?: boolean } = {}) => ({
	role: "tablist",
	"aria-orientation": tabs.orientation,
	"data-orientation": tabs.orientation,
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
		const list = event.currentTarget;
		const target = event.target;
		if (
			!(target instanceof HTMLElement) ||
			target.getAttribute("role") !== "tab" ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey
		) {
			return;
		}
		// Why the swap: in a right-to-left horizontal list, the previous tab is on the right.
		// The style read runs only for a left or right arrow.
		const swapped = rtlKeys[event.key];
		const key = swapped != null && getComputedStyle(list).direction === "rtl" ? swapped : event.key;
		const ignored = tabs.orientation === "horizontal" ? /^Arrow(Up|Down)$/ : /^Arrow(Left|Right)$/;
		const intent = focusKeys[key];
		if (intent == null || ignored.test(key)) {
			return;
		}
		event.preventDefault();
		const enabled = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)'));
		const count = enabled.length;
		const step = intent === "next" ? 1 : -1;
		let next = enabled.indexOf(target) + step;
		if (intent === "first") {
			next = 0;
		} else if (intent === "last") {
			next = count - 1;
		} else if (next < 0 || next >= count) {
			next = loop ? (next + count) % count : next - step;
		}
		enabled[next]?.focus();
	},
});

/**
 * Focuses a tab without the focus ring and selects it. In automatic mode the
 * focus selects it, so a second call would fire `onValueChange` twice on a
 * controlled root that has not re-rendered yet.
 */
const pressTab = (tabs: TabsBehavior, tab: HTMLElement, value: string) => {
	const wasFocused = tab.ownerDocument.activeElement === tab;
	tab.focus({ focusVisible: false });
	if (wasFocused || tabs.activationMode === "manual" || tab.ownerDocument.activeElement !== tab) {
		tabs.select(value);
	}
};

/**
 * Wires one tab: `role="tab"`, `aria-selected`, `aria-controls`, the roving
 * `tabIndex`, and activation. Only the selected tab is a Tab stop; when no tab
 * is selected, every tab is one. A press focuses the tab without the focus
 * ring. A link tab waits for its click, so a press released off the link
 * switches no tab and starts no drag.
 *
 * @example
 * ```tsx
 * <button {...getTabProps(tabs, { value: "account", disabled: false })} />
 * ```
 */
const getTabProps = (
	tabs: TabsBehavior,
	{ value, disabled = false }: { value: string; disabled?: boolean },
) => {
	const selected = tabs.value === value;
	return {
		role: "tab",
		id: tabId(tabs, value),
		"aria-selected": selected,
		"aria-controls": panelId(tabs, value),
		tabIndex: selected || tabs.value == null ? 0 : -1,
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
			// Why not Enter on a link: Enter clicks the link, and the click selects.
			if (event.key === " " || (event.key === "Enter" && !event.currentTarget.matches("a[href]"))) {
				tabs.select(value);
			}
		},
		onFocus: () => {
			if (!selected && !disabled && tabs.activationMode === "automatic") {
				tabs.select(value);
			}
		},
	};
};

/**
 * Wires one tab panel: `role="tabpanel"`, its label, and a Tab stop. The
 * panel element always renders, so each tab's `aria-controls` resolves; an
 * inactive panel is empty and `hidden`. `shown` says whether the panel renders
 * its children: it is selected, force-mounted, or hidden until found. A panel
 * that is hidden until found gets `hidden="until-found"`, so find-in-page and
 * fragment links reveal it, and its `beforematch` selects its tab.
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
	const reveal = () => {
		tabs.select(value);
	};
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
		beforeMatchRef: hiddenUntilFound
			? (panel: HTMLElement | null) => {
					if (panel == null) {
						return;
					}
					panel.addEventListener("beforematch", reveal);
					return () => {
						panel.removeEventListener("beforematch", reveal);
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
