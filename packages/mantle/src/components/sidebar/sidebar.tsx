import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import { SidebarAccountAvatar } from "./sidebar-account-avatar.js";
import {
	SidebarAccountSwitcherTrigger,
	SidebarSwitchAccountsRadioGroup,
} from "./sidebar-account-switcher.js";
import {
	SidebarProductSwitcherRadioGroup,
	SidebarProductSwitcherTrigger,
} from "./sidebar-product-switcher.js";
import { SidebarUserAvatar } from "./sidebar-user-avatar.js";

/**
 * The root container for a `Sidebar`. Renders a `<nav>` element with the design
 * system's sidebar background, border, and a fixed default width. Owns the
 * vertical column layout of `Sidebar.Header`, `Sidebar.Body`, and
 * `Sidebar.Footer`.
 *
 * For two-column layouts that include an icon rail, place a `Sidebar.Rail`
 * sibling to `Sidebar.Root` inside a flex container the consumer owns.
 *
 * @example
 * ```tsx
 * <Sidebar.Root aria-label="Primary">
 *   <Sidebar.Header>...</Sidebar.Header>
 *   <Sidebar.Body>...</Sidebar.Body>
 *   <Sidebar.Footer>...</Sidebar.Footer>
 * </Sidebar.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"nav">, ComponentPropsWithoutRef<"nav">>(
	({ className, ...props }, ref) => (
		<nav
			ref={ref}
			className={cx(
				"bg-popover border-popover-muted text-strong relative flex h-full w-52 shrink-0 flex-col border-r text-sm",
				className,
			)}
			{...props}
		/>
	),
);
Root.displayName = "Sidebar";

/**
 * The top container of a `Sidebar`. Renders a horizontally-padded row with a
 * bottom border. Typically holds a `Sidebar.AccountSwitcher` or
 * `Sidebar.ProductSwitcher`.
 *
 * @example
 * ```tsx
 * <Sidebar.Header>
 *   <Sidebar.AccountSwitcher ... />
 * </Sidebar.Header>
 * ```
 */
const Header = forwardRef<ComponentRef<"div">, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cx(
				"border-popover-muted flex shrink-0 flex-col gap-2 border-b px-3 py-3",
				className,
			)}
			{...props}
		/>
	),
);
Header.displayName = "SidebarHeader";

/**
 * The middle, scrollable region of a `Sidebar`. This is where per-product
 * navigation lives and where you would render `Sidebar.Section` children. Grows
 * to fill available vertical space and scrolls when its content overflows.
 *
 * @example
 * ```tsx
 * <Sidebar.Body>
 *   <Sidebar.Section>...</Sidebar.Section>
 * </Sidebar.Body>
 * ```
 */
const Body = forwardRef<ComponentRef<"div">, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cx(
				"scrollbar flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-gutter:stable] [&>*:first-child]:mt-1.5",
				className,
			)}
			{...props}
		/>
	),
);
Body.displayName = "SidebarBody";

/**
 * The bottom container of a `Sidebar`. Renders a horizontally-padded section
 * with a top border. Typically used for billing, docs, or support links that
 * persist across products.
 *
 * @example
 * ```tsx
 * <Sidebar.Footer>
 *   <Sidebar.Item asChild level="top">
 *     <a href="/billing">Billing</a>
 *   </Sidebar.Item>
 * </Sidebar.Footer>
 * ```
 */
const Footer = forwardRef<ComponentRef<"div">, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cx("border-popover-muted shrink-0 border-t px-3 py-3", className)}
			{...props}
		/>
	),
);
Footer.displayName = "SidebarFooter";

/**
 * A grouping container for a heading + nav items. Intended as a child of
 * `Sidebar.Body`. Typically composes `Sidebar.SectionTitle` followed by a
 * `Sidebar.Group` of `Sidebar.Item` children.
 *
 * @example
 * ```tsx
 * <Sidebar.Section>
 *   <Sidebar.SectionTitle asChild>
 *     <a href="/endpoints"><GlobeIcon /> Universal Gateway</a>
 *   </Sidebar.SectionTitle>
 *   <Sidebar.Group>
 *     <Sidebar.Item asChild>
 *       <a href="/endpoints">Endpoints</a>
 *     </Sidebar.Item>
 *   </Sidebar.Group>
 * </Sidebar.Section>
 * ```
 */
const Section = forwardRef<ComponentRef<"div">, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cx("pt-0.5", className)} {...props} />
	),
);
Section.displayName = "SidebarSection";

type SectionTitleProps = HTMLAttributes<HTMLHeadingElement> & {
	/**
	 * When `true`, merges title styles onto the immediate child element instead
	 * of rendering an `<h4>`. Useful when the title needs to be a router-aware
	 * `<Link>`.
	 */
	asChild?: boolean;
};

/**
 * The heading of a `Sidebar.Section`. Renders an `<h4>` styled with the
 * top-level item visual (icon slot + label). Pass `asChild` to render the title
 * as a router-aware link instead.
 *
 * @example
 * ```tsx
 * <Sidebar.SectionTitle asChild>
 *   <a href="/endpoints"><GlobeIcon /> Universal Gateway</a>
 * </Sidebar.SectionTitle>
 * ```
 */
const SectionTitle = forwardRef<ComponentRef<"h4">, SectionTitleProps>(
	({ asChild, className, ...props }, ref) => {
		const Component = asChild ? Slot : "h4";
		return (
			<Component
				ref={ref}
				className={cx(
					"text-strong hover:bg-neutral-500/10 ring-focus-accent flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 font-medium transition-none focus:outline-hidden focus-visible:ring-4",
					"[&>svg]:text-muted [&>svg]:size-5 [&>svg]:shrink-0",
					className,
				)}
				{...props}
			/>
		);
	},
);
SectionTitle.displayName = "SidebarSectionTitle";

/**
 * A `<ul>` list container for `Sidebar.Item` children. Pairs with
 * `Sidebar.SectionTitle` inside a `Sidebar.Section`.
 *
 * @example
 * ```tsx
 * <Sidebar.Group>
 *   <Sidebar.Item asChild>
 *     <a href="/endpoints">Endpoints</a>
 *   </Sidebar.Item>
 * </Sidebar.Group>
 * ```
 */
const Group = forwardRef<ComponentRef<"ul">, HTMLAttributes<HTMLUListElement>>(
	({ className, ...props }, ref) => (
		<ul ref={ref} className={cx("mb-2 space-y-px", className)} {...props} />
	),
);
Group.displayName = "SidebarGroup";

const itemVariants = cva(
	[
		"ring-focus-accent group/sidebar-item relative flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 text-left font-medium transition-none focus:outline-hidden focus-visible:ring-4",
		"text-body hover:text-strong hover:bg-neutral-500/10",
		"data-active:bg-neutral-500/15 data-active:text-strong",
		"[&>svg]:text-muted hover:[&>svg]:text-strong data-active:[&>svg]:text-strong [&>svg]:size-5 [&>svg]:shrink-0",
	],
	{
		variants: {
			/**
			 * The visual depth of the item.
			 *
			 * - `top` — top-level row with leading icon and bold weight (used in
			 *   the footer or as a standalone item with no nested children).
			 * - `nested` — indented sub-item used inside a `Sidebar.Group` under
			 *   a `Sidebar.SectionTitle`.
			 */
			level: {
				top: "font-medium",
				// Use a calc width that accounts for the left margin so the
				// row hugs the body's right padding the same way `top` items do.
				// Without this, `w-full + ml-7` overflows the parent by 28px.
				nested: "ml-7 w-[calc(100%-1.75rem)] font-normal",
			},
		},
		defaultVariants: {
			level: "nested",
		},
	},
);

type ItemProps = HTMLAttributes<HTMLLIElement> & {
	/**
	 * The interactive content for this row. Wrap in `Sidebar.Item` to inherit
	 * the row styles, list-item semantics, and active-state hooks.
	 */
	children: ReactNode;
	/**
	 * When `true`, merges the row styles onto the immediate child instead of
	 * rendering a default `<button>`. Use this to compose with router links
	 * (e.g. `<NavLink>`) without giving up the styling.
	 */
	asChild?: boolean;
	/**
	 * When `true`, sets `data-active` and `aria-current="page"` on the rendered
	 * row, applying the active visual state. Consumers control this from their
	 * router (e.g. React Router's `<NavLink>` render-prop).
	 */
	active?: boolean;
} & VariantProps<typeof itemVariants>;

/**
 * A single navigation row inside a `Sidebar`. Renders a `<li>` wrapper with the
 * interactive child styled per the `level` variant. Use `asChild` to compose
 * with a router-aware link or any other element.
 *
 * Active state is fully controlled by the consumer — pass `active` based on
 * your router's current path. Active rows get a `data-active` attribute and
 * `aria-current="page"` automatically.
 *
 * @example
 * ```tsx
 * <Sidebar.Item asChild active={pathname === "/endpoints"}>
 *   <a href="/endpoints">Endpoints</a>
 * </Sidebar.Item>
 * ```
 */
const Item = forwardRef<ComponentRef<"li">, ItemProps>(
	({ active, asChild, children, className, level, ...props }, ref) => {
		const Component = asChild ? Slot : "button";
		return (
			<li ref={ref} className="list-none" {...props}>
				<Component
					className={cx(itemVariants({ level }), className)}
					data-active={active ? "true" : undefined}
					aria-current={active ? "page" : undefined}
				>
					{children}
				</Component>
			</li>
		);
	},
);
Item.displayName = "SidebarItem";

/**
 * A horizontal divider between sections of the sidebar. Useful inside
 * `Sidebar.Body` or `Sidebar.Footer` to break related groups apart.
 *
 * @example
 * ```tsx
 * <Sidebar.Body>
 *   <Sidebar.Section>...</Sidebar.Section>
 *   <Sidebar.Separator />
 *   <Sidebar.Section>...</Sidebar.Section>
 * </Sidebar.Body>
 * ```
 */
const SidebarSeparator = forwardRef<ComponentRef<"hr">, HTMLAttributes<HTMLHRElement>>(
	({ className, ...props }, ref) => (
		<hr
			ref={ref}
			className={cx("border-popover-muted -mx-3 my-2 border-t", className)}
			{...props}
		/>
	),
);
SidebarSeparator.displayName = "SidebarSeparator";

/**
 * The vertical icon rail for a two-column sidebar layout (Linear / VS Code
 * style). Place as a sibling of `Sidebar.Root` inside a consumer-owned flex
 * row container. Contains `Sidebar.RailItem` children for product switching
 * and an optional account/user avatar at the bottom.
 *
 * @example
 * ```tsx
 * <div className="flex h-full">
 *   <Sidebar.Rail>
 *     <Sidebar.RailItem ... />
 *   </Sidebar.Rail>
 *   <Sidebar.Root>...</Sidebar.Root>
 * </div>
 * ```
 */
const Rail = forwardRef<ComponentRef<"nav">, ComponentPropsWithoutRef<"nav">>(
	({ className, ...props }, ref) => (
		<nav
			ref={ref}
			className={cx(
				"bg-popover border-popover-muted text-strong relative flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r py-3",
				className,
			)}
			{...props}
		/>
	),
);
Rail.displayName = "SidebarRail";

const railItemVariants = cva(
	[
		"ring-focus-accent group/sidebar-rail-item relative flex size-10 shrink-0 items-center justify-center rounded-md transition-none focus:outline-hidden focus-visible:ring-4",
		"text-muted hover:text-strong hover:bg-neutral-500/10",
		"data-active:bg-neutral-500/15 data-active:text-strong",
		"[&>svg]:text-muted hover:[&>svg]:text-strong data-active:[&>svg]:text-strong [&>svg]:size-5 [&>svg]:shrink-0",
	],
	{
		variants: {},
	},
);

type RailItemProps = Omit<HTMLAttributes<HTMLButtonElement>, "children"> & {
	/**
	 * The icon for this product. Rendered at 20×20 in the center of the rail
	 * cell. Pass an SVG element (typically a Phosphor icon).
	 */
	icon: ReactNode;
	/**
	 * Accessible label for the rail item. Used as the button's `aria-label`
	 * since the rail is icon-only. Wrap in `Tooltip` for an on-hover label
	 * visualization (use `Tooltip.Trigger asChild` so the tooltip positions
	 * against the button).
	 */
	label: string;
	/**
	 * When `true`, sets `data-active` and `aria-current="page"`. Consumer
	 * controls this from their router or product-switching state.
	 */
	active?: boolean;
	/**
	 * When `true`, merges row styles onto the immediate child instead of
	 * rendering a default `<button>`. Use to compose with a router link.
	 */
	asChild?: boolean;
	/**
	 * Optional click handler for the default `<button>` rendering. Ignored when
	 * `asChild` is `true` — handle interactions on the child element instead.
	 */
	onClick?: () => void;
	/**
	 * The interactive child when `asChild` is `true`.
	 */
	children?: ReactNode;
};

/**
 * A single icon button in the `Sidebar.Rail`. Designed for product switching
 * in a two-column sidebar layout. Renders as a `<button>` by default; use
 * `asChild` to compose with a router-aware link.
 *
 * @example
 * ```tsx
 * <Sidebar.RailItem
 *   icon={<GlobeIcon />}
 *   label="Universal Gateway"
 *   active={currentProduct === "universal-gateway"}
 *   onClick={() => setCurrentProduct("universal-gateway")}
 * />
 * ```
 */
const RailItem = forwardRef<ComponentRef<"button">, RailItemProps>(
	({ active, asChild, children, className, icon, label, onClick, ...props }, ref) => {
		const interactiveClassName = cx(railItemVariants(), className);
		const interactiveProps = {
			"data-active": active ? "true" : undefined,
			"aria-current": active ? ("page" as const) : undefined,
			"aria-label": label,
		};

		if (asChild) {
			return (
				<Slot ref={ref} className={interactiveClassName} {...interactiveProps} {...props}>
					{children}
				</Slot>
			);
		}

		return (
			<button
				ref={ref}
				type="button"
				onClick={onClick}
				className={interactiveClassName}
				{...interactiveProps}
				{...props}
			>
				{icon}
			</button>
		);
	},
);
RailItem.displayName = "SidebarRailItem";

/**
 * A composable sidebar primitive for product navigation, account switching,
 * and user actions. Use `Sidebar.Root` for the standard single-column layout,
 * and add `Sidebar.Rail` as a sibling for a two-column icon-rail layout.
 *
 * The component is routing-agnostic. Compose with your router by passing
 * `asChild` on `Sidebar.Item`, `Sidebar.SectionTitle`, and `Sidebar.RailItem`.
 *
 * @example
 * ```tsx
 * // Single column
 * <Sidebar.Root aria-label="Primary">
 *   <Sidebar.Header>
 *     <Sidebar.AccountSwitcher ... />
 *   </Sidebar.Header>
 *   <Sidebar.Body>
 *     <Sidebar.Section>
 *       <Sidebar.SectionTitle>Universal Gateway</Sidebar.SectionTitle>
 *       <Sidebar.Group>
 *         <Sidebar.Item asChild active>
 *           <a href="/endpoints">Endpoints</a>
 *         </Sidebar.Item>
 *       </Sidebar.Group>
 *     </Sidebar.Section>
 *   </Sidebar.Body>
 * </Sidebar.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Two column with rail
 * <div className="flex h-full">
 *   <Sidebar.Rail>
 *     <Sidebar.RailItem
 *       icon={<GlobeIcon />}
 *       label="Universal Gateway"
 *       active
 *     />
 *   </Sidebar.Rail>
 *   <Sidebar.Root>
 *     <Sidebar.Header>...</Sidebar.Header>
 *     <Sidebar.Body>...</Sidebar.Body>
 *   </Sidebar.Root>
 * </div>
 * ```
 */
const Sidebar = {
	/**
	 * The root `<nav>` container for the sidebar's main column.
	 */
	Root,
	/**
	 * The top container, typically holding the account/product switcher.
	 */
	Header,
	/**
	 * The scrollable middle region holding nav `Sidebar.Section` children.
	 */
	Body,
	/**
	 * The bottom container for persistent footer links (billing, docs, etc.).
	 */
	Footer,
	/**
	 * A grouping container for a heading + nav items inside `Sidebar.Body`.
	 */
	Section,
	/**
	 * The heading of a `Sidebar.Section`. Renders an `<h4>` by default; pass
	 * `asChild` to render as a router link instead.
	 */
	SectionTitle,
	/**
	 * A `<ul>` list container for `Sidebar.Item` children.
	 */
	Group,
	/**
	 * A single navigation row. Pass `asChild` to compose with a router link
	 * and `active` to apply the selected visual state.
	 */
	Item,
	/**
	 * A horizontal divider between sections.
	 */
	Separator: SidebarSeparator,
	/**
	 * The vertical icon rail for two-column sidebar layouts.
	 */
	Rail,
	/**
	 * A single icon button in the `Sidebar.Rail` for product switching.
	 */
	RailItem,
	/**
	 * A small rounded-square avatar for an account (workspace). The background
	 * color is derived deterministically from the account ID.
	 */
	AccountAvatar: SidebarAccountAvatar,
	/**
	 * A circular avatar for the currently signed-in user. Renders a profile
	 * picture when `src` is provided; otherwise shows a neutral silhouette.
	 */
	UserAvatar: SidebarUserAvatar,
	/**
	 * The visual trigger row for an account switcher. Use as a
	 * `DropdownMenu.Trigger` via `asChild`.
	 */
	AccountSwitcherTrigger: SidebarAccountSwitcherTrigger,
	/**
	 * A pre-styled radio group of accounts for use inside a
	 * `DropdownMenu.SubContent`. Used to switch the active account.
	 */
	SwitchAccountsRadioGroup: SidebarSwitchAccountsRadioGroup,
	/**
	 * The visual trigger row for an in-header product switcher. Use as a
	 * `DropdownMenu.Trigger` via `asChild`.
	 */
	ProductSwitcherTrigger: SidebarProductSwitcherTrigger,
	/**
	 * A pre-styled radio group of products for use inside a `DropdownMenu.Content`.
	 */
	ProductSwitcherRadioGroup: SidebarProductSwitcherRadioGroup,
} as const;

export {
	//,
	Sidebar,
};
