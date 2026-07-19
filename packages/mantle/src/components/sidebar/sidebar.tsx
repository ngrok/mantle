"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/SidebarSimple";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps, ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsBelowBreakpoint } from "../../hooks/use-breakpoint.js";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { IconButtonProps } from "../button/icon-button.js";
import { IconButton } from "../button/icon-button.js";
import { Separator } from "../separator/separator.js";
import { Sheet } from "../sheet/index.js";
import { Slot } from "../slot/index.js";

/**
 * The breakpoints below which `Sidebar.Nav` swaps from the inline desktop
 * panel to the mobile `Sheet` presentation. Kept to a closed set so the CSS
 * visibility classes and the `useIsBelowBreakpoint` media query stay in
 * lockstep (Tailwind cannot see interpolated class names).
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root mobileBreakpoint="md">…</Sidebar.Root>
 * ```
 */
type SidebarMobileBreakpoint = "sm" | "md" | "lg";

/**
 * Maps each supported `mobileBreakpoint` to the static visibility classes for
 * the desktop panel — hidden below the breakpoint (where the mobile `Sheet`
 * takes over) and shown at or above it. A complete `Record` (not cva) so
 * adding a breakpoint without its classes is a compile error.
 */
const navVisibilityClassName: Record<SidebarMobileBreakpoint, string> = {
	sm: "hidden sm:block",
	md: "hidden md:block",
	lg: "hidden lg:block",
};

/**
 * The state and actions shared by every part under a `Sidebar.Root`, returned
 * by {@link useSidebar}. Use it to build custom triggers, keyboard shortcuts,
 * or close-on-navigate behavior.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * function CollapseSidebarButton() {
 *   const { open, toggle } = useSidebar();
 *   return (
 *     <button type="button" onClick={toggle}>
 *       {open ? "Collapse" : "Expand"} sidebar
 *     </button>
 *   );
 * }
 * ```
 */
type SidebarState = {
	/**
	 * Whether the desktop sidebar is expanded. Mirrored as
	 * `data-state="expanded" | "collapsed"` on `Sidebar.Nav`.
	 */
	open: boolean;
	/**
	 * Set the desktop expanded state. Calls `onOpenChange` and, when
	 * uncontrolled, updates the internal state.
	 */
	setOpen: (open: boolean) => void;
	/**
	 * Whether the mobile sheet is open. Only meaningful when `isMobile`.
	 */
	openMobile: boolean;
	/**
	 * Set the mobile sheet open state. Calls `onOpenMobileChange` and, when
	 * uncontrolled, updates the internal state. Use it to close the sheet on
	 * navigation.
	 */
	setOpenMobile: (open: boolean) => void;
	/**
	 * `true` when the viewport is below `mobileBreakpoint`. `false` during SSR
	 * and the hydration render (desktop-first).
	 */
	isMobile: boolean;
	/**
	 * The breakpoint below which the sidebar renders as a mobile sheet.
	 */
	mobileBreakpoint: SidebarMobileBreakpoint;
	/**
	 * Toggle the sidebar: the mobile sheet when `isMobile`, the desktop
	 * expanded state otherwise. This is what `Sidebar.Trigger` calls.
	 */
	toggle: () => void;
	/**
	 * The generated id of the sidebar's `<nav>` landmark. `Sidebar.Trigger`
	 * references it via `aria-controls`; reuse it when building custom
	 * triggers.
	 */
	navId: string;
};

const SidebarContext = createContext<SidebarState | null>(null);

/**
 * Read the nearest `Sidebar.Root` state. Throws when called outside a
 * `Sidebar.Root` so misuse fails loudly. Use it to build custom triggers,
 * a keyboard shortcut, or close-on-navigate behavior.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * function CloseSidebarOnNavigate() {
 *   const { setOpenMobile } = useSidebar();
 *   const location = useLocation();
 *   useEffect(() => {
 *     setOpenMobile(false);
 *   }, [location.pathname, setOpenMobile]);
 *   return null;
 * }
 * ```
 */
function useSidebar(): SidebarState {
	const context = useContext(SidebarContext);
	invariant(context, "useSidebar must be used within Sidebar.Root.");
	return context;
}

/**
 * Read the nearest {@link SidebarContext} for an internal part. Throws with a
 * part-specific message when rendered outside `Sidebar.Root`.
 */
function useSidebarContext(part: string): SidebarState {
	const context = useContext(SidebarContext);
	invariant(context, `Sidebar.${part} must be rendered inside Sidebar.Root.`);
	return context;
}

type SidebarRootProps = {
	children?: ReactNode;
	/**
	 * The initial desktop expanded state for the uncontrolled case.
	 *
	 * @default true
	 */
	defaultOpen?: boolean;
	/**
	 * Controlled desktop expanded state. Pair with `onOpenChange`.
	 */
	open?: boolean;
	/**
	 * Called with the next desktop expanded state whenever it changes.
	 */
	onOpenChange?: (open: boolean) => void;
	/**
	 * Controlled mobile sheet open state. Pair with `onOpenMobileChange`.
	 */
	openMobile?: boolean;
	/**
	 * Called with the next mobile sheet open state whenever it changes.
	 */
	onOpenMobileChange?: (open: boolean) => void;
	/**
	 * The breakpoint below which `Sidebar.Nav` renders as a mobile `Sheet`
	 * instead of the inline desktop panel.
	 *
	 * @default "lg"
	 */
	mobileBreakpoint?: SidebarMobileBreakpoint;
	/**
	 * Toggle the sidebar with `⌘B` (macOS) / `Ctrl+B` (Windows/Linux). The
	 * shortcut requires exactly the platform modifier + `b` — combinations with
	 * `Shift`/`Alt` (e.g. the browser's own `⌘⇧B`) are left alone. Set `false`
	 * to opt out, e.g. when the app embeds a rich-text editor where `⌘B` means
	 * bold.
	 *
	 * @default true
	 */
	keyboardShortcut?: boolean;
};

/**
 * The key that toggles the sidebar together with the platform modifier
 * (`⌘` on macOS, `Ctrl` elsewhere) — shadcn-compatible.
 */
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/**
 * The state owner for a sidebar. Renders no DOM of its own (like
 * `Tooltip.Root`) — it provides the expanded/collapsed and mobile-sheet state
 * to every part below it, so `Sidebar.Trigger` can live anywhere in the tree
 * (for example inside an `AppLayout.Header`) without coupling the app shell
 * to the sidebar.
 *
 * Render exactly one `Sidebar.Nav` per `Sidebar.Root`. Nested roots shadow
 * the outer sidebar for everything below them.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>…</Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>…</Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <main>
 *     <Sidebar.Trigger />
 *   </main>
 * </Sidebar.Root>
 * ```
 */
const Root = ({
	children,
	defaultOpen = true,
	keyboardShortcut = true,
	mobileBreakpoint = "lg",
	onOpenChange,
	onOpenMobileChange,
	open: openProp,
	openMobile: openMobileProp,
}: SidebarRootProps) => {
	const isMobile = useIsBelowBreakpoint(mobileBreakpoint);
	const navId = useId();

	const isOpenControlled = openProp != null;
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const open = isOpenControlled ? openProp : internalOpen;
	const setOpen = useCallback(
		(next: boolean) => {
			if (!isOpenControlled) {
				setInternalOpen(next);
			}
			onOpenChange?.(next);
		},
		[isOpenControlled, onOpenChange],
	);

	const isOpenMobileControlled = openMobileProp != null;
	const [internalOpenMobile, setInternalOpenMobile] = useState(false);
	const openMobile = isOpenMobileControlled ? openMobileProp : internalOpenMobile;
	const setOpenMobile = useCallback(
		(next: boolean) => {
			if (!isOpenMobileControlled) {
				setInternalOpenMobile(next);
			}
			onOpenMobileChange?.(next);
		},
		[isOpenMobileControlled, onOpenMobileChange],
	);

	// Crossing up over the breakpoint unmounts the sheet without closing it;
	// clear the stale flag so narrowing the window later doesn't pop the sheet
	// back open without user action. Only a true mobile→desktop transition may
	// reset — a bare state check would fire on mount and clobber a controlled
	// `openMobile` during SSR hydration (isMobile is desktop-first until the
	// media query snapshot corrects).
	const wasMobile = useRef(isMobile);
	useEffect(() => {
		const crossedToDesktop = wasMobile.current && !isMobile;
		wasMobile.current = isMobile;
		if (crossedToDesktop && openMobile) {
			setOpenMobile(false);
		}
	}, [isMobile, openMobile, setOpenMobile]);

	const toggle = useCallback(() => {
		if (isMobile) {
			setOpenMobile(!openMobile);
		} else {
			setOpen(!open);
		}
	}, [isMobile, open, openMobile, setOpen, setOpenMobile]);

	// ⌘B / Ctrl+B toggles the sidebar (shadcn-compatible). Exact-modifier
	// match: Shift/Alt combinations (e.g. the browser's own ⌘⇧B) pass through.
	useEffect(() => {
		if (!keyboardShortcut) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			const hasPlatformModifier = event.metaKey || event.ctrlKey;
			// toLowerCase: with Caps Lock on, browsers report key "B" with
			// shiftKey false — the shortcut must not silently die there.
			if (
				event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
				hasPlatformModifier &&
				!event.altKey &&
				!event.shiftKey
			) {
				event.preventDefault();
				toggle();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [keyboardShortcut, toggle]);

	const contextValue = useMemo<SidebarState>(
		() => ({
			isMobile,
			mobileBreakpoint,
			navId,
			open,
			openMobile,
			setOpen,
			setOpenMobile,
			toggle,
		}),
		[isMobile, mobileBreakpoint, navId, open, openMobile, setOpen, setOpenMobile, toggle],
	);

	return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
};
Root.displayName = "Sidebar";

type SidebarNavProps = ComponentProps<"div"> & WithDataSlot;

// Why no `asChild`: Nav renders a fixed two-element structure on desktop (a
// width animator clipping the `<nav>`) and a `Sheet` on mobile — there
// is no single default element a Slot swap could coherently replace.
/**
 * The sidebar panel. On viewports at or above the root's `mobileBreakpoint`
 * it renders inline (in normal flow, so it composes under an
 * `AppLayout.Notice` banner) and collapses by animating its width down to a
 * skinny icon rail (`--sidebar-width-icon`): group labels fade out in place
 * and each row becomes a square chip around its leading icon, but everything
 * keeps its expanded position and stays in the tab order and the
 * accessibility tree. Below the breakpoint it renders inside a mantle
 * `Sheet` on the left.
 *
 * `className`, `style`, `ref`, and rest props land on the panel surface in
 * both presentations (the desktop animator / the mobile `Sheet.Content`), so
 * the width variables work anywhere:
 * `className="[--sidebar-width:20rem] [--sidebar-width-mobile:20rem]"`.
 * `aria-label` (default `"Main"`) is forwarded to the inner `<nav>` landmark.
 *
 * **CSS variables (public API):**
 * - `--sidebar-width` — expanded desktop width. Default `16rem`.
 * - `--sidebar-width-mobile` — mobile sheet width. Default `18rem`.
 * - `--sidebar-width-icon` — collapsed rail width. Default `3.25rem`.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>…</Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>…</Sidebar.Footer>
 *   </Sidebar.Nav>
 * </Sidebar.Root>
 * ```
 */
const Nav = ({
	"aria-label": ariaLabelProp,
	"aria-labelledby": ariaLabelledBy,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarNavProps) => {
	const { isMobile, mobileBreakpoint, navId, open, openMobile, setOpenMobile } =
		useSidebarContext("Nav");
	const isHydrated = useIsHydrated();
	const ariaLabel = ariaLabelProp ?? (ariaLabelledBy == null ? "Main" : undefined);

	if (isMobile) {
		return (
			<Sheet.Root open={openMobile} onOpenChange={setOpenMobile}>
				<Sheet.Content
					side="left"
					preferredWidth="sm:max-w-[var(--sidebar-width-mobile,18rem)]"
					data-slot={joinDataSlot(dataSlot, "sidebar-nav")}
					data-mobile=""
					// A consumer aria-labelledby names the dialog too, keeping the
					// sheet and the nav consistently named. Spread conditionally:
					// an explicit undefined would override the Sheet's internal
					// Title wiring and leave the dialog unnamed.
					{...(ariaLabelledBy == null ? null : { "aria-labelledby": ariaLabelledBy })}
					className={cx("bg-base w-[var(--sidebar-width-mobile,18rem)] max-w-full p-0", className)}
					{...props}
				>
					{/* The dialog's accessible name follows the nav's, so overriding
					    aria-label (e.g. for localization) renames the sheet too. The
					    "Sidebar" fallback only applies while aria-labelledby (which
					    names the dialog directly, above) is unset. */}
					<Sheet.Title className="sr-only">{ariaLabel ?? "Sidebar"}</Sheet.Title>
					<nav
						id={navId}
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledBy}
						className="flex h-full w-full min-w-0 flex-col text-sm"
					>
						{children}
					</nav>
				</Sheet.Content>
			</Sheet.Root>
		);
	}

	return (
		<div
			data-slot={joinDataSlot(dataSlot, "sidebar-nav")}
			data-state={open ? "expanded" : "collapsed"}
			// data-hydrated is the CSS-side twin of the isHydrated gates below,
			// for descendant parts (e.g. GroupLabel) whose collapse transitions
			// must also snap instead of animating on an SSR state correction.
			data-hydrated={isHydrated ? "" : undefined}
			className={cx(
				// bg lives on this surface (not the inner nav) so consumer
				// className overrides like `bg-card` take effect on desktop too.
				"group/sidebar-nav bg-base relative h-full w-[var(--sidebar-width,16rem)] shrink-0 overflow-hidden",
				// collapsing animates the width down to the skinny icon rail; the
				// panel content stays interactive and in the accessibility tree.
				"data-[state=collapsed]:w-[var(--sidebar-width-icon,3.25rem)]",
				navVisibilityClassName[mobileBreakpoint],
				// Gate the transition on hydration so an SSR state correction
				// (e.g. persisted-collapsed applied by a controlled `open`) snaps
				// instead of animating shut on page load.
				isHydrated && ["transition-[width] duration-200 ease-linear motion-reduce:transition-none"],
				className,
			)}
			{...props}
		>
			<nav
				id={navId}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				// w-full tracks the animating panel width so the rows clip in
				// place during the collapse.
				className="absolute inset-y-0 left-0 flex w-full min-w-0 flex-col text-sm"
			>
				{children}
			</nav>
		</div>
	);
};
Nav.displayName = "SidebarNav";

/**
 * The props for `Sidebar.Trigger`. `IconButton`'s props, except the parts the
 * trigger owns: `asChild` and `children` are removed (the trigger renders
 * only its icon and sr-only label — build custom triggers with `useSidebar`
 * instead), and `appearance`, `icon`, `intent`, and `label` become optional
 * with sidebar defaults.
 */
type SidebarTriggerProps = Omit<
	IconButtonProps,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label"
> &
	WithDataSlot & {
		/**
		 * The visual style of the trigger `IconButton`.
		 *
		 * @default "ghost"
		 */
		appearance?: IconButtonProps["appearance"];
		/**
		 * The icon rendered inside the trigger.
		 *
		 * @default <SidebarSimpleIcon />
		 */
		icon?: ReactNode;
		/**
		 * The color intent of the trigger `IconButton`.
		 *
		 * @default "neutral"
		 */
		intent?: IconButtonProps["intent"];
		/**
		 * The accessible name for the trigger. Visually hidden but announced to
		 * assistive technology. Override it for localization.
		 *
		 * @default "Toggle Sidebar"
		 */
		label?: string;
	};

// Module-scope default so the trigger icon keeps referential equality across
// renders (a JSX default prop value would be re-created every render).
const defaultTriggerIcon = <SidebarSimpleIcon />;

// Why no `asChild`: Trigger renders a fully-wired mantle IconButton (icon +
// sr-only label + aria-expanded/aria-controls); custom triggers compose the
// same behavior from `useSidebar()` instead of slot-swapping this one.
/**
 * The button that toggles the sidebar: the mobile sheet below the root's
 * `mobileBreakpoint`, the desktop expanded state otherwise. Renders a ghost
 * neutral `IconButton` with `aria-expanded` and `aria-controls` wired to the
 * sidebar's `<nav>`. Place it in your app shell's header (for example
 * `AppLayout.Header`) — it must stay visible at every breakpoint where the
 * sidebar can collapse, or users have no way to reopen it.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 *
 * @example
 * Placement within an `AppLayout` shell:
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *   <AppLayout.Inset>
 *     <AppLayout.Content>
 *       <AppLayout.Header>
 *         <Sidebar.Trigger />
 *       </AppLayout.Header>
 *       …
 *     </AppLayout.Content>
 *   </AppLayout.Inset>
 * </Sidebar.Root>
 * ```
 */
const Trigger = ({
	appearance = "ghost",
	"data-slot": dataSlot,
	icon = defaultTriggerIcon,
	intent = "neutral",
	label = "Toggle Sidebar",
	onClick,
	...props
}: SidebarTriggerProps) => {
	const { isMobile, navId, open, openMobile, toggle } = useSidebarContext("Trigger");
	const expanded = isMobile ? openMobile : open;

	return (
		<IconButton
			appearance={appearance}
			aria-controls={navId}
			aria-expanded={expanded}
			data-slot={joinDataSlot(dataSlot, "sidebar-trigger")}
			data-state={expanded ? "expanded" : "collapsed"}
			icon={icon}
			intent={intent}
			label={label}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					toggle();
				}
			}}
			{...props}
		/>
	);
};
Trigger.displayName = "SidebarTrigger";

/**
 * The props for `Sidebar.Rail`. `button` props except `children` (the rail
 * renders no content — it is a click strip along the sidebar's edge) and
 * `type` (always `"button"` — the rail never submits), with a `label` for its
 * accessible name and native tooltip.
 */
type SidebarRailProps = Omit<ComponentProps<"button">, "children" | "type"> &
	WithDataSlot & {
		/**
		 * The accessible name and native `title` tooltip for the rail. Override
		 * it for localization.
		 *
		 * @default "Toggle Sidebar"
		 */
		label?: string;
	};

// Why no `asChild`: like Trigger, the rail is a fully-wired control (aria
// wiring, hit strip, hover affordance); custom edge toggles compose the same
// behavior from `useSidebar()` instead of slot-swapping this one.
/**
 * A click strip along the sidebar's edge that toggles the desktop sidebar.
 * Render it as the **immediate next sibling of `Sidebar.Nav`**: it is a
 * zero-width in-flow flex item, so it always sits exactly on the boundary
 * between the sidebar and the content — expanded or collapsed to the icon
 * rail — with a 12px hit strip extending over the content gutter and a
 * hairline that appears on hover.
 *
 * The rail is a pointer affordance and is removed from the tab order
 * (`tabIndex={-1}`): keyboard users toggle with `Sidebar.Trigger` or `⌘B`.
 * Below the root's `mobileBreakpoint` it is hidden entirely — the mobile
 * sheet has its own close affordances.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <Sidebar.Rail />
 *       <AppLayout.Inset>…</AppLayout.Inset>
 *     </AppLayout.Body>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Rail = ({
	className,
	"data-slot": dataSlot,
	label = "Toggle Sidebar",
	onClick,
	...props
}: SidebarRailProps) => {
	const { mobileBreakpoint, navId, open, setOpen } = useSidebarContext("Rail");

	return (
		<button
			type="button"
			// Pointer affordance only — Sidebar.Trigger and ⌘B cover keyboard.
			tabIndex={-1}
			aria-controls={navId}
			aria-expanded={open}
			aria-label={label}
			title={label}
			data-slot={joinDataSlot(dataSlot, "sidebar-rail")}
			data-state={open ? "expanded" : "collapsed"}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					setOpen(!open);
				}
			}}
			className={cx(
				// Zero-width in-flow flex item: the button itself occupies the
				// sidebar/content boundary without affecting layout. z-20 keeps
				// the hit strip above the content card's sticky header.
				"relative z-20 w-0 shrink-0 focus:outline-hidden",
				navVisibilityClassName[mobileBreakpoint],
				// The 12px hit strip extends from the boundary over the content
				// gutter (never over the sidebar's own scrollbar). Clicks on a
				// pseudo-element hit its originating button.
				"after:absolute after:inset-y-0 after:left-0 after:w-3",
				// The hover affordance: a hairline hugging the boundary.
				"before:absolute before:inset-y-0 before:left-0 before:w-0.5 hover:before:bg-neutral-500/25",
				"cursor-w-resize data-[state=collapsed]:cursor-e-resize",
				className,
			)}
			{...props}
		/>
	);
};
Rail.displayName = "SidebarRail";

type SidebarHeaderProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The top container of a `Sidebar.Nav`, pinned above the scrollable
 * `Sidebar.Body`. Typically holds an app/product switcher built from
 * `Sidebar.SwitcherButton` composed with a `DropdownMenu` or `Dialog`. Its
 * `h-18` height centers the switcher row on the same horizontal band as an
 * `AppLayout.Header` toolbar (8px card gutter + `h-14` header), so the app
 * switcher and the content header read as one aligned row across the shell.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Header = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarHeaderProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-header")}
			className={cx(
				// h-18 centers the switcher row on the same line as an
				// AppLayout.Header toolbar (8px card gutter + h-14 header).
				"flex h-18 shrink-0 flex-col justify-center gap-2 px-3",
				// When expanded, the adjacent AppLayout.Inset contributes the
				// trailing card gutter, so trim the sidebar's own trailing inset
				// to keep dividers and rows optically centered between the
				// viewport edge and content card.
				"group-data-[state=expanded]/sidebar-nav:pr-1",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Header.displayName = "SidebarHeader";

type SidebarBodyProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The scrollable middle region of a `Sidebar.Nav`, growing to fill the space
 * between `Sidebar.Header` and `Sidebar.Footer`. Holds the navigation
 * `Sidebar.Group` children. Overflowing edges fade out via the
 * `scroll-fade-y` mask; inside the collapsed icon rail the scrollbar and its
 * reserved gutter are hidden and the fade is the only overflow signal.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Body = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarBodyProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-body")}
			className={cx(
				// pt-1.5 (not pt-0) keeps the first row's focus ring inside the
				// scrollport instead of clipping it at scrollTop=0; scroll-py-6
				// makes focus-triggered scrolling land rows clear of the
				// scroll-fade-y mask's 1.5rem fade zones, so a keyboard user's
				// focus ring is never faded out mid-list.
				"scrollbar scrollbar-gutter-stable scroll-fade-y flex-1 scroll-py-6 space-y-2 overflow-y-auto overflow-x-hidden px-3 pt-1.5 pb-4",
				// Match Header/Footer trailing geometry when expanded.
				"group-data-[state=expanded]/sidebar-nav:pr-1",
				// The icon rail is too narrow for a scrollbar: hide it (and drop
				// the reserved gutter, which would off-center the icons) and let
				// the scroll fade signal the overflow instead.
				"group-data-[state=collapsed]/sidebar-nav:scrollbar-none",
				"group-data-[state=collapsed]/sidebar-nav:scrollbar-gutter-auto",
				"group-data-[state=collapsed]/sidebar-nav:[&::-webkit-scrollbar]:hidden",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Body.displayName = "SidebarBody";

type SidebarFooterProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The bottom container of a `Sidebar.Nav`, pinned below the scrollable
 * `Sidebar.Body`. Typically holds cross-product items and the account/user
 * switcher row (`Sidebar.SwitcherButton` with `Sidebar.AccountAvatar` and
 * `Sidebar.UserAvatar`).
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Footer = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarFooterProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-footer")}
			className={cx(
				"shrink-0 px-3 pt-3 pb-3.5",
				// Match Header/Body trailing geometry when expanded.
				"group-data-[state=expanded]/sidebar-nav:pr-1",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Footer.displayName = "SidebarFooter";

type SidebarGroupContextValue = {
	/**
	 * The id the group's `Sidebar.GroupLabel` renders with, referenced by
	 * `Sidebar.List` via `aria-labelledby`.
	 */
	labelId: string;
	/**
	 * Whether a managed `Sidebar.GroupLabel` is currently mounted in this
	 * group — gates the list's `aria-labelledby` so it never dangles.
	 */
	hasLabel: boolean;
	/**
	 * Registers/unregisters the group's label (called by `Sidebar.GroupLabel`
	 * on mount/unmount).
	 */
	setHasLabel: (hasLabel: boolean) => void;
};

const SidebarGroupContext = createContext<SidebarGroupContextValue | null>(null);

type SidebarGroupProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * A grouping container inside `Sidebar.Body` pairing an optional
 * `Sidebar.GroupLabel` with a `Sidebar.List`. When a label is present, the
 * group wires it to the list via `aria-labelledby` so assistive technology
 * announces the list with the group's name.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Group = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarGroupProps) => {
	const labelId = useId();
	const [hasLabel, setHasLabel] = useState(false);
	const contextValue = useMemo<SidebarGroupContextValue>(
		() => ({ hasLabel, labelId, setHasLabel }),
		[hasLabel, labelId],
	);
	const Comp = asChild ? Slot : "div";

	return (
		<SidebarGroupContext.Provider value={contextValue}>
			<Comp
				data-slot={joinDataSlot(dataSlot, "sidebar-group")}
				className={cx("pt-0.5", className)}
				{...props}
			>
				{children}
			</Comp>
		</SidebarGroupContext.Provider>
	);
};
Group.displayName = "SidebarGroup";

type SidebarGroupLabelProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The muted label of a `Sidebar.Group`, rendered above its `Sidebar.List`.
 * Renders a `<div>` (not a heading, so the sidebar never dictates the page's
 * heading outline); inside a `Sidebar.Group` it is automatically linked to
 * the sibling list via `aria-labelledby`. Pass `asChild` to render a heading
 * at a level you control.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const GroupLabel = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	id: idProp,
	...props
}: SidebarGroupLabelProps) => {
	const groupContext = useContext(SidebarGroupContext);
	const isManagedId = idProp == null && groupContext != null;

	useEffect(() => {
		if (!isManagedId || groupContext == null) {
			return;
		}
		groupContext.setHasLabel(true);
		return () => {
			groupContext.setHasLabel(false);
		};
	}, [groupContext, isManagedId]);

	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			id={idProp ?? groupContext?.labelId}
			data-slot={joinDataSlot(dataSlot, "sidebar-group-label")}
			className={cx(
				"text-muted flex min-w-0 items-center gap-2 truncate px-2 py-1 text-xs font-medium",
				// In the collapsed icon rail the label fades out IN PLACE — its
				// 24px row is deliberately retained so icon groups stay visually
				// separated and every row keeps the exact position it has when
				// expanded. Opacity keeps it in the accessibility tree so lists
				// stay named via aria-labelledby; pointer-events-none keeps the
				// invisible label from intercepting stray clicks. The transition
				// is gated on the nav's data-hydrated so an SSR state correction
				// snaps instead of animating on page load.
				"group-data-[state=collapsed]/sidebar-nav:opacity-0",
				"group-data-[state=collapsed]/sidebar-nav:pointer-events-none",
				// motion-reduce must carry the same group gate: the gated
				// transition rule's selector outranks a bare motion-reduce
				// override (0,2,0 vs 0,1,0), so an ungated one would lose.
				"group-data-[hydrated]/sidebar-nav:transition-opacity group-data-[hydrated]/sidebar-nav:duration-200 group-data-[hydrated]/sidebar-nav:ease-linear group-data-[hydrated]/sidebar-nav:motion-reduce:transition-none",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
GroupLabel.displayName = "SidebarGroupLabel";

type SidebarListProps = ComponentProps<"ul"> & WithAsChild & WithDataSlot;

/**
 * The `<ul>` list of navigation rows inside a `Sidebar.Group`. When the group
 * has a `Sidebar.GroupLabel`, the list is announced with the group's name via
 * `aria-labelledby`.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const List = ({
	"aria-labelledby": ariaLabelledBy,
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarListProps) => {
	const groupContext = useContext(SidebarGroupContext);
	const Comp = asChild ? Slot : "ul";

	return (
		<Comp
			aria-labelledby={
				ariaLabelledBy ?? (groupContext?.hasLabel ? groupContext.labelId : undefined)
			}
			data-slot={joinDataSlot(dataSlot, "sidebar-list")}
			className={cx("mb-2 space-y-px", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
List.displayName = "SidebarList";

type SidebarItemProps = ComponentProps<"li"> & WithAsChild & WithDataSlot;

/**
 * A single `<li>` row of a `Sidebar.List`. A plain wrapper — the interactive
 * element is the `Sidebar.ItemButton` child, so props, `ref`, and `className`
 * all target the list item itself.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Item = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: SidebarItemProps) => {
	const Comp = asChild ? Slot : "li";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-item")}
			className={cx("group/sidebar-item relative list-none", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Item.displayName = "SidebarItem";

type SidebarItemButtonProps = ComponentProps<"button"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Marks this row as the current page: sets `aria-current="page"` and the
		 * `data-current` styling state. Consumers control it from their router,
		 * e.g. `current={pathname === "/endpoints"}`.
		 */
		current?: boolean;
	};

/**
 * The interactive row of a `Sidebar.Item`: a leading icon slot and a
 * truncating label. Renders a `<button>` by default; pass `asChild` to
 * compose with a router link. `current` sets `aria-current="page"` and the
 * `data-current` visual state.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const ItemButton = ({
	asChild,
	children,
	className,
	current,
	"data-slot": dataSlot,
	type,
	...props
}: SidebarItemButtonProps) => {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-item-button")}
			// Presence semantics: never render `data-current="false"` — the
			// `data-current:` variant matches the attribute's existence.
			data-current={current ? "" : undefined}
			aria-current={current ? "page" : undefined}
			type={asChild ? type : (type ?? "button")}
			className={cx(
				"ring-focus-accent flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 text-left font-normal transition-none focus:outline-hidden focus-visible:ring-4",
				"text-body hover:text-strong hover:bg-neutral-500/10",
				"data-current:bg-neutral-500/15 data-current:text-strong",
				"[&>svg]:text-muted hover:[&>svg]:text-strong data-current:[&>svg]:text-strong [&>svg]:size-5 [&>svg]:shrink-0",
				// In the collapsed icon rail the row returns to its original
				// 28px square chip. ml-1 keeps body and footer item icons aligned
				// with their expanded position and the switcher indicators.
				"group-data-[state=collapsed]/sidebar-nav:ml-1",
				"group-data-[state=collapsed]/sidebar-nav:w-7",
				"group-data-[state=collapsed]/sidebar-nav:p-1",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
ItemButton.displayName = "SidebarItemButton";

type SidebarSwitcherButtonProps = ComponentProps<"button"> & WithAsChild & WithDataSlot;

/**
 * The styled row for the sidebar's switchers: the app/product switcher in
 * `Sidebar.Header` and the account/user row in `Sidebar.Footer`. A styled
 * button only — it is not wired to any state; compose it with
 * `DropdownMenu.Trigger asChild` or `Dialog.Trigger asChild`, which supply
 * the open state (`data-state="open"` styling comes for free from those
 * primitives).
 *
 * Inside the collapsed icon rail, the row collapses to
 * its **first child element** — the leading visual (product icon, account
 * avatar) — and the remaining children become visually hidden while staying
 * in the accessibility tree, so the button's accessible name is unchanged.
 * Wrap loose text in an element (e.g. a `<span>`) so it participates.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const SwitcherButton = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	type,
	...props
}: SidebarSwitcherButtonProps) => {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-switcher-button")}
			type={asChild ? type : (type ?? "button")}
			className={cx(
				"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-2 [border-radius:0.625rem] py-1 pr-1.5 pl-1 text-left font-medium transition-none",
				"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
				"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
				// The leading account/product tile uses rounded-md (6px) and
				// sits 4px from the edge, so the outer switcher radius is 10px.
				// Product/account indicators are a little larger than their
				// source components by default; the tighter padding keeps the
				// switcher row at the same net 36px height while preserving
				// prototype spacing on the trailing action icon.
				"[&>:first-child]:size-7",
				// In the collapsed icon rail only the leading visual (product
				// icon, account avatar) stays visible; the rest goes sr-only —
				// visually gone but still part of the button's accessible name.
				// w-9 keeps the leading visual centered in the same 36px chip as
				// the switcher row.
				"group-data-[state=collapsed]/sidebar-nav:w-9",
				"group-data-[state=collapsed]/sidebar-nav:p-1",
				"group-data-[state=collapsed]/sidebar-nav:[&>:not(:first-child)]:sr-only",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
SwitcherButton.displayName = "SidebarSwitcherButton";

type SidebarSeparatorProps = ComponentProps<typeof Separator>;

/**
 * An inset hairline between sidebar regions. Composes the mantle `Separator`,
 * staying aligned with the `px-3` content padding of `Sidebar.Body` and
 * `Sidebar.Footer` (it deliberately does not run edge to edge) with `my-3`
 * breathing room above and below. When collapsed to the icon rail, it widens
 * to the same 36px chip width as `Sidebar.SwitcherButton`, balancing the
 * adjacent app-content gutter that sits outside the rail.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const SidebarSeparator = ({ className, ...props }: SidebarSeparatorProps) => (
	<Separator
		data-slot="sidebar-separator"
		className={cx("my-3", "group-data-[state=collapsed]/sidebar-nav:w-9", className)}
		{...props}
	/>
);
SidebarSeparator.displayName = "SidebarSeparator";

/**
 * The avatar swatch palette. Every entry is a Tailwind background color whose
 * hue and order match the sidebar prototype account switcher. Keep the hue
 * order stable: `pickColorClass` indexes into this tuple by account-id hash,
 * so reordering changes every account's color.
 */
const accountAvatarColors = [
	"bg-emerald-500",
	"bg-gray-500",
	"bg-red-500",
	"bg-violet-500",
	"bg-cyan-500",
	"bg-rose-500",
	"bg-purple-500",
	"bg-fuchsia-500",
	"bg-green-500",
	"bg-orange-500",
	"bg-indigo-500",
	"bg-teal-500",
	"bg-yellow-500",
	"bg-sky-500",
	"bg-pink-500",
	"bg-blue-500",
	"bg-amber-500",
] as const;

/**
 * djb2 is a stable, fast string hashing function. We use it to deterministically
 * pick a background color from `accountAvatarColors` for a given account ID, so
 * the same account always gets the same swatch.
 */
function djb2Hash(value: string): number {
	let hash = 5381;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 33) ^ value.charCodeAt(index);
	}
	// Convert to unsigned 32-bit so the modulo below stays positive.
	return hash >>> 0;
}

function pickColorClass(accountId: string | undefined): string {
	const hash = djb2Hash(accountId ?? "");
	const index = hash % accountAvatarColors.length;
	// `accountAvatarColors` is a non-empty `as const` tuple; the fallback
	// satisfies the strict-mode index-access type without a non-null assertion.
	return accountAvatarColors[index] ?? "bg-neutral-500";
}

function getInitials(accountName: string | undefined): string {
	const stripped = (accountName ?? "")
		.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, "")
		.trim();
	const initials = stripped
		.split(" ")
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.slice(0, 2)
		.map((part) => part.substring(0, 1))
		.join("")
		.toLocaleUpperCase();
	return initials || "?";
}

type SidebarAccountAvatarProps = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * The account's stable identifier. Used to deterministically select a
	 * background swatch from the design system's palette so the same account
	 * always gets the same color.
	 */
	accountId: string | undefined;
	/**
	 * The account's display name. The first one or two letters become the
	 * avatar's initials. Falls back to `?` when the name is empty.
	 */
	accountName: string | undefined;
};

// Why no `asChild`: the avatar is a prop-driven leaf (initials + derived
// color) with no children to slot-swap.
/**
 * A small rounded-square avatar that represents an account (workspace,
 * organization, etc.). The background color is derived deterministically from
 * the `accountId` so an account's swatch is stable across renders, sessions,
 * and devices.
 *
 * Accounts are rendered as squares to differentiate them visually from users,
 * which use a circular `Sidebar.UserAvatar`.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const AccountAvatar = ({
	accountId,
	accountName,
	className,
	...props
}: SidebarAccountAvatarProps) => (
	<div
		data-slot="sidebar-account-avatar"
		className={cx(
			"text-static-white flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-medium",
			pickColorClass(accountId),
			className,
		)}
		aria-hidden="true"
		{...props}
	>
		{getInitials(accountName)}
	</div>
);
AccountAvatar.displayName = "SidebarAccountAvatar";

/**
 * A neutral person silhouette rendered with `currentColor` so it picks up the
 * surrounding text color and adapts to any theme. Used as the default visual
 * when no `src` is provided to `Sidebar.UserAvatar`.
 */
const UserSilhouetteIcon = ({ className, ...props }: ComponentProps<"svg">) => (
	<svg
		className={cx("block size-full", className)}
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
		{...props}
	>
		<circle cx="12" cy="12" r="12" opacity={0.15} />
		<circle cx="12" cy="10" r="3.5" />
		<path d="M5.25 19.5C6.6 16.7 9.1 15 12 15s5.4 1.7 6.75 4.5A12 12 0 0 1 12 22a12 12 0 0 1-6.75-2.5Z" />
	</svg>
);

type SidebarUserAvatarProps = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * Optional URL of the user's profile picture. When provided, the image is
	 * rendered to fill the avatar with `object-cover`. When omitted (or while
	 * loading), a neutral person silhouette is shown.
	 */
	src?: string;
	/**
	 * Accessible label for the avatar. Used as the image's `alt` text and as
	 * the container's `aria-label` when no image is rendered.
	 *
	 * @default "Your account"
	 */
	alt?: string;
};

// Why no `asChild`: the avatar is a prop-driven leaf (`src`/`alt` with an
// internal fallback) with no children to slot-swap.
/**
 * A circular avatar that represents the currently signed-in user. Renders the
 * user's profile picture when `src` is provided, otherwise falls back to a
 * neutral, theme-aware person silhouette.
 *
 * Users are rendered as circles to differentiate them visually from accounts,
 * which use a square `Sidebar.AccountAvatar`.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const UserAvatar = ({ alt = "Your account", className, src, ...props }: SidebarUserAvatarProps) => (
	<div
		data-slot="sidebar-user-avatar"
		className={cx(
			"text-muted bg-neutral-500/15 relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full",
			className,
		)}
		// aria-label needs a role that permits naming — a bare div is
		// role=generic, where accessible names are prohibited.
		role={src ? undefined : "img"}
		aria-label={src ? undefined : alt}
		{...props}
	>
		{src ? <img src={src} alt={alt} className="size-full object-cover" /> : <UserSilhouetteIcon />}
	</div>
);
UserAvatar.displayName = "SidebarUserAvatar";

/**
 * One switchable account rendered by `Sidebar.SwitchAccountsRadioGroup`: a
 * stable `id` (the radio item value and the avatar color seed), a display
 * `name`, and optional `trailing` content such as a plan badge.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * const accounts: SidebarAccount[] = [
 *   { id: "acc_acme", name: "Acme Corp", trailing: <Badge>Free</Badge> },
 *   { id: "acc_atlas", name: "Atlas Industries" },
 * ];
 *
 * <Sidebar.SwitchAccountsRadioGroup
 *   accounts={accounts}
 *   value={currentAccountId}
 *   onValueChange={(id) => switchAccount(id)}
 * />;
 * ```
 */
type SidebarAccount = {
	/**
	 * Stable account identifier. Used as the radio item value and the avatar
	 * color seed.
	 */
	id: string;
	/**
	 * Display name for the account. Empty strings fall back to the ID.
	 */
	name: string;
	/**
	 * Optional trailing content for this account row. Useful for plan badges
	 * (e.g. "Free") or any other inline indicator.
	 */
	trailing?: ReactNode;
};

type SidebarSwitchAccountsRadioGroupProps = Omit<
	ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
	"children"
> & {
	/**
	 * The list of accounts the current user can switch into. Consumer-supplied;
	 * mantle does not fetch or shape this data.
	 */
	accounts: ReadonlyArray<SidebarAccount>;
};

// Why no `asChild`: this part wraps a Radix dropdown-menu primitive that owns
// its own rendering; polymorphism does not apply to a mapped radio group.
/**
 * A pre-styled radio group of accounts for use inside a
 * `DropdownMenu.SubContent` (a "Switch accounts" submenu). Pairs an account
 * avatar and name (and optional trailing badge) per row, and delegates
 * value-change handling to the consumer.
 *
 * Works on top of `@radix-ui/react-dropdown-menu` directly so it can be
 * slotted into either the design system's `DropdownMenu` namespace or a
 * consumer's own Radix-based menu.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * ```tsx
 * <DropdownMenu.Sub>
 *   <DropdownMenu.SubTrigger>Switch accounts</DropdownMenu.SubTrigger>
 *   <DropdownMenu.SubContent>
 *     <Sidebar.SwitchAccountsRadioGroup
 *       accounts={accounts}
 *       value={currentAccountId}
 *       onValueChange={(id) => switchAccount(id)}
 *     />
 *   </DropdownMenu.SubContent>
 * </DropdownMenu.Sub>
 * ```
 */
const SwitchAccountsRadioGroup = ({
	accounts,
	className,
	...props
}: SidebarSwitchAccountsRadioGroupProps) => (
	<DropdownMenuPrimitive.RadioGroup
		data-slot="sidebar-switch-accounts-radio-group"
		className={cx("space-y-px", className)}
		{...props}
	>
		{accounts.map((account) => (
			<DropdownMenuPrimitive.RadioItem
				key={account.id}
				value={account.id}
				className={cx(
					"group/sidebar-switch-account-item",
					"text-strong relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal outline-none",
					"data-highlighted:bg-active-menu-item",
					"aria-checked:bg-selected-menu-item",
					"data-highlighted:aria-checked:bg-active-selected-menu-item!",
					"data-disabled:pointer-events-none data-disabled:opacity-50",
				)}
			>
				<AccountAvatar accountId={account.id} accountName={account.name} className="shrink-0" />
				<span className="min-w-0 flex-1 truncate">{account.name.trim() || account.id}</span>
				{account.trailing}
			</DropdownMenuPrimitive.RadioItem>
		))}
	</DropdownMenuPrimitive.RadioGroup>
);
SwitchAccountsRadioGroup.displayName = "SidebarSwitchAccountsRadioGroup";

/**
 * A composable, collapsible app-navigation sidebar. `Sidebar.Root` owns the
 * state (no DOM); `Sidebar.Nav` renders the panel — inline on desktop,
 * collapsing to a skinny icon rail, and a left-side `Sheet` below the root's
 * `mobileBreakpoint`; `Sidebar.Trigger` toggles it from anywhere under the
 * root (typically an `AppLayout.Header`), and `Sidebar.Rail` adds a click
 * strip on the sidebar's edge for pointer toggling. Navigation is grouped with
 * `Sidebar.Group`/`Sidebar.GroupLabel`/`Sidebar.List`, and the switcher rows
 * (app switcher up top, account/user down bottom) compose
 * `Sidebar.SwitcherButton` with your own `DropdownMenu` or `Dialog`.
 *
 * The component is routing-agnostic: compose router links via `asChild` on
 * `Sidebar.ItemButton` and drive `current` from your router's location.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar
 *
 * @example
 * Composition:
 * ```
 * Sidebar.Root
 * ├── Sidebar.Nav
 * │   ├── Sidebar.Header
 * │   │   └── Sidebar.SwitcherButton
 * │   ├── Sidebar.Body
 * │   │   └── Sidebar.Group
 * │   │       ├── Sidebar.GroupLabel
 * │   │       └── Sidebar.List
 * │   │           └── Sidebar.Item
 * │   │               └── Sidebar.ItemButton
 * │   ├── Sidebar.Separator
 * │   └── Sidebar.Footer
 * │       └── Sidebar.SwitcherButton
 * │           ├── Sidebar.AccountAvatar
 * │           └── Sidebar.UserAvatar
 * ├── Sidebar.Rail
 * └── Sidebar.Trigger
 * ```
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Sidebar.Group>
 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *         <Sidebar.List>
 *           <Sidebar.Item>
 *             <Sidebar.ItemButton asChild current>
 *               <a href="/endpoints">
 *                 <GraphIcon />
 *                 Endpoints
 *               </a>
 *             </Sidebar.ItemButton>
 *           </Sidebar.Item>
 *         </Sidebar.List>
 *       </Sidebar.Group>
 *     </Sidebar.Body>
 *     <Sidebar.Footer>
 *       <Sidebar.Separator />
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherButton>
 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *             <Sidebar.UserAvatar alt="Jane Doe" />
 *           </Sidebar.SwitcherButton>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content>…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Sidebar = {
	/**
	 * The state owner for a sidebar. Renders no DOM — provides expanded /
	 * mobile-sheet state to every part below it so the trigger can live in the
	 * app shell without coupling it to the sidebar.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Root,
	/**
	 * The sidebar panel: an inline panel that collapses to the icon rail on
	 * desktop, a left `Sheet` below the root's `mobileBreakpoint`. Set
	 * `--sidebar-width` / `--sidebar-width-mobile` via its `className` or
	 * `style`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Nav,
	/**
	 * The `IconButton` that toggles the sidebar. Place it in the app shell's
	 * header; it stays functional at every breakpoint.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Trigger,
	/**
	 * A click strip along the sidebar's edge that toggles the desktop sidebar.
	 * Render it as the immediate next sibling of `Sidebar.Nav` so it always
	 * sits on the sidebar/content boundary.
	 * Pointer affordance only (`tabIndex={-1}`); keyboard users toggle with
	 * `Sidebar.Trigger` or `⌘B`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <Sidebar.Rail />
	 *       <AppLayout.Inset>…</AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Rail,
	/**
	 * The pinned top container of the panel, typically holding the app
	 * switcher (`Sidebar.SwitcherButton` + `DropdownMenu`/`Dialog`). Its
	 * height vertically aligns the switcher with an `AppLayout.Header`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Header,
	/**
	 * The scrollable middle region holding the navigation groups.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Body,
	/**
	 * The pinned bottom container, typically holding cross-product items and
	 * the account/user switcher row.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Footer,
	/**
	 * A grouping container pairing a `GroupLabel` with a `List`; wires the
	 * label to the list via `aria-labelledby`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Group,
	/**
	 * The muted label of a group. Renders a `<div>`; pass `asChild` to render
	 * a heading at a level you control.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	GroupLabel,
	/**
	 * The `<ul>` of navigation rows in a group.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	List,
	/**
	 * A single `<li>` row wrapper.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Item,
	/**
	 * The interactive navigation row (icon + truncating label). `asChild` for
	 * router links; `current` for the active page.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	ItemButton,
	/**
	 * The styled switcher row for the header/footer. Not state-wired — compose
	 * with `DropdownMenu.Trigger asChild` or `Dialog.Trigger asChild`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	SwitcherButton,
	/**
	 * An inset hairline between sidebar regions, aligned with the content
	 * padding.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Separator: SidebarSeparator,
	/**
	 * A rounded-square account avatar with deterministic, WCAG-compliant
	 * swatch colors derived from the account id.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	AccountAvatar,
	/**
	 * A circular user avatar with a silhouette fallback.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Sidebar.Group>
	 *         <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *         <Sidebar.List>
	 *           <Sidebar.Item>
	 *             <Sidebar.ItemButton asChild current>
	 *               <a href="/endpoints">
	 *                 <GraphIcon />
	 *                 Endpoints
	 *               </a>
	 *             </Sidebar.ItemButton>
	 *           </Sidebar.Item>
	 *         </Sidebar.List>
	 *       </Sidebar.Group>
	 *     </Sidebar.Body>
	 *     <Sidebar.Footer>
	 *       <Sidebar.Separator />
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherButton>
	 *             <Sidebar.AccountAvatar accountId="acc_123" accountName="Acme Corp" />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *             <Sidebar.UserAvatar alt="Jane Doe" />
	 *           </Sidebar.SwitcherButton>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content>…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	UserAvatar,
	/**
	 * A pre-styled radio group of accounts for a "Switch accounts"
	 * `DropdownMenu` submenu.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar
	 *
	 * @example
	 * ```tsx
	 * <DropdownMenu.Sub>
	 *   <DropdownMenu.SubTrigger>Switch accounts</DropdownMenu.SubTrigger>
	 *   <DropdownMenu.SubContent>
	 *     <Sidebar.SwitchAccountsRadioGroup
	 *       accounts={accounts}
	 *       value={currentAccountId}
	 *       onValueChange={(id) => switchAccount(id)}
	 *     />
	 *   </DropdownMenu.SubContent>
	 * </DropdownMenu.Sub>
	 * ```
	 */
	SwitchAccountsRadioGroup,
} as const;

export {
	//,
	Sidebar,
	useSidebar,
};

export type {
	//,
	SidebarAccount,
	SidebarMobileBreakpoint,
	SidebarState,
};
