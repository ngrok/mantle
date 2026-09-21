"use client";

import {
	Content as TabsPrimitiveContent,
	List as TabsPrimitiveList,
	Root as TabsPrimitiveRoot,
	Trigger as TabsPrimitiveTrigger,
} from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";
import type { ComponentProps, ComponentRef, HTMLAttributes } from "react";
import {
	Children,
	cloneElement,
	createContext,
	isValidElement,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import invariant from "tiny-invariant";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { parseBooleanish } from "../../types/booleanish.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { ScrollBehavior } from "../../hooks/use-scroll-behavior.js";
import { Separator } from "../separator/separator.js";

type Orientation = "horizontal" | "vertical";
type Appearance = "classic" | "pill";

type TabsStateContextValue = {
	orientation: Orientation;
	appearance: Appearance;
};

const TabsStateContext = createContext<TabsStateContextValue | null>(null);

/**
 * Reads the root's `orientation` and `appearance` for a part. Throws with the
 * part's name when the part renders outside `Tabs.Root`.
 */
function useTabsState(partName: string): TabsStateContextValue {
	const context = useContext(TabsStateContext);
	invariant(context != null, `${partName} must be rendered inside Tabs.Root.`);
	return context;
}

/**
 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
 * The outermost part; it owns `orientation` and `appearance`. It stamps both as
 * `data-orientation` and `data-appearance` for the parts below to style against.
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
	className,
	children,
	orientation = "horizontal",
	appearance = "classic",
	...props
}: ComponentProps<typeof TabsPrimitiveRoot> & {
	/**
	 * The appearance of the tabs. Classic appearance shows the tab
	 * list with an underline; pill appearance shows each tab as a pill.
	 * @default "classic"
	 */
	appearance?: "classic" | "pill";
}) => {
	const contextValue = useMemo(() => ({ orientation, appearance }), [orientation, appearance]);
	return (
		<TabsPrimitiveRoot
			data-slot="tabs"
			data-appearance={appearance}
			className={cx(
				// Why a variable: `Tabs.Separator` reads `--tabs-gap` to cancel this gap
				// and sit flush against the list, so both must move together.
				"flex [--tabs-gap:--spacing(4)] gap-(--tabs-gap)",
				orientation === "horizontal" ? "flex-col" : "flex-row",
				className,
			)}
			orientation={orientation}
			{...props}
		>
			<TabsStateContext.Provider value={contextValue}>{children}</TabsStateContext.Provider>
		</TabsPrimitiveRoot>
	);
};

/**
 * Variants for the List component
 */
const listVariants = cva("flex", {
	variants: {
		orientation: {
			horizontal:
				"scroll-fade-x flex-row items-center overflow-x-auto overscroll-x-none w-full min-w-0 pt-1 -mt-1 px-1 -mx-1",
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
const List = ({ className, ref, ...props }: ComponentProps<typeof TabsPrimitiveList>) => {
	const { orientation, appearance } = useTabsState("Tabs.List");
	const scrollRef = useRef<ComponentRef<typeof TabsPrimitiveList>>(null);
	const composedRef = useComposedRefs(scrollRef, ref);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element || orientation !== "horizontal") {
			return;
		}

		const abortController = new AbortController();
		const { signal } = abortController;

		// Why: a pointer press focuses the trigger before `click` fires. If that
		// focus scrolled the list, an off-center trigger would move out from under
		// the pointer and the click, and with it a link's navigation, would never
		// happen. So the scroll below runs for keyboard focus only.
		let focusFromPointer = false;
		element.addEventListener(
			"pointerdown",
			() => {
				focusFromPointer = true;
			},
			{ signal },
		);
		const clearPointerFlag = () => {
			focusFromPointer = false;
		};
		element.addEventListener("pointerup", clearPointerFlag, { signal });
		element.addEventListener("pointercancel", clearPointerFlag, { signal });
		element.addEventListener("keydown", clearPointerFlag, { signal });

		// The edge fade is handled declaratively by the `scroll-fade-x` utility
		// (a CSS scroll-driven animation), so the only thing left for JS here is
		// keeping a keyboard-focused trigger scrolled into view.
		//
		// When Radix moves focus via arrow keys it calls element.focus(), which doesn't
		// always scroll the target into view inside an overflow container. We handle it
		// explicitly here via event delegation so every trigger gets this behavior with
		// a single listener rather than one per trigger.
		element.addEventListener(
			"focusin",
			(event) => {
				if (focusFromPointer) {
					return;
				}
				if (event.target instanceof Element && event.target !== element) {
					const scrollBehavior: ScrollBehavior = getPrefersReducedMotion() ? "auto" : "smooth";
					event.target.scrollIntoView({
						behavior: scrollBehavior,
						// "center" rather than "nearest" so the focused tab lands in the middle
						// of the visible area, giving the user context on both sides.
						inline: "center",
						block: "nearest",
					});
				}
			},
			{ signal },
		);

		return () => {
			abortController.abort();
		};
	}, [orientation]);

	return (
		<TabsPrimitiveList
			aria-orientation={orientation}
			data-slot="tabs-list"
			className={cx(listVariants({ orientation, appearance }), className)}
			ref={composedRef}
			{...props}
		/>
	);
};

type TabsSeparatorProps = Omit<
	ComponentProps<typeof Separator>,
	"asChild" | "children" | "orientation"
> &
	SelfClosingWithAsChild;

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
 * | `data-slot`        | `"tabs-separator"`             | On the separator element.                     |
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
const TabsSeparator = ({ className, ...props }: TabsSeparatorProps) => {
	const { orientation } = useTabsState("Tabs.Separator");

	// Why the parent selector: the root lays its children out with `gap`, so
	// only a separator that is the root's direct child has a gap to cancel.
	//
	// Why `h-auto self-stretch`: `Separator` sets `h-full` when vertical, and a
	// flex item stretches only when its height computes to `auto`. `100%` of the
	// root's auto height resolves to nothing, so the hairline would be 0px tall.
	const orientationClasses =
		orientation === "horizontal"
			? "[[data-slot=tabs]>&]:-mt-(--tabs-gap)"
			: "h-auto self-stretch [[data-slot=tabs]>&]:-ml-(--tabs-gap)";

	return (
		<Separator
			data-slot="tabs-separator"
			orientation={orientation}
			className={cx(orientationClasses, className)}
			{...props}
		/>
	);
};

type TabsTriggerProps = ComponentProps<typeof TabsPrimitiveTrigger>;

/**
 * Variants for the TabsTriggerDecoration component
 */
const triggerDecorationVariants = cva("absolute z-0", {
	variants: {
		orientation: {
			horizontal: "bottom-0 left-0 right-0 h-0.75",
			vertical: "-right-px bottom-0 top-0 w-0.75",
		} as const satisfies Record<Orientation, string>,
		appearance: {
			classic: "group-data-state-active/tab-trigger:bg-neutral-950",
			pill: "hidden",
		} as const satisfies Record<Appearance, string>,
	},
});

const TabsTriggerDecoration = () => {
	const { orientation, appearance } = useTabsState("Tabs.Trigger");

	return (
		<span aria-hidden className={clsx(triggerDecorationVariants({ orientation, appearance }))} />
	);
};

/**
 * Variants for the Trigger component
 */
const triggerVariants = cva(
	cx(
		"group/tab-trigger relative flex cursor-pointer items-center gap-1 whitespace-nowrap py-3 text-sm font-medium text-gray-600",
		"ring-focus-accent outline-hidden",
		"aria-disabled:cursor-default aria-disabled:opacity-50",
		"focus-visible:ring-4",
		// Why slot-scoped: the label span makes a consumer's svg a grandchild, so a
		// bare `[&>svg]` matches nothing. A `[&_svg]` would also size the glyph
		// inside `Tabs.Badge`.
		"[&>[data-slot=tabs-trigger-label]>svg]:shrink-0 [&>[data-slot=tabs-trigger-label]>svg]:size-5",
		"not-aria-disabled:hover:text-gray-900",
	),
	{
		variants: {
			orientation: {
				horizontal: "rounded-tl-md rounded-tr-md",
				vertical: "rounded-bl-md rounded-tl-md pr-3",
			} as const satisfies Record<Orientation, string>,
			appearance: {
				classic: cx(
					"not-aria-disabled:hover:data-state-active:text-strong",
					"data-state-active:text-strong",
				),
				pill: cx(
					"not-aria-disabled:hover:data-state-active:text-strong",
					"not-aria-disabled:hover:data-state-active:bg-neutral-500/15",
					"data-state-active:text-strong",
					"data-state-active:bg-neutral-500/15",
					"rounded-full py-2 px-3",
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
 * path alike. The active-tab decoration is a permanent element sibling, so
 * without the span a bare text label is never a lone child: a browser
 * translation engine reparents that text node, and the removal React runs when
 * the label changes shape or goes away throws. The span is `display: contents`,
 * so the icon, the label, and `Tabs.Badge` stay flex items of the trigger and
 * keep its `gap`. A `[&>svg]` class of your own no longer reaches an icon you
 * pass as a child, because that icon is now a grandchild. Match the part's own
 * variant instead — `[&>[data-slot=tabs-trigger-label]>svg]:size-4`. A `[&_svg]`
 * or a class on the icon loses to the default, which is more specific.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                    | Description                          |
 * | -------------- | ------------------------ | ------------------------------------ |
 * | `data-slot`    | `"tabs-trigger"`         | On the trigger element.              |
 * | `data-slot`    | `"tabs-trigger-label"`   | On the `<span>` wrapping `children`. |
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
	disabled: _disabled,
	ref,
	...props
}: TabsTriggerProps) => {
	const { orientation, appearance } = useTabsState("Tabs.Trigger");
	const disabled = parseBooleanish(_ariaDisabled ?? _disabled);

	const tabsTriggerProps = {
		"aria-disabled": _ariaDisabled ?? _disabled,
		className: cx(triggerVariants({ orientation, appearance }), className),
		disabled,
		...props,
	};

	if (asChild) {
		const singleChild = Children.only(children);
		invariant(
			isValidElement<TabsTriggerProps>(singleChild),
			"When using `asChild`, TabsTrigger must be passed a single child as a JSX tag.",
		);
		const grandchildren = singleChild.props?.children;

		// When disabled, prevent anchor/link children from being clickable by
		// removing their href/to props. `<a>` has no `disabled` attribute and
		// would stay navigable. `pointer-events-none` would also block tooltip
		// interactions, which may be surprising, so it is not the default.
		//
		// Why no `tabIndex` when enabled: Radix rotates `tabIndex` between the
		// triggers so only the active tab is a Tab stop, and a cloned `tabIndex`
		// would win over it and put every tab in the Tab order.
		const cloneProps = disabled ? { href: undefined, to: undefined } : {};

		return (
			<TabsPrimitiveTrigger asChild data-slot="tabs-trigger" {...tabsTriggerProps} ref={ref}>
				{cloneElement(
					disabled ? <button type="button" /> : singleChild,
					cloneProps,
					<>
						<TabsTriggerDecoration />
						{/* Why the label span: decisions/2026-08-04-translation-safe-label-wrappers.md */}
						<span data-slot="tabs-trigger-label" className="contents">
							{grandchildren}
						</span>
					</>,
				)}
			</TabsPrimitiveTrigger>
		);
	}

	return (
		<TabsPrimitiveTrigger data-slot="tabs-trigger" ref={ref} {...tabsTriggerProps}>
			<TabsTriggerDecoration />
			{/* Why the label span: decisions/2026-08-04-translation-safe-label-wrappers.md */}
			<span data-slot="tabs-trigger-label" className="contents">
				{children}
			</span>
		</TabsPrimitiveTrigger>
	);
};

/**
 * A badge to render inside a tab trigger, typically a count or a status indicator.
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
const Badge = ({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) => (
	<span
		data-slot="tabs-badge"
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
 * It renders when that trigger is active.
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
const Content = ({ className, ...props }: ComponentProps<typeof TabsPrimitiveContent>) => (
	<TabsPrimitiveContent
		data-slot="tabs-content"
		className={cx("focus-visible:ring-focus-accent outline-hidden focus-visible:ring-4", className)}
		{...props}
	/>
);

/**
 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs
 *
 * @example
 * Composition:
 * ```
 * Tabs.Root
 * ├── Tabs.List
 * │   └── Tabs.Trigger
 * │       └── Tabs.Badge
 * ├── Tabs.Separator
 * └── Tabs.Content
 * ```
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
const Tabs = {
	/**
	 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
	 * The outermost part; it owns `orientation` and `appearance`. It stamps both as
	 * `data-orientation` and `data-appearance` for the parts below to style against.
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
	 * </Tabs.Root>
	 * ```
	 */
	Root,
	/**
	 * Contains the content associated with each trigger.
	 * It renders when that trigger is active.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/tabs#tabscontent
	 *
	 * @example
	 * ```tsx
	 * <Tabs.Root defaultValue="account">
	 *   <Tabs.List>
	 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
	 *   </Tabs.List>
	 *   <Tabs.Separator />
	 *   <Tabs.Content value="account">
	 *     <p>Make changes to your account here.</p>
	 *   </Tabs.Content>
	 * </Tabs.Root>
	 * ```
	 */
	Content,
	/**
	 * Contains the triggers that are aligned along the edge of the active content.
	 * The list draws no border of its own: compose `Tabs.Separator` after it for
	 * the hairline between the triggers and the content.
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
	 * </Tabs.Root>
	 * ```
	 */
	List,
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
	Separator: TabsSeparator,
	/**
	 * The button that activates its associated content.
	 *
	 * **Structure.** `children` render inside a
	 * `<span data-slot="tabs-trigger-label">`, on the plain path and the `asChild`
	 * path alike. The active-tab decoration is a permanent element sibling, so
	 * without the span a bare text label is never a lone child: a browser
	 * translation engine reparents that text node, and the removal React runs when
	 * the label changes shape or goes away throws. The span is `display: contents`,
	 * so the icon, the label, and `Tabs.Badge` stay flex items of the trigger and
	 * keep its `gap`. A `[&>svg]` class of your own no longer reaches an icon you
	 * pass as a child, because that icon is now a grandchild. Match the part's own
	 * variant instead — `[&>[data-slot=tabs-trigger-label]>svg]:size-4`. A `[&_svg]`
	 * or a class on the icon loses to the default, which is more specific.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value                    | Description                          |
	 * | -------------- | ------------------------ | ------------------------------------ |
	 * | `data-slot`    | `"tabs-trigger"`         | On the trigger element.              |
	 * | `data-slot`    | `"tabs-trigger-label"`   | On the `<span>` wrapping `children`. |
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
	 * </Tabs.Root>
	 * ```
	 */
	Trigger,
	/**
	 * A badge to render inside a tab trigger, typically a count or a status indicator.
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
	 *   </Tabs.List>
	 *   <Tabs.Separator />
	 * </Tabs.Root>
	 * ```
	 */
	Badge,
} as const;

export {
	//
	Tabs,
};
