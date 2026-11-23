"use client";

import { cva } from "class-variance-authority";
import type { ComponentProps, FocusEvent, ReactNode } from "react";
import { Children, cloneElement, createContext, isValidElement, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import {
	getTabListProps,
	getTabPanelProps,
	getTabProps,
	useTabs,
} from "../../behaviors/use-tabs.js";
import type { ActivationMode, Orientation, TabsBehavior } from "../../behaviors/use-tabs.js";
import type { SelfClosingWithAsChild, WithAsChild } from "../../types/as-child.js";
import { parseBooleanish } from "../../types/booleanish.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { cx } from "../../utils/cx/cx.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { ScrollBehavior } from "../../hooks/use-scroll-behavior.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";

type Appearance = "classic" | "pill";

type TabsContextValue = TabsBehavior & {
	appearance: Appearance;
};

const TabsContext = createContext<TabsContextValue | null>(null);

/** The `loop` prop of the nearest `Tabs.List`, which each trigger's arrow keys read. */
const TabsLoopContext = createContext(true);

/**
 * Reads the root's tab state and `appearance` for a part. Throws with the
 * part's name when the part renders outside `Tabs.Root`.
 */
function useTabsState(partName: string): TabsContextValue {
	const context = useContext(TabsContext);
	invariant(context != null, `${partName} must be rendered inside Tabs.Root.`);
	return context;
}

/**
 * Layered sections of content, called tab panels, that show one at a time.
 * The outermost part; it owns `orientation` and `appearance`. It stamps both as
 * `data-orientation` and `data-appearance` for the parts below to style against.
 *
 * It follows the WAI-ARIA tabs pattern: the arrow keys move focus between
 * the enabled triggers, Home and End move to the ends, and only the active
 * trigger is a Tab stop. `onValueChange` fires once per activation.
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description                                               |
 * | ------------------ | ------------------------------ | --------------------------------------------------------- |
 * | `data-slot`        | `"tabs"`                       | On the root element.                                      |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The `orientation` prop.                                   |
 * | `data-appearance`  | `"classic"` \| `"pill"`        | The `appearance` prop. Descendant parts style against it. |
 *
 * **CSS variables:**
 *
 * | CSS Variable | Default | Description                                                                                                                              |
 * | ------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
 * | `--tabs-gap` | `1rem`  | The space between the list and the content. `Tabs.Separator` pulls itself up by it, so set the variable here instead of a `gap-*` class. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabsroot
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 *   <Tabs.Content value="password">
 *     <p>Change your password here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const Root = ({
	activationMode,
	appearance = "classic",
	asChild = false,
	className,
	children,
	"data-slot": dataSlot,
	defaultValue,
	dir,
	onValueChange,
	orientation = "horizontal",
	value,
	...props
}: Omit<ComponentProps<"div">, "defaultValue" | "dir"> &
	WithAsChild &
	WithDataSlot & {
		/** The value of the tab to activate when the root is uncontrolled. */
		defaultValue?: string;
		/** The value of the active tab. Pass it with `onValueChange` to control the root. */
		value?: string;
		/** Called with the tab's value when a tab activates. Fires once per activation. */
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
		/**
		 * The appearance of the tabs. Classic appearance shows the tab
		 * list with an underline; pill appearance shows each tab as a pill.
		 * @default "classic"
		 */
		appearance?: Appearance;
	}) => {
	const tabs = useTabs({ value, defaultValue, onValueChange, orientation, activationMode });
	const contextValue = useMemo(() => ({ ...tabs, appearance }), [tabs, appearance]);
	const Component = asChild ? Slot : "div";
	return (
		<TabsContext.Provider value={contextValue}>
			<Component
				data-slot={joinDataSlot(dataSlot, "tabs")}
				data-appearance={appearance}
				data-orientation={orientation}
				dir={dir}
				className={cx(
					// Why a variable: `Tabs.Separator` reads `--tabs-gap` to cancel this gap
					// and sit flush against the list, so both must move together.
					"flex [--tabs-gap:--spacing(4)] gap-(--tabs-gap)",
					orientation === "horizontal" ? "flex-col" : "flex-row",
					className,
				)}
				{...props}
			>
				{children}
			</Component>
		</TabsContext.Provider>
	);
};

/**
 * Variants for the List component
 */
const listVariants = cva("flex", {
	variants: {
		orientation: {
			// Why `self-stretch`: the list spans the root plus its own `-mx-1`, so the
			// `px-1` content box ends at the root's edges and the last trigger meets
			// the separator. A `100%` width ends 8px short on the right.
			horizontal:
				"scroll-fade-x flex-row items-center overflow-x-auto overscroll-x-none self-stretch min-w-0 pt-1 -mt-1 px-1 -mx-1",
			vertical: "flex-col items-end gap-3.5 self-stretch",
		} as const satisfies Record<Orientation, string>,
		appearance: {
			classic: "",
			pill: "",
		} as const satisfies Record<Appearance, string>,
	},
	compoundVariants: [
		{
			orientation: "horizontal",
			appearance: "pill",
			// pb-1 -mb-1 gives the focus ring space below (ring-4 is box-shadow, clipped by overflow).
			className: "gap-1 pb-1 -mb-1",
		},
		{
			orientation: "horizontal",
			appearance: "classic",
			className: "gap-6",
		},
	],
});

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
 * The edge fade is the `scroll-fade-x` utility, a CSS scroll-driven animation.
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

/**
 * Contains the triggers that are aligned along the edge of the active content.
 * The list draws no border of its own: compose `Tabs.Separator` after it for
 * the hairline between the triggers and the content.
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description                           |
 * | ------------------ | ------------------------------ | ------------------------------------- |
 * | `data-slot`        | `"tabs-list"`                  | On the tablist element.               |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The root's orientation.               |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabslist
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const List = ({
	asChild = false,
	className,
	"data-slot": dataSlot,
	loop = true,
	onFocus,
	onKeyDown,
	onPointerCancel,
	onPointerDown,
	onPointerUp,
	ref,
	...props
}: ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the arrow keys wrap from the last tab to the first, and back.
		 * @default true
		 */
		loop?: boolean;
	}) => {
	const tabs = useTabsState("Tabs.List");
	const { orientation, appearance } = tabs;
	const listProps = getTabListProps(tabs);

	const composedRef = useComposedRefs(listProps.ref, ref);
	const Component = asChild ? Slot : "div";

	return (
		<TabsLoopContext.Provider value={loop}>
			<Component
				{...listProps}
				data-slot={joinDataSlot(dataSlot, "tabs-list")}
				className={cx(listVariants({ orientation, appearance }), className)}
				ref={composedRef}
				{...props}
				onPointerDown={chain(onPointerDown, markPointerFocus)}
				onPointerUp={chain(onPointerUp, clearPointerFocusSoon)}
				onPointerCancel={chain(onPointerCancel, clearPointerFocus)}
				onKeyDown={chain(onKeyDown, clearPointerFocus)}
				onFocus={chain(onFocus, composeHandlers(scrollFocusedTab, listProps.onFocus))}
			/>
		</TabsLoopContext.Provider>
	);
};

type TabsSeparatorProps = Omit<
	ComponentProps<typeof Separator>,
	"asChild" | "children" | "orientation"
> &
	SelfClosingWithAsChild &
	WithDataSlot;

/**
 * The hairline between the list and the content, in the `separator` color
 * token. Compose it directly after `Tabs.List`. It follows the root's
 * `orientation`: a horizontal root draws it under the list, a vertical root
 * draws it beside the list. It is a sibling of the list and not a child, so it
 * spans the root's full width and neither scrolls nor fades with the triggers.
 *
 * As the root's direct child it pulls itself up by `--tabs-gap` and sits flush
 * against the list, while the content keeps the gap. Inside a wrapper of your
 * own, the offset stays off.
 *
 * The separator is decorative (`role="none"`). Pass `semantic` for
 * `role="separator"`. Outside `Tabs.Root` it throws.
 *
 * **CSS variables:**
 *
 * | CSS Variable | Default | Description                                                                                   |
 * | ------------ | ------- | --------------------------------------------------------------------------------------------- |
 * | `--tabs-gap` | `1rem`  | Read, not owned. `Tabs.Root` sets it; the separator cancels it to sit flush against the list. |
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description                                   |
 * | ------------------ | ------------------------------ | --------------------------------------------- |
 * | `data-slot`        | `"tabs-separator separator"`   | On the separator element, joined ahead of `Separator`'s own slot. |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The root's orientation.                       |
 * | `data-separator`   | present                        | Presence-only. Set by the mantle `Separator`. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabsseparator
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const TabsSeparator = ({ className, "data-slot": dataSlot, ...props }: TabsSeparatorProps) => {
	const { orientation } = useTabsState("Tabs.Separator");

	// Why the parent selector: the root lays its children out with `gap`, so
	// only a separator that is the root's direct child has a gap to cancel.
	//
	// Why `~=`: an `asChild` ancestor joins its own slot ahead of `tabs`, and an
	// exact match would miss that root.
	//
	// Why `h-auto self-stretch`: `Separator` sets `h-full` when vertical, and a
	// flex item stretches only when its height computes to `auto`. `100%` of the
	// root's auto height resolves to nothing, so the hairline would be 0px tall.
	const orientationClasses =
		orientation === "horizontal"
			? "[[data-slot~=tabs]>&]:-mt-(--tabs-gap)"
			: "h-auto self-stretch [[data-slot~=tabs]>&]:-ml-(--tabs-gap)";

	return (
		<Separator
			data-slot={joinDataSlot(dataSlot, "tabs-separator")}
			orientation={orientation}
			className={cx(orientationClasses, className)}
			{...props}
		/>
	);
};

type TabsTriggerProps = ComponentProps<"button"> &
	WithAsChild &
	WithDataSlot & {
		/** The value that joins the trigger to its `Tabs.Content`. */
		value: string;
	};

/**
 * Variants for the Trigger component
 */
const triggerVariants = cva(
	cx(
		"group/tab-trigger relative flex cursor-pointer select-none items-center gap-1 whitespace-nowrap py-3 text-sm font-medium text-gray-600",
		"outline-hidden",
		"aria-disabled:cursor-default aria-disabled:opacity-50",
		"focus-visible:focus-ring",
		// Why slot-scoped: the label span makes a consumer's svg a grandchild, so a
		// bare `[&>svg]` matches nothing. A `[&_svg]` would also size the glyph
		// inside `Tabs.Badge`.
		"[&>[data-slot=tabs-trigger-label]>svg]:shrink-0 [&>[data-slot=tabs-trigger-label]>svg]:size-5",
		"not-aria-disabled:hover:text-gray-900",
	),
	{
		variants: {
			orientation: {
				horizontal: "rounded-tl-md rounded-tr-md after:inset-x-0 after:bottom-0 after:h-0.75",
				vertical: "rounded-bl-md rounded-tl-md pr-3 after:inset-y-0 after:-right-px after:w-0.75",
			} as const satisfies Record<Orientation, string>,
			appearance: {
				// Why a pseudo-element: the active-tab bar costs no element and no render.
				classic: cx(
					"after:absolute after:z-0 data-state-active:after:bg-neutral-950",
					"not-aria-disabled:hover:data-state-active:text-strong",
					"data-state-active:text-strong",
				),
				pill: cx(
					"not-aria-disabled:hover:data-state-active:text-strong",
					"not-aria-disabled:hover:data-state-active:bg-neutral-500/15",
					"data-state-active:text-strong",
					"data-state-active:bg-neutral-500/15",
					"rounded-full py-2 px-3",
					// Why: the orientation's bar geometry would make an empty flex item.
					"after:content-none",
				),
			} as const satisfies Record<Appearance, string>,
		},
	},
);

/**
 * The button that activates its associated content.
 *
 * **Structure.** `children` render inside a
 * `<span data-slot="tabs-trigger-label">`, on the plain path and the `asChild`
 * path alike. The active-tab bar of the classic appearance is the trigger's
 * `::after`. The span is `display: contents`,
 * so the icon, the label, and `Tabs.Badge` stay flex items of the trigger and
 * keep its `gap`. A `[&>svg]` class of your own no longer reaches an icon you
 * pass as a child, because that icon is now a grandchild. Match the part's own
 * variant instead: `[&>[data-slot=tabs-trigger-label]>svg]:size-4`. A `[&_svg]`
 * or a class on the icon loses to the default, which is more specific.
 *
 * **Pointer press.** A mouse press focuses the trigger without the focus ring;
 * keyboard focus still shows it. The label text is not selectable. An `asChild`
 * link activates on click, not on the press, so a press released off the link
 * switches no tab. The link does not drag.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                    | Description                          |
 * | -------------- | ------------------------ | ------------------------------------ |
 * | `data-slot`    | `"tabs-trigger"`         | On the trigger element.              |
 * | `data-slot`    | `"tabs-trigger-label"`   | On the `<span>` wrapping `children`. |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The root's orientation.               |
 * | `data-state`   | `"active"` \| `"inactive"` | Whether the trigger's panel is shown. |
 * | `data-disabled` | present when `disabled` | Presence-only. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabstrigger
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
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
	value,
	...props
}: TabsTriggerProps) => {
	const tabs = useTabsState("Tabs.Trigger");
	const { orientation, appearance } = tabs;
	const disabled = parseBooleanish(_ariaDisabled ?? _disabled);
	const tabProps = getTabProps(tabs, { value, disabled, loop: useContext(TabsLoopContext) });

	const triggerProps = {
		...tabProps,
		"aria-disabled": _ariaDisabled ?? _disabled,
		className: cx(triggerVariants({ orientation, appearance }), className),
		"data-slot": joinDataSlot(dataSlot, "tabs-trigger"),
		...props,
		// Why only `asChild`: the click handler serves a link child. React gives an
		// element with `onClick` a DOM listener of its own.
		onClick: asChild ? composeHandlers(onClick, tabProps.onClick) : onClick,
		onBlur: composeHandlers(onBlur, tabProps.onBlur),
		onFocus: composeHandlers(onFocus, tabProps.onFocus),
		onKeyDown: composeHandlers(onKeyDown, tabProps.onKeyDown),
		onMouseDown: composeHandlers(onMouseDown, tabProps.onMouseDown),
	};

	if (asChild) {
		const singleChild = Children.only(children);
		invariant(
			isValidElement<{ children?: ReactNode }>(singleChild),
			"When using `asChild`, TabsTrigger must be passed a single child as a JSX tag.",
		);
		const grandchildren = singleChild.props?.children;

		// When disabled, prevent anchor/link children from being clickable by
		// removing their href/to props. `<a>` has no `disabled` attribute and
		// would stay navigable. `pointer-events-none` would also block tooltip
		// interactions, which may be surprising, so it is not the default.
		const cloneProps = disabled ? { href: undefined, to: undefined } : {};

		return (
			// Why `type`: a `<button>` child inside a form would submit it. The
			// child's own `type` wins.
			<Slot type="button" {...triggerProps}>
				{cloneElement(
					disabled ? <button type="button" /> : singleChild,
					cloneProps,
					<span data-slot="tabs-trigger-label" className="contents">
						{grandchildren}
					</span>,
				)}
			</Slot>
		);
	}

	return (
		<button type="button" {...triggerProps}>
			<span data-slot="tabs-trigger-label" className="contents">
				{children}
			</span>
		</button>
	);
};

/**
 * A badge to render inside a tab trigger, typically a count or a status indicator.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value          | Description           |
 * | -------------- | -------------- | --------------------- |
 * | `data-slot`    | `"tabs-badge"` | On the badge element. |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabsbadge
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">
 *       Account <Tabs.Badge>5</Tabs.Badge>
 *     </Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 * </Tabs.Root>
 * ```
 */
const Badge = ({
	className,
	children,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"span"> & WithDataSlot) => (
	<span
		data-slot={joinDataSlot(dataSlot, "tabs-badge")}
		className={cx(
			"rounded-full bg-neutral-500/20 px-1.5 text-xs font-medium text-gray-600",
			"group-data-state-active/tab-trigger:bg-neutral-950/10 group-data-state-active/tab-trigger:text-strong group-hover/tab-trigger:group-enabled/tab-trigger:group-data-state-active/tab-trigger:text-strong",
			"group-hover/tab-trigger:group-enabled/tab-trigger:text-gray-700",
			className,
		)}
		{...props}
	>
		{children}
	</span>
);

/**
 * Contains the content associated with each trigger.
 * It renders when that trigger is active. `forceMount` keeps it mounted;
 * `hiddenUntilFound` keeps it mounted as `hidden="until-found"`, so
 * find-in-page reveals it and activates its trigger.
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description                               |
 * | ------------------ | ------------------------------ | ----------------------------------------- |
 * | `data-slot`        | `"tabs-content"`               | On the panel element.                     |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The root's orientation.                   |
 * | `data-state`       | `"active"` \| `"inactive"`     | Whether the panel is shown.               |
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabscontent
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Separator />
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 *   <Tabs.Content value="password">
 *     <p>Change your password here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
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
}: ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/** The value of the trigger that shows this panel. */
		value: string;
		/**
		 * Keeps the panel mounted while its tab is inactive. Hide an inactive
		 * panel yourself, such as with `data-[state=inactive]:hidden`.
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
	}) => {
	const tabs = useTabsState("Tabs.Content");
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
	Root,
	Content,
	List,
	TabsSeparator,
	Trigger,
	Badge,
};
