import {
	Content as TabsPrimitiveContent,
	List as TabsPrimitiveList,
	Root as TabsPrimitiveRoot,
	Trigger as TabsPrimitiveTrigger,
} from "@radix-ui/react-tabs";
import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ComponentRef, HTMLAttributes } from "react";
import {
	Children,
	cloneElement,
	createContext,
	forwardRef,
	isValidElement,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import invariant from "tiny-invariant";
import { parseBooleanish } from "../../types/booleanish.js";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { ScrollBehavior } from "../../hooks/use-scroll-behavior.js";

type Orientation = "horizontal" | "vertical";
type Appearance = "classic" | "pill";

type TabsStateContextValue = {
	orientation: Orientation;
	appearance: Appearance;
};

const TabsStateContext = createContext<TabsStateContextValue>({
	orientation: "horizontal",
	appearance: "classic",
});

/**
 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
 * The root component that provides context for all tab components.
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
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 *   <Tabs.Content value="password">
 *     <p>Change your password here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const Root = forwardRef<
	ComponentRef<typeof TabsPrimitiveRoot>,
	ComponentPropsWithoutRef<typeof TabsPrimitiveRoot> & {
		/**
		 * The appearance of the tabs. Classic appearance shows the tab
		 * list with an underline; pill appearance shows each tab as a pill.
		 * @default "classic"
		 */
		appearance?: "classic" | "pill";
	}
>(({ className, children, orientation = "horizontal", appearance = "classic", ...props }, ref) => {
	const contextValue = useMemo(() => ({ orientation, appearance }), [orientation, appearance]);
	return (
		<TabsPrimitiveRoot
			data-slot="tabs"
			data-appearance={appearance}
			className={cx(
				"flex gap-4",
				orientation === "horizontal" ? "flex-col" : "flex-row",
				className,
			)}
			orientation={orientation}
			ref={ref}
			{...props}
		>
			<TabsStateContext.Provider value={contextValue}>{children}</TabsStateContext.Provider>
		</TabsPrimitiveRoot>
	);
});
Root.displayName = "Tabs";

/**
 * The horizontal classic tablist's opt-in bottom border, activated only when
 * a `Tabs.ListBorder` marker is composed inside the list — a pure-CSS
 * `:has()` check, so it is SSR-safe with no effects or context reads.
 *
 * Painted as a content-box background on the list instead of `border-bottom`
 * or an absolutely-positioned child because:
 * - the tablist is a scroll container with `px-1 -mx-1` breathing room for
 *   focus rings: a real border paints across the border box, overrunning the
 *   tab triggers by that 4px on each side, and
 * - absolutely-positioned children of a scroll container anchor to the scroll
 *   origin, so a positioned rule scrolls away with the triggers on overflow.
 *
 * The content box excludes the padding, so the rule terminates exactly at the
 * first/last trigger, stays put while triggers scroll beneath it, and fades
 * with them under the scroll-fade mask. `pb-px` reserves the 1px row below
 * the triggers (and below the active trigger's decoration) that the rule
 * occupies; the `calc(100% + 1px)` y-position drops the rule out of the
 * content box into that row.
 */
const listBottomRule = cx(
	"has-data-[slot=tabs-list-border]:pb-px",
	"has-data-[slot=tabs-list-border]:bg-origin-content",
	"has-data-[slot=tabs-list-border]:bg-no-repeat",
	"has-data-[slot=tabs-list-border]:bg-size-[100%_1px]",
	"has-data-[slot=tabs-list-border]:bg-position-[0_calc(100%+1px)]",
	"has-data-[slot=tabs-list-border]:bg-[image:linear-gradient(var(--color-separator),var(--color-separator))]",
);

/**
 * Variants for the List component
 */
const listVariants = cva("flex", {
	variants: {
		orientation: {
			horizontal:
				"scroll-fade-x flex-row items-center overflow-x-auto overscroll-x-none min-w-0 pt-1 -mt-1 px-1 -mx-1",
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
			className: "w-full gap-1 pb-1 -mb-1",
		},
		{
			orientation: "horizontal",
			appearance: "classic",
			// w-fit (capped at the container) keeps the bottom rule from running past
			// the tab triggers when they don't fill the container; see listBottomRule
			// for why the rule is a background rather than a border-bottom.
			className: cx("w-fit max-w-full gap-6", listBottomRule),
		},
		{
			orientation: "vertical",
			appearance: "classic",
			className: "border-r border-separator",
		},
	],
});

/**
 * Contains the triggers that are aligned along the edge of the active content.
 * The container for tab triggers that provides the visual layout for tab navigation.
 *
 * Compose a `Tabs.ListBorder` child to draw a 1px bottom border in the
 * horizontal classic appearance — it terminates at the ends of the tab
 * triggers, in the `separator` color token. Omit `Tabs.ListBorder` to render
 * no border; the pill appearance never draws one.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabslist
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.ListBorder />
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const List = forwardRef<
	ComponentRef<typeof TabsPrimitiveList>,
	ComponentPropsWithoutRef<typeof TabsPrimitiveList>
>(({ className, ...props }, ref) => {
	const { orientation, appearance } = useContext(TabsStateContext);
	const scrollRef = useRef<ComponentRef<typeof TabsPrimitiveList>>(null);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element || orientation !== "horizontal") {
			return;
		}

		const abortController = new AbortController();

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
			{ signal: abortController.signal },
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
			ref={composeRefs(scrollRef, ref)}
			{...props}
		/>
	);
});
List.displayName = "TabsList";

/**
 * Opts the tab list into its bottom border. Render it as a child of
 * `Tabs.List`: the horizontal classic list then draws a 1px border in the
 * `separator` color token that terminates at the ends of the tab triggers.
 * Omit it to render no border. The pill appearance never draws a border, so
 * it is always safe to compose.
 *
 * The marker itself is an inert, hidden `<span>`; the border is painted by
 * `Tabs.List` via a CSS `:has()` check, so it is SSR-safe and requires no
 * client-side effects or context reads.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs#tabslistborder
 *
 * @example
 * ```tsx
 * <Tabs.List>
 *   <Tabs.ListBorder />
 *   <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *   <Tabs.Trigger value="password">Password</Tabs.Trigger>
 * </Tabs.List>
 * ```
 */
const ListBorder = () => <span aria-hidden data-slot="tabs-list-border" hidden />;
ListBorder.displayName = "TabsListBorder";

type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitiveTrigger>;

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
	const { orientation, appearance } = useContext(TabsStateContext);

	return (
		<span aria-hidden className={clsx(triggerDecorationVariants({ orientation, appearance }))} />
	);
};
TabsTriggerDecoration.displayName = "TabsTriggerDecoration";

/**
 * Variants for the Trigger component
 */
const triggerVariants = cva(
	cx(
		"group/tab-trigger relative flex cursor-pointer items-center gap-1 whitespace-nowrap py-3 text-sm font-medium text-gray-600",
		"ring-focus-accent outline-hidden",
		"aria-disabled:cursor-default aria-disabled:opacity-50",
		"focus-visible:ring-4",
		"[&>svg]:shrink-0 [&>svg]:size-5",
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
 * A clickable tab trigger that switches between different tab content panels.
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
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const Trigger = forwardRef<ComponentRef<typeof TabsPrimitiveTrigger>, TabsTriggerProps>(
	(
		{
			"aria-disabled": _ariaDisabled,
			asChild = false,
			children,
			className,
			disabled: _disabled,
			...props
		},
		ref,
	) => {
		const { orientation, appearance } = useContext(TabsStateContext);
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

			const cloneProps = disabled
				? /**
					 * When disabled, prevent anchor/link children from being clickable by
					 * removing their href/to props!
					 * This is necessary because `<a>` doesn't support the `disabled`
					 * attribute and would be navigable. We could use `pointer-events-none`
					 * instead, but don't by default because it would also prevent tooltip
					 * interactions, which may be surprising.
					 */
					{ href: undefined, to: undefined }
				: /**
					 * when NOT disabled, allow keyboard navigation to the trigger,
					 * even for asChild anchors/links
					 */
					{ tabIndex: 0 };

			return (
				<TabsPrimitiveTrigger asChild data-slot="tabs-trigger" {...tabsTriggerProps} ref={ref}>
					{cloneElement(
						disabled ? <button type="button" /> : singleChild,
						cloneProps,
						<>
							<TabsTriggerDecoration />
							{grandchildren}
						</>,
					)}
				</TabsPrimitiveTrigger>
			);
		}

		return (
			<TabsPrimitiveTrigger data-slot="tabs-trigger" ref={ref} {...tabsTriggerProps}>
				<TabsTriggerDecoration />
				{children}
			</TabsPrimitiveTrigger>
		);
	},
);
Trigger.displayName = "TabsTrigger";

/**
 * A badge component that can be used inside tab triggers to display additional information.
 * Typically used to show counts or status indicators within tab headers.
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
Badge.displayName = "TabBadge";

/**
 * Contains the content associated with each trigger.
 * The content panel that displays when its corresponding tab trigger is active.
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
 *   <Tabs.Content value="account">
 *     <p>Make changes to your account here.</p>
 *   </Tabs.Content>
 *   <Tabs.Content value="password">
 *     <p>Change your password here.</p>
 *   </Tabs.Content>
 * </Tabs.Root>
 * ```
 */
const Content = forwardRef<
	ComponentRef<typeof TabsPrimitiveContent>,
	ComponentPropsWithoutRef<typeof TabsPrimitiveContent>
>(({ className, ...props }, ref) => (
	<TabsPrimitiveContent
		ref={ref}
		data-slot="tabs-content"
		className={cx("focus-visible:ring-focus-accent outline-hidden focus-visible:ring-4", className)}
		{...props}
	/>
));
Content.displayName = "TabsContent";

/**
 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
 * The root component that provides context for all tab components.
 *
 * @see https://mantle.ngrok.com/components/navigation/tabs
 *
 * @example
 * Composition:
 * ```
 * Tabs.Root
 * ├── Tabs.List
 * │   ├── Tabs.ListBorder
 * │   └── Tabs.Trigger
 * │       └── Tabs.Badge
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
	 * The root container of the tabs component that provides context for all tab components.
	 * A set of layered sections of content—known as tab panels—that are displayed one at a time.
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
	 *   <Tabs.Content value="account">
	 *     <p>Make changes to your account here.</p>
	 *   </Tabs.Content>
	 * </Tabs.Root>
	 * ```
	 */
	Root,
	/**
	 * Contains the content associated with each trigger.
	 * The content panel that displays when its corresponding tab trigger is active.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/tabs#tabscontent
	 *
	 * @example
	 * ```tsx
	 * <Tabs.Root defaultValue="account">
	 *   <Tabs.List>
	 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
	 *   </Tabs.List>
	 *   <Tabs.Content value="account">
	 *     <p>Make changes to your account here.</p>
	 *   </Tabs.Content>
	 * </Tabs.Root>
	 * ```
	 */
	Content,
	/**
	 * Contains the triggers that are aligned along the edge of the active content.
	 * The container for tab triggers that provides the visual layout for tab navigation.
	 *
	 * Compose a `Tabs.ListBorder` child to draw a 1px bottom border in the
	 * horizontal classic appearance; omit it to render no border.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/tabs#tabslist
	 *
	 * @example
	 * ```tsx
	 * <Tabs.Root defaultValue="account">
	 *   <Tabs.List>
	 *     <Tabs.ListBorder />
	 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
	 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
	 *   </Tabs.List>
	 * </Tabs.Root>
	 * ```
	 */
	List,
	/**
	 * Opts the tab list into its bottom border. Render it as a child of
	 * `Tabs.List`: the horizontal classic list then draws a 1px border in the
	 * `separator` color token that terminates at the ends of the tab triggers.
	 * Omit it to render no border. The pill appearance never draws a border,
	 * so it is always safe to compose.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/tabs#tabslistborder
	 *
	 * @example
	 * ```tsx
	 * <Tabs.List>
	 *   <Tabs.ListBorder />
	 *   <Tabs.Trigger value="account">Account</Tabs.Trigger>
	 *   <Tabs.Trigger value="password">Password</Tabs.Trigger>
	 * </Tabs.List>
	 * ```
	 */
	ListBorder,
	/**
	 * The button that activates its associated content.
	 * A clickable tab trigger that switches between different tab content panels.
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
	 * </Tabs.Root>
	 * ```
	 */
	Trigger,
	/**
	 * A badge component that can be used inside tab triggers to display additional information.
	 * Typically used to show counts or status indicators within tab headers.
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
	 * </Tabs.Root>
	 * ```
	 */
	Badge,
} as const;

export {
	//
	Tabs,
};
