"use client";

import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cloneElement, createContext, isValidElement, useContext, useRef } from "react";
import type { Orientation } from "../../behaviors/use-tabs.js";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { cx } from "../../utils/cx/cx.js";
import { useSlidingThumb } from "../../utils/sliding-thumb.js";
import type { SlidingThumbOptions } from "../../utils/sliding-thumb.js";
import { Separator } from "../separator/separator.js";
import * as HeadlessTabs from "./headless-tabs.js";

type Appearance = "classic" | "pill";

/** The root's `appearance`, which the styled parts read. */
const TabsAppearanceContext = createContext<Appearance>("classic");

/**
 * Reads the root's orientation and `appearance` for a styled part. Throws with
 * the part's name when the part renders outside `Tabs.Root`.
 */
function useTabsStyle(partName: string) {
	const tabs = HeadlessTabs.useTabsBehavior(`${partName} must be rendered inside Tabs.Root.`);
	return { tabs, orientation: tabs.orientation, appearance: useContext(TabsAppearanceContext) };
}

/** Where the active-tab indicator is drawn, which tabs a drag skips, and how a drag lands. */
const thumbOptions: SlidingThumbOptions = {
	items: '[role="tab"]',
	checked: '[aria-selected="true"]',
	disabled: ':is(:disabled, [aria-disabled="true"])',
	pseudo: "::after",
	offset: "--_tabs-thumb-offset",
	// Why a press and a click: a drag lands as a press does, so the trigger's own
	// handlers run and an `onMouseDown` that calls `preventDefault()` vetoes it.
	// A press that a handler cancels still gets its click, as a real one does.
	// Why no commit with a modifier key: a modified press on a link opens it elsewhere,
	// and a script's click cannot do that. The indicator returns to the active tab.
	commit: (tab, release) => {
		if (release.altKey || release.ctrlKey || release.metaKey || release.shiftKey) {
			return;
		}
		tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
		tab.click();
	},
};

let overflowObserver: ResizeObserver | undefined;

/**
 * Marks `list` with `data-overflowing="true"` while it scrolls along its own
 * axis, else `"false"`. Why one axis: the bar of a vertical classic list sits
 * 1px past the list's side, and that is no scroll a swipe needs.
 */
const measureOverflow = (list: Element) => {
	const overflows =
		list.getAttribute("aria-orientation") === "vertical"
			? list.scrollHeight > list.clientHeight
			: list.scrollWidth > list.clientWidth;
	list.setAttribute("data-overflowing", String(overflows));
};

/**
 * A ref callback for a list and each of its triggers. Once measured, a list
 * carries `data-overflowing`: `"true"` while it scrolls, else `"false"`. A
 * touch swipe on the active tab drags the indicator only in a list measured
 * to fit, so the server HTML and a list that scrolls keep native scrolling.
 * One `ResizeObserver` serves every list: a trigger that resizes, such as a
 * badge that grows, can make its list scroll.
 */
const observeOverflow = (element: HTMLElement | null) => {
	// Why the check: jsdom has no `ResizeObserver`. The active tab then never drags on touch.
	if (element == null || typeof ResizeObserver === "undefined") {
		return undefined;
	}
	overflowObserver ??= new ResizeObserver((entries) => {
		for (const { target } of entries) {
			const list = target.closest('[role="tablist"]');
			if (list != null) {
				measureOverflow(list);
			}
		}
	});
	overflowObserver.observe(element);
	const list = element.closest('[role="tablist"]');
	return () => {
		overflowObserver?.unobserve(element);
		// Why a frame: a trigger that unmounts resizes nothing that the observer
		// sees, and the list can fit once the trigger is gone.
		if (list != null && list !== element) {
			requestAnimationFrame(() => {
				if (list.isConnected) {
					measureOverflow(list);
				}
			});
		}
	};
};

/**
 * Layered sections of content, called tab panels, that show one at a time.
 * The outermost part; it owns `orientation` and `appearance`. It stamps both as
 * `data-orientation` and `data-appearance` for the parts below to style against.
 *
 * It follows the WAI-ARIA tabs pattern: the arrow keys move focus between
 * the enabled triggers, Home and End move to the ends, and only the active
 * trigger is a Tab stop. `onValueChange` fires once per activation.
 *
 * The active indicator, the underline or the pill, slides from the tab that
 * was active to the new one. A mouse or a finger can drag it: see `Tabs.List`.
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
	appearance = "classic",
	className,
	orientation = "horizontal",
	...props
}: HeadlessTabs.RootProps & {
	/**
	 * The appearance of the tabs. Classic appearance shows the tab
	 * list with an underline; pill appearance shows each tab as a pill.
	 * @default "classic"
	 */
	appearance?: Appearance;
}) => (
	<TabsAppearanceContext.Provider value={appearance}>
		<HeadlessTabs.Root
			data-appearance={appearance}
			orientation={orientation}
			className={cx(
				// Why a variable: `Tabs.Separator` reads `--tabs-gap` to cancel this gap
				// and sit flush against the list, so both must move together.
				"flex [--tabs-gap:--spacing(4)] gap-(--tabs-gap)",
				orientation === "horizontal" ? "flex-col" : "flex-row",
				className,
			)}
			{...props}
		/>
	</TabsAppearanceContext.Provider>
);

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

/**
 * Contains the triggers that are aligned along the edge of the active content.
 * The list draws no border of its own: compose `Tabs.Separator` after it for
 * the hairline between the triggers and the content.
 *
 * **Drag.** A press on the active tab that moves along the list drags its
 * indicator with the pointer. On release, the indicator slides to the nearest
 * enabled tab, carried ahead by a flick, and that tab activates as a press
 * would: its panel shows and `onValueChange` fires once. A drag that passes
 * over a tab does not activate it. A touch swipe on the active tab of a list
 * that scrolls scrolls the list instead. With reduced motion, the indicator
 * follows the pointer and moves at once on release.
 *
 * **Data attributes:**
 *
 * | Data Attribute     | Value                          | Description                           |
 * | ------------------ | ------------------------------ | ------------------------------------- |
 * | `data-slot`        | `"tabs-list"`                  | On the tablist element.               |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | The root's orientation.               |
 * | `data-dragging`    | present during a drag          | The indicator follows the pointer. Presence-only. |
 * | `data-overflowing` | `"true"` \| `"false"`          | Set once measured. `"true"` while the list scrolls. |
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
const List = ({ className, ref, ...props }: HeadlessTabs.ListProps) => {
	const { tabs, orientation, appearance } = useTabsStyle("Tabs.List");
	const listRef = useRef<HTMLDivElement>(null);
	useSlidingThumb(listRef, tabs.value, thumbOptions);
	return (
		<HeadlessTabs.List
			className={cx(
				listVariants({ orientation, appearance }),
				"data-dragging:cursor-grabbing",
				className,
			)}
			{...props}
			ref={useComposedRefs(ref, listRef, observeOverflow)}
		/>
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
	const { orientation } = useTabsStyle("Tabs.Separator");

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

/**
 * Variants for the Trigger component
 */
const triggerVariants = cva(
	cx(
		"group/tab-trigger relative flex cursor-pointer select-none items-center gap-1 whitespace-nowrap py-3 text-sm font-medium text-gray-600",
		"aria-disabled:cursor-default aria-disabled:opacity-50",
		// Why slot-scoped: the label span makes a consumer's svg a grandchild, so a
		// bare `[&>svg]` matches nothing. A `[&_svg]` would also size the glyph
		// inside `Tabs.Badge`.
		"[&>[data-slot=tabs-trigger-label]>svg]:shrink-0 [&>[data-slot=tabs-trigger-label]>svg]:size-5",
		"not-aria-disabled:hover:text-gray-900",
		// Why a pseudo-element of each trigger: the active trigger draws the indicator,
		// so it costs no element and no render, and the server HTML shows it.
		// `useSlidingThumb` slides it from the trigger that was active.
		// Why no pointer events: a sliding indicator over a neighbor must not take its press.
		"after:pointer-events-none after:absolute",
		"aria-selected:not-in-data-dragging:text-strong not-aria-disabled:hover:aria-selected:text-strong",
		// Why: during a drag, the label under the indicator is strong, and the active tab can be away from it.
		"data-thumb-over:text-strong",
		// Why: Chromium takes the touch action of a `display: contents` label under the finger as
		// `auto`, and cancels a swipe on the text. The active tab's own box then takes the press.
		"aria-selected:[&>[data-slot=tabs-trigger-label]]:pointer-events-none",
		// Why: forced colors paint each background in the canvas color.
		"forced-colors:after:forced-color-adjust-none",
	),
	{
		variants: {
			orientation: {
				// Why `overflowing=false`: a touch swipe on the active tab drags the indicator only
				// in a list measured to fit. Before the measure, and in a list that scrolls, it scrolls.
				horizontal: cx(
					"rounded-tl-md rounded-tr-md",
					// Why only the active tab: an offset indicator on another tab would widen the scroll area.
					"aria-selected:after:translate-x-(--_tabs-thumb-offset,0px)",
					"aria-selected:in-[[role=tablist][data-overflowing=false]]:touch-pan-y aria-selected:in-[[role=tablist][data-overflowing=false]]:touch-pinch-zoom",
				),
				vertical: cx(
					"rounded-bl-md rounded-tl-md pr-3",
					"aria-selected:after:translate-y-(--_tabs-thumb-offset,0px)",
					"aria-selected:in-[[role=tablist][data-overflowing=false]]:touch-pan-x aria-selected:in-[[role=tablist][data-overflowing=false]]:touch-pinch-zoom",
				),
			} as const satisfies Record<Orientation, string>,
			appearance: {
				classic: cx(
					"after:z-0 aria-selected:after:bg-neutral-950",
					"forced-colors:aria-selected:after:bg-[Highlight]",
				),
				pill: cx(
					// Why isolate: the pill sits under the label and over the list.
					"isolate rounded-full py-2 px-3",
					"after:top-0 after:left-0 after:-z-1 after:size-full after:rounded-full aria-selected:after:bg-neutral-500/15",
					"forced-colors:aria-selected:after:border-2 forced-colors:aria-selected:after:border-[Highlight]",
				),
			} as const satisfies Record<Appearance, string>,
		},
		compoundVariants: [
			{
				orientation: "horizontal",
				appearance: "classic",
				className: "after:bottom-0 after:left-0 after:h-0.75 after:w-full",
			},
			{
				orientation: "vertical",
				appearance: "classic",
				className: "after:top-0 after:-right-px after:h-full after:w-0.75",
			},
		],
	},
);

/** Wraps a trigger's children in the label span that the variants style through. */
const label = (children: ReactNode) => (
	<span data-slot="tabs-trigger-label" className="contents">
		{children}
	</span>
);

/**
 * Wraps the children of an `asChild` trigger's child in the label span. Any
 * other children pass through, so `HeadlessTabs.Trigger` throws for them.
 */
const labelChild = (child: ReactNode) =>
	isValidElement<{ children?: ReactNode }>(child)
		? cloneElement(child, undefined, label(child.props.children))
		: child;

/**
 * The button that activates its associated content.
 *
 * **Structure.** `children` render inside a
 * `<span data-slot="tabs-trigger-label">`, on the plain path and the `asChild`
 * path alike. The active indicator, the bar of the classic appearance or the
 * pill, is the trigger's `::after`. The span is `display: contents`,
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
 * | `aria-selected` | `"true"` \| `"false"`   | Whether the trigger's panel is shown. Style it with `aria-selected:`. |
 * | `data-thumb-over` | present during a drag | The dragged indicator is over this trigger. Presence-only. |
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
	asChild = false,
	children,
	className,
	ref,
	...props
}: HeadlessTabs.TriggerProps) => {
	const { orientation, appearance } = useTabsStyle("Tabs.Trigger");
	return (
		<HeadlessTabs.Trigger
			asChild={asChild}
			className={cx(triggerVariants({ orientation, appearance }), className)}
			{...props}
			ref={useComposedRefs(ref, observeOverflow)}
		>
			{asChild ? labelChild(children) : label(children)}
		</HeadlessTabs.Trigger>
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
			"group-aria-selected/tab-trigger:bg-neutral-950/10 group-aria-selected/tab-trigger:text-strong group-hover/tab-trigger:group-enabled/tab-trigger:group-aria-selected/tab-trigger:text-strong",
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
 * | `hidden`           | present while inactive         | The browser hides the panel. `"until-found"` with `hiddenUntilFound`. |
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
const Content: typeof HeadlessTabs.Content = HeadlessTabs.Content;

export {
	//,
	Root,
	Content,
	List,
	TabsSeparator,
	Trigger,
	Badge,
};
