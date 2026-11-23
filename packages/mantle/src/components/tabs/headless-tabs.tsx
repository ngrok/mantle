"use client";

import type { ComponentProps, FocusEvent, ReactNode } from "react";
import { Children, createContext, isValidElement, useContext } from "react";
import invariant from "tiny-invariant";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import {
	getTabListProps,
	getTabPanelProps,
	getTabProps,
	useTabs,
} from "../../behaviors/use-tabs.js";
import type { ActivationMode, Orientation, TabsBehavior } from "../../behaviors/use-tabs.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { ScrollBehavior } from "../../hooks/use-scroll-behavior.js";
import type { WithAsChild } from "../../types/as-child.js";
import { parseBooleanish } from "../../types/booleanish.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

const TabsContext = createContext<TabsBehavior | null>(null);

/** The `loop` prop of the nearest list, which each trigger's arrow keys read. */
const TabsLoopContext = createContext(true);

/**
 * Reads the tab state of the nearest `Tabs.Root` or `HeadlessTabs.Root`.
 * Throws with `message` when the part renders outside both.
 */
function useTabsBehavior(message: string): TabsBehavior {
	const context = useContext(TabsContext);
	invariant(context != null, message);
	return context;
}

const outsideRoot = (part: string) =>
	`HeadlessTabs.${part} must be rendered inside HeadlessTabs.Root or Tabs.Root.`;

type RootProps = Omit<ComponentProps<"div">, "defaultValue" | "dir"> &
	WithAsChild &
	WithDataSlot & {
		/** The value of the tab to activate when the root is uncontrolled. */
		defaultValue?: string;
		/** The value of the active tab. Pass it with `onValueChange` to control the root. */
		value?: string;
		/** Called with the tab's value when a tab activates. Fires once per activation. */
		// Why the method type: its parameter is bivariant, so a handler typed with
		// a union of tab values still type-checks, as it did with Radix.
		onValueChange?: { bivarianceHack(value: string): void }["bivarianceHack"];
		/**
		 * The axis of the list. It decides which arrow keys move focus.
		 * @default "horizontal"
		 */
		orientation?: Orientation;
		/**
		 * `automatic` activates a tab when it gets focus. `manual` activates it on
		 * Enter, Space, or a press.
		 * @default "automatic"
		 */
		activationMode?: ActivationMode;
		/**
		 * The reading direction, set as the root's `dir`. A right-to-left list
		 * swaps the left and right arrow keys. When unset, the list inherits it.
		 */
		dir?: "ltr" | "rtl";
	};

/**
 * The unstyled outermost part of a tab set. It owns the selected value,
 * `orientation`, and `activationMode`, and renders a `<div>` with no class.
 *
 * It follows the WAI-ARIA tabs pattern: the arrow keys move focus between
 * the enabled triggers, Home and End move to the ends, and only one trigger is
 * a Tab stop. `onValueChange` fires once per activation.
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description             |
 * | ------------------ | ------------------------------ | ----------------------- |
 * | `data-slot`        | `"tabs"`                       | On the root element.    |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The `orientation` prop. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#headlesstabsroot
 *
 * @example
 * ```tsx
 * <HeadlessTabs.Root defaultValue="api" className="flex flex-col gap-6">
 *   <HeadlessTabs.List aria-label="Use cases" className="grid grid-cols-2">
 *     <HeadlessTabs.Trigger value="api" className="p-6 aria-selected:bg-card-hover">
 *       API gateway
 *     </HeadlessTabs.Trigger>
 *     <HeadlessTabs.Trigger value="webhooks" className="p-6 aria-selected:bg-card-hover">
 *       Webhooks
 *     </HeadlessTabs.Trigger>
 *   </HeadlessTabs.List>
 *   <HeadlessTabs.Content value="api">One front door for every API.</HeadlessTabs.Content>
 *   <HeadlessTabs.Content value="webhooks">Verify every webhook.</HeadlessTabs.Content>
 * </HeadlessTabs.Root>
 * ```
 */
const Root = ({
	activationMode,
	asChild = false,
	children,
	"data-slot": dataSlot,
	defaultValue,
	dir,
	onValueChange,
	orientation = "horizontal",
	value,
	...props
}: RootProps) => {
	const tabs = useTabs({ value, defaultValue, onValueChange, orientation, activationMode });
	const Component = asChild ? Slot : "div";
	return (
		<TabsContext.Provider value={tabs}>
			<Component
				data-slot={joinDataSlot(dataSlot, "tabs")}
				data-orientation={orientation}
				dir={dir}
				{...props}
			>
				{children}
			</Component>
		</TabsContext.Provider>
	);
};

// Why: a pointer press focuses the trigger before `click` fires. If that
// focus scrolled the list, an off-center trigger would move out from under the
// pointer and the click, and with it a link's navigation, would never happen.
// So the scroll below runs for keyboard focus only. React delegates these
// handlers, so a list adds no DOM listener.
let focusFromPointer = false;
const markPointerFocus = () => {
	focusFromPointer = true;
};
const clearPointerFocus = () => {
	focusFromPointer = false;
};
// Why a timeout: a link trigger takes focus in its click handler, which runs
// after `pointerup` in the same task.
const clearPointerFocusSoon = () => {
	setTimeout(clearPointerFocus);
};

/**
 * Keeps a keyboard-focused trigger in view in a horizontal list: `focus()`
 * does not always scroll its target into view inside an overflow container.
 */
const scrollFocusedTab = (event: FocusEvent<HTMLElement>) => {
	const list = event.currentTarget;
	if (
		focusFromPointer ||
		event.target === list ||
		list.getAttribute("aria-orientation") !== "horizontal"
	) {
		return;
	}
	const behavior: ScrollBehavior = getPrefersReducedMotion() ? "auto" : "smooth";
	// "center" rather than "nearest" so the focused tab lands in the middle of
	// the visible area, giving the user context on both sides.
	event.target.scrollIntoView({ behavior, inline: "center", block: "nearest" });
};

/** Runs the consumer's handler, then the part's, whatever the consumer did. */
const chain =
	<E,>(consumer: ((event: E) => void) | undefined, own: (event: E) => void) =>
	(event: E) => {
		consumer?.(event);
		own(event);
	};

type ListProps = ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the arrow keys wrap from the last tab to the first, and back.
		 * @default true
		 */
		loop?: boolean;
	};

/**
 * The unstyled `role="tablist"` that holds the triggers. Lay it out with your
 * own classes. When it scrolls, keyboard focus scrolls the focused trigger
 * into view, and a pointer press does not.
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description             |
 * | ------------------ | ------------------------------ | ----------------------- |
 * | `data-slot`        | `"tabs-list"`                  | On the tablist element. |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The root's orientation. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#headlesstabslist
 *
 * @example
 * ```tsx
 * <HeadlessTabs.Root defaultValue="api" className="flex flex-col gap-6">
 *   <HeadlessTabs.List aria-label="Use cases" className="grid grid-cols-2">
 *     <HeadlessTabs.Trigger value="api" className="p-6 aria-selected:bg-card-hover">
 *       API gateway
 *     </HeadlessTabs.Trigger>
 *     <HeadlessTabs.Trigger value="webhooks" className="p-6 aria-selected:bg-card-hover">
 *       Webhooks
 *     </HeadlessTabs.Trigger>
 *   </HeadlessTabs.List>
 *   <HeadlessTabs.Content value="api">One front door for every API.</HeadlessTabs.Content>
 *   <HeadlessTabs.Content value="webhooks">Verify every webhook.</HeadlessTabs.Content>
 * </HeadlessTabs.Root>
 * ```
 */
const List = ({
	asChild = false,
	"data-slot": dataSlot,
	loop = true,
	onFocus,
	onKeyDown,
	onMouseDown,
	onPointerCancel,
	onPointerDown,
	onPointerUp,
	...props
}: ListProps) => {
	const listProps = getTabListProps(useTabsBehavior(outsideRoot("List")));
	const Component = asChild ? Slot : "div";
	return (
		<TabsLoopContext.Provider value={loop}>
			<Component
				{...listProps}
				data-slot={joinDataSlot(dataSlot, "tabs-list")}
				{...props}
				onMouseDown={composeHandlers(onMouseDown, listProps.onMouseDown)}
				onPointerDown={chain(onPointerDown, markPointerFocus)}
				onPointerUp={chain(onPointerUp, clearPointerFocusSoon)}
				onPointerCancel={chain(onPointerCancel, clearPointerFocus)}
				onKeyDown={chain(onKeyDown, clearPointerFocus)}
				onFocus={chain(onFocus, composeHandlers(scrollFocusedTab, listProps.onFocus))}
			/>
		</TabsLoopContext.Provider>
	);
};

type TriggerProps = ComponentProps<"button"> &
	WithAsChild &
	WithDataSlot & {
		/** The value that joins the trigger to its content. */
		value: string;
	};

/**
 * The unstyled `role="tab"` button that activates its content. Its only
 * class is mantle's focus ring for keyboard focus: a pointer press focuses the
 * trigger without the ring. Style the states with `aria-selected:` and
 * `not-aria-selected:`. An `asChild` link activates on click, so a press
 * released off the link switches no tab. A disabled `asChild` link renders as
 * a `<button>`, so it does not navigate.
 *
 * **Data attributes:**
 *
 * | Data Attribute  | Value                  | Description                                                     |
 * | --------------- | ---------------------- | --------------------------------------------------------------- |
 * | `data-slot`     | `"tabs-trigger"`       | On the trigger element.                                         |
 * | `aria-selected` | `"true"` \| `"false"`  | Whether the trigger's panel is shown. Style it with `aria-selected:`. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#headlesstabstrigger
 *
 * @example
 * ```tsx
 * <HeadlessTabs.Root defaultValue="api" className="flex flex-col gap-6">
 *   <HeadlessTabs.List aria-label="Use cases" className="grid grid-cols-2">
 *     <HeadlessTabs.Trigger value="api" className="p-6 aria-selected:bg-card-hover">
 *       API gateway
 *     </HeadlessTabs.Trigger>
 *     <HeadlessTabs.Trigger value="webhooks" className="p-6 aria-selected:bg-card-hover">
 *       Webhooks
 *     </HeadlessTabs.Trigger>
 *   </HeadlessTabs.List>
 *   <HeadlessTabs.Content value="api">One front door for every API.</HeadlessTabs.Content>
 *   <HeadlessTabs.Content value="webhooks">Verify every webhook.</HeadlessTabs.Content>
 * </HeadlessTabs.Root>
 * ```
 */
const Trigger = ({
	"aria-disabled": _ariaDisabled,
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	disabled: _disabled,
	onBlur,
	onClick,
	onFocus,
	onKeyDown,
	onMouseDown,
	ref,
	value,
	...props
}: TriggerProps) => {
	const tabs = useTabsBehavior(outsideRoot("Trigger"));
	const disabled = parseBooleanish(_ariaDisabled ?? _disabled);
	const tabProps = getTabProps(tabs, { value, disabled, loop: useContext(TabsLoopContext) });

	const triggerProps = {
		...tabProps,
		"aria-disabled": _ariaDisabled ?? _disabled,
		className: cx("outline-hidden focus-visible:focus-ring", className),
		"data-slot": joinDataSlot(dataSlot, "tabs-trigger"),
		...props,
		// Why only `asChild`: the click handler serves a link child. React gives an
		// element with `onClick` a DOM listener of its own.
		onClick: asChild ? composeHandlers(onClick, tabProps.onClick) : onClick,
		onBlur: composeHandlers(onBlur, tabProps.onBlur),
		onFocus: composeHandlers(onFocus, tabProps.onFocus),
		onKeyDown: composeHandlers(onKeyDown, tabProps.onKeyDown),
		onMouseDown: composeHandlers(onMouseDown, tabProps.onMouseDown),
		ref: useComposedRefs(ref, tabProps.ref),
	};

	if (asChild) {
		const singleChild = Children.only(children);
		invariant(
			isValidElement<{ children?: ReactNode }>(singleChild),
			"When using `asChild`, TabsTrigger must be passed a single child as a JSX tag.",
		);
		return (
			// Why `type`: a `<button>` child inside a form would submit it. The
			// child's own `type` wins.
			<Slot type="button" {...triggerProps}>
				{/* Why a button: `<a>` has no `disabled` attribute and would stay
				    navigable. `pointer-events-none` would also block a tooltip. */}
				{disabled ? <button type="button">{singleChild.props.children}</button> : singleChild}
			</Slot>
		);
	}

	return (
		<button type="button" {...triggerProps}>
			{children}
		</button>
	);
};

type ContentProps = ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/** The value of the trigger that shows this panel. */
		value: string;
		/**
		 * Keeps the panel mounted while its tab is inactive. An inactive panel
		 * gets the `hidden` attribute.
		 */
		forceMount?: true;
		/**
		 * Keeps the panel mounted while its tab is inactive, as
		 * `hidden="until-found"`. Find-in-page and a fragment link reveal the
		 * text and activate the tab. Implies `forceMount`. Do not hide the panel
		 * with a `display: none` class: it blocks the search.
		 * @default false
		 */
		hiddenUntilFound?: boolean;
	};

/**
 * The unstyled `role="tabpanel"` for one trigger. It renders its children when
 * that trigger is active. `forceMount` keeps it mounted; `hiddenUntilFound`
 * keeps it mounted as `hidden="until-found"`, so find-in-page reveals it and
 * activates its trigger. Its only classes are mantle's focus ring for keyboard
 * focus and the rule that takes a panel hidden until found out of the layout.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                  | Description                                                           |
 * | -------------- | ---------------------- | --------------------------------------------------------------------- |
 * | `data-slot`    | `"tabs-content"`       | On the panel element.                                                 |
 * | `hidden`       | present while inactive | The browser hides the panel. `"until-found"` with `hiddenUntilFound`. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#headlesstabscontent
 *
 * @example
 * ```tsx
 * <HeadlessTabs.Root defaultValue="api" className="flex flex-col gap-6">
 *   <HeadlessTabs.List aria-label="Use cases" className="grid grid-cols-2">
 *     <HeadlessTabs.Trigger value="api" className="p-6 aria-selected:bg-card-hover">
 *       API gateway
 *     </HeadlessTabs.Trigger>
 *     <HeadlessTabs.Trigger value="webhooks" className="p-6 aria-selected:bg-card-hover">
 *       Webhooks
 *     </HeadlessTabs.Trigger>
 *   </HeadlessTabs.List>
 *   <HeadlessTabs.Content value="api">One front door for every API.</HeadlessTabs.Content>
 *   <HeadlessTabs.Content value="webhooks">Verify every webhook.</HeadlessTabs.Content>
 * </HeadlessTabs.Root>
 * ```
 */
const Content = ({
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	forceMount,
	hiddenUntilFound = false,
	ref,
	value,
	...props
}: ContentProps) => {
	const tabs = useTabsBehavior(outsideRoot("Content"));
	const { shown, panelProps, revealRef } = getTabPanelProps(tabs, {
		value,
		forceMount,
		hiddenUntilFound,
	});
	const composedRef = useComposedRefs(ref, revealRef);
	// Why: an `asChild` panel has no element of its own to leave empty.
	if (asChild && !shown) {
		return null;
	}
	const Component = asChild ? Slot : "div";
	return (
		<Component
			{...panelProps}
			data-slot={joinDataSlot(dataSlot, "tabs-content")}
			className={cx(
				"focus-visible:focus-ring outline-hidden",
				// Why: `until-found` hides only the panel's contents. Its own padding,
				// border, and the root's gap would still take space.
				"[[hidden=until-found]]:sr-only",
				className,
			)}
			ref={composedRef}
			{...props}
		>
			{shown && children}
		</Component>
	);
};

export {
	//,
	Content,
	List,
	Root,
	Trigger,
	useTabsBehavior,
};
export type {
	//,
	ContentProps,
	ListProps,
	RootProps,
	TriggerProps,
};
