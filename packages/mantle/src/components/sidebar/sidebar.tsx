"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/SidebarSimple";
import type { ComponentProps, ReactElement, ReactNode } from "react";
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
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useIsBelowBreakpoint } from "../../hooks/use-breakpoint.js";
import { useIsApplePlatform } from "../../hooks/use-is-apple-platform.js";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { isApplePlatform } from "../../utils/platform.js";
import type { IconButtonProps } from "../button/icon-button.js";
import { IconButton } from "../button/icon-button.js";
import { Separator } from "../separator/separator.js";
import { Sheet } from "../sheet/index.js";
import { Slot } from "../slot/index.js";
import { Tooltip } from "../tooltip/index.js";

/**
 * The breakpoints below which `Sidebar.Nav` swaps from the inline desktop
 * panel to the mobile `Sheet` presentation. Kept to a closed set because the
 * pre-hydration visibility classes are static strings (Tailwind cannot see
 * interpolated class names).
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
 * Maps each supported `mobileBreakpoint` to the static visibility classes that
 * hide the desktop panel below the breakpoint. Applied only until hydration —
 * the server cannot know the viewport, and after hydration `isMobile` picks the
 * presentation on its own (see `Sidebar.Nav`). A complete `Record` (not cva) so
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
	/**
	 * Whether this root owns the `⌘B` / `Ctrl+B` shortcut. `Sidebar.Trigger`
	 * reads it to decide whether its tooltip advertises the chord, so the hint
	 * can never name a binding that is not bound.
	 */
	keyboardShortcut: boolean;
};

const SidebarContext = createContext<SidebarState | null>(null);

/**
 * Read the nearest `Sidebar.Root` state. Throws when called outside a
 * `Sidebar.Root` so misuse fails loudly. Use it to build custom triggers,
 * a keyboard shortcut, or close-on-navigate behavior.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#usesidebar
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
	/**
	 * The sidebar's parts — a `Sidebar.Nav` and anything that reads the state,
	 * including a `Sidebar.Trigger` rendered anywhere below (an
	 * `AppLayout.Header`, for example). `Root` renders no DOM of its own.
	 */
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
	 * shortcut requires exactly the platform modifier + `b`: `⌘` on Apple
	 * platforms and `Ctrl` everywhere else, resolved per host — the two never
	 * substitute for each other, so macOS's native `Ctrl+B` ("move the caret
	 * back one character") is left alone. Combinations with `Shift`/`Alt` (e.g.
	 * the browser's own `⌘⇧B`) pass through too.
	 *
	 * The shortcut is also ignored while focus is in a text-editing or form
	 * control — an `<input>`, `<textarea>`, `<select>`, or any `contenteditable`
	 * host — because the chord is usually already bound there (`⌘B` is "bold")
	 * and this is a `window` listener that calls `preventDefault()`. That covers
	 * embedded editors like Monaco and CodeMirror, which attach to exactly those
	 * elements. Set `false` to opt out entirely.
	 *
	 * The shortcut has exactly one owner per window: the first mounted root
	 * with the shortcut enabled. Additional roots (nested or siblings) queue
	 * and take ownership only when the owner unmounts, so composing a second
	 * sidebar never makes one keypress toggle both.
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
 * Mounted roots that want the keyboard shortcut, in claim order. Only the
 * first claimant handles the keypress; the rest wait their turn and inherit
 * ownership when earlier claimants unmount. Module state is safe here: it is
 * only touched from effects (never during server rendering), and per-window
 * exclusivity is exactly the invariant it exists to hold.
 */
const keyboardShortcutClaims: Array<symbol> = [];

/**
 * Whether an event target is a text-editing or form control that owns its own
 * keyboard handling. A window-level shortcut that `preventDefault()`s must skip
 * these: the platform modifier + a letter is nearly always already bound there
 * (`⌘B` is "bold" in every rich-text editor), and embedded editors like Monaco
 * or CodeMirror attach to exactly these elements.
 */
function isTextEditingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	return (
		target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT"
	);
}

/**
 * Claims a place in the keyboard-shortcut ownership queue. The returned
 * `isOwner` is checked per keypress (not at claim time) so ownership
 * transfers automatically when an earlier claimant releases.
 */
function claimKeyboardShortcut(): { isOwner: () => boolean; release: () => void } {
	const claim = Symbol("sidebar-keyboard-shortcut");
	keyboardShortcutClaims.push(claim);
	return {
		isOwner: () => keyboardShortcutClaims[0] === claim,
		release: () => {
			const index = keyboardShortcutClaims.indexOf(claim);
			if (index !== -1) {
				keyboardShortcutClaims.splice(index, 1);
			}
		},
	};
}

/**
 * The state owner for a sidebar. Renders no DOM of its own (like
 * `Tooltip.Root`) — it carries the expanded/collapsed and mobile-sheet state
 * to every part below it, so `Sidebar.Trigger` can live anywhere in the tree
 * (for example inside an `AppLayout.Header`) without coupling the app shell
 * to the sidebar.
 *
 * Render exactly one `Sidebar.Nav` per `Sidebar.Root`. Nested roots shadow
 * the outer sidebar for everything below them.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarroot
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
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

	// ⌘B (Apple) / Ctrl+B (elsewhere) toggles the sidebar (shadcn-compatible).
	// Exact-modifier match: Shift/Alt combinations (e.g. the browser's own ⌘⇧B)
	// pass through, and the two platform modifiers never substitute for each
	// other — accepting either would hijack macOS's native Ctrl+B ("move the
	// caret back one character"), which every macOS text field binds.
	// Ownership: only the registry's first claimant handles the keypress, so
	// multiple mounted roots (nested or siblings) never toggle together.
	//
	// `toggle` is read through a stable ref rather than listed as a dependency:
	// its identity changes on every toggle (and on every parent render when the
	// consumer passes an inline `onOpenChange`), and re-running the effect would
	// release the claim and re-queue it at the TAIL — handing ownership to a
	// sibling root after the first keypress, exactly the ping-pong the queue
	// exists to prevent.
	const toggleRef = useCallbackRef(toggle);
	useEffect(() => {
		if (!keyboardShortcut) {
			return;
		}
		const claim = claimKeyboardShortcut();
		// Resolved once per mount rather than per keypress: the host platform
		// cannot change while the window is open. Reading it here (in an effect)
		// and never during render is also what keeps it out of hydration.
		const isApple = isApplePlatform();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!claim.isOwner()) {
				return;
			}
			// Never steal the chord from a text-editing context. This listener is
			// on `window` in the bubble phase and calls preventDefault(), so
			// without the guard it reaches inside every input and embedded editor.
			if (isTextEditingTarget(event.target)) {
				return;
			}
			const platformModifier = isApple ? event.metaKey : event.ctrlKey;
			const foreignModifier = isApple ? event.ctrlKey : event.metaKey;
			// toLowerCase: with Caps Lock on, browsers report key "B" with
			// shiftKey false — the shortcut must not silently die there.
			if (
				event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
				platformModifier &&
				!foreignModifier &&
				!event.altKey &&
				!event.shiftKey
			) {
				event.preventDefault();
				toggleRef();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			claim.release();
		};
	}, [keyboardShortcut, toggleRef]);

	const contextValue = useMemo<SidebarState>(
		() => ({
			isMobile,
			keyboardShortcut,
			mobileBreakpoint,
			navId,
			open,
			openMobile,
			setOpen,
			setOpenMobile,
			toggle,
		}),
		[
			isMobile,
			keyboardShortcut,
			mobileBreakpoint,
			navId,
			open,
			openMobile,
			setOpen,
			setOpenMobile,
			toggle,
		],
	);

	return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
};

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
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-width` | `13rem` | Expanded desktop panel width (208px). |
 * | `--sidebar-width-mobile` | `18rem` | Mobile sheet width (288px). |
 * | `--sidebar-width-icon` | `3.25rem` | Collapsed icon rail width (52px). |
 * | `--sidebar-row-width` | `12rem` | Derived, not set: one row's width in the expanded panel (192px), for sizing surfaces that render *outside* it. See below and `Sidebar.SwitcherTrigger`. |
 *
 * `--sidebar-row-width` is `calc(var(--sidebar-width,13rem) - 1rem)`, declared
 * at `:root` by `mantle.css` — the panel width minus the row gutter this
 * component's regions apply.
 *
 * Each of the three widths is read with its default as the fallback, and
 * custom properties inherit, so set one on `Sidebar.Nav` to resize a single
 * sidebar or on any ancestor (`:root` in your global stylesheet) to resize
 * every sidebar in the app. `--sidebar-row-width` resolves at `:root`, so a
 * `--sidebar-width` override scoped to one `Sidebar.Nav` does not reach it in
 * either direction — a narrower panel leaves the floor *wider* than the row it
 * opens from. Override `--sidebar-width` at `:root` to move both together, or
 * set `--sidebar-row-width` on the outside surface itself.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-state` | `"expanded"` \| `"collapsed"` | On the desktop panel surface. Mirrors the root's expanded state and drives the width collapse to the icon rail; descendant parts style off it with `group-data-[state=collapsed]/sidebar-nav:`. |
 * | `data-hydrated` | present after hydration | Presence-only, desktop panel surface. The CSS-side twin of the `isHydrated` gate: descendant collapse transitions are enabled only under `group-data-hydrated/sidebar-nav:`, so an SSR state correction snaps instead of animating on page load. |
 * | `data-mobile` | present in the mobile sheet | Presence-only. Marks the `Sheet.Content` presentation used below the root's `mobileBreakpoint`. |
 * | `data-state` | `"open"` \| `"closed"` | In the mobile sheet only, where the panel *is* the `Sheet`'s Radix dialog content element and Radix owns the attribute — the sheet's open/close animation state, not the desktop expanded state. Consumers style against it too. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarnav
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
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
					preferredWidth="sm:max-w-(--sidebar-width-mobile,18rem)"
					data-slot={joinDataSlot(dataSlot, "sidebar-nav")}
					data-mobile=""
					// A consumer aria-labelledby names the dialog too, keeping the
					// sheet and the nav consistently named. Spread conditionally:
					// an explicit undefined would override the Sheet's internal
					// Title wiring and leave the dialog unnamed.
					{...(ariaLabelledBy == null ? null : { "aria-labelledby": ariaLabelledBy })}
					className={cx("bg-base w-(--sidebar-width-mobile,18rem) max-w-full p-0", className)}
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
				"group/sidebar-nav bg-base relative h-full w-(--sidebar-width,13rem) shrink-0 overflow-hidden",
				// collapsing animates the width down to the skinny icon rail; the
				// panel content stays interactive and in the accessibility tree.
				"data-[state=collapsed]:w-(--sidebar-width-icon,3.25rem)",
				// Pre-hydration only: the server cannot know the viewport, so hide the
				// desktop panel below the breakpoint in CSS to avoid a flash of the
				// wrong presentation on a narrow screen. After hydration `isMobile`
				// is authoritative and this gate is dropped — keeping it would leave
				// a sliver of widths (Tailwind's `min-width` variant vs the hook's
				// `max-width` query differ by 0.01rem, reachable under browser zoom
				// or fractional display scaling) where the desktop panel renders but
				// CSS keeps it hidden and no mobile sheet exists, making the
				// navigation unreachable.
				!isHydrated && navVisibilityClassName[mobileBreakpoint],
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

/**
 * The props for `Sidebar.Trigger`. `IconButton`'s props, except the parts the
 * trigger owns: `asChild` and `children` are removed (the trigger renders
 * only its icon and `aria-label`; build custom triggers with `useSidebar`
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
		 * The accessible name for the trigger, and what its tooltip says. Renders
		 * as the button's `aria-label`. Override it for localization.
		 *
		 * @default "Toggle Sidebar"
		 */
		label?: string;
		/**
		 * The keyboard chord that also toggles the sidebar, rendered after the label
		 * in the tooltip — usually `<><MetaKey /><Kbd>B</Kbd></>`.
		 *
		 * Ignored under `Sidebar.Root keyboardShortcut={false}`, so the tooltip can
		 * never name a binding that is not bound. Passed rather than built in so the
		 * sidebar does not have to reach into another component for the platform
		 * modifier glyph — `aria-keyshortcuts` is stamped either way, which is also
		 * why the chips render `aria-hidden`.
		 */
		shortcut?: ReactNode;
	};

// Module-scope default so the trigger icon keeps referential equality across
// renders (a JSX default prop value would be re-created every render).
const defaultTriggerIcon = <SidebarSimpleIcon />;

/**
 * A tooltip body pairing a row's label with the keyboard chord that reaches it.
 * Shared by `Sidebar.Trigger` and `Sidebar.Tooltip` so the two can never drift
 * into differently sized chips.
 *
 * The chips are `aria-hidden`: a tooltip is wired as its control's
 * `aria-describedby`, and the chord is already announced by that control's
 * `aria-keyshortcuts`, so repeating it here would speak it twice.
 */
const TooltipLabel = ({ label, shortcut }: { label: ReactNode; shortcut: ReactNode }) => {
	if (shortcut == null) {
		return label;
	}

	return (
		<span className="flex items-center gap-1.5">
			{label}
			<span
				aria-hidden
				className="inline-flex shrink-0 items-center gap-0.5 [&_kbd]:h-4 [&_kbd]:min-w-4 [&_kbd]:bg-neutral-500/25 [&_kbd]:px-0.5 [&_kbd]:text-xs"
			>
				{shortcut}
			</span>
		</span>
	);
};

// Why no `asChild`: Trigger renders a fully-wired mantle IconButton (icon +
// aria-label + aria-expanded/aria-controls); custom triggers compose the
// same behavior from `useSidebar()` instead of slot-swapping this one.
/**
 * The button that toggles the sidebar: the mobile sheet below the root's
 * `mobileBreakpoint`, the desktop expanded state otherwise. Renders a ghost
 * neutral `IconButton` with `aria-expanded` and `aria-controls` wired to the
 * sidebar's `<nav>`. Place it in your app shell's header (for example
 * `AppLayout.Header`) — it must stay visible at every breakpoint where the
 * sidebar can collapse, or users have no way to reopen it.
 *
 * The button is icon-only at every breakpoint, so it always renders a tooltip
 * showing `label` (plus the optional `shortcut` chips). **That means it requires
 * a `TooltipProvider` ancestor, like any `Tooltip.Root`, and throws without
 * one** — mount a single provider at your app root, decoupled from the sidebar,
 * so the app-wide delay and hover settings stay app-wide.
 *
 * It also stamps `aria-keyshortcuts` for the `⌘B` / `Ctrl+B` chord the root
 * binds, resolved after hydration: the server cannot know the host, so the
 * first paint is the non-Apple answer. Both the attribute and the chips are
 * omitted under `Sidebar.Root keyboardShortcut={false}`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-state` | `"expanded"` \| `"collapsed"` | Mirrors what the trigger toggles: the mobile sheet below the root's `mobileBreakpoint`, the desktop panel otherwise. Pairs with `aria-expanded`. |
 * | `data-slot` | `"sidebar-trigger-tooltip"` | On the tooltip surface, not the button — the styling hook for the label-and-chord popup this part renders. |
 * | `data-appearance` | `"filled"` \| `"ghost"` \| `"outlined"` | Read, not stamped: the underlying `IconButton` reflects its `appearance`, which this part defaults to `"ghost"`. |
 * | `data-intent` | `"neutral"` | Read, not stamped: the underlying `IconButton` reflects its `intent`, and it draws the neutral tone only. |
 * | `data-size` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | Read, not stamped: the underlying `IconButton` reflects its `size` and its own `"md"` default. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebartrigger
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *   <AppLayout.Workspace>
 *     <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *     <AppLayout.Content>
 *       <AppLayout.Header>
 *         <Sidebar.Trigger />
 *       </AppLayout.Header>
 *       <AppLayout.Body>…</AppLayout.Body>
 *     </AppLayout.Content>
 *   </AppLayout.Workspace>
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
	shortcut,
	...props
}: SidebarTriggerProps) => {
	const { isMobile, keyboardShortcut, navId, open, openMobile, toggle } =
		useSidebarContext("Trigger");
	const isApple = useIsApplePlatform();
	const expanded = isMobile ? openMobile : open;
	// The mobile `Sheet` unmounts its content while closed, so the `<nav>` this
	// would point at does not exist — and `aria-controls` must reference an
	// element that is in the document. Desktop keeps the panel mounted at every
	// state (collapsing is a width animation), so the reference always resolves.
	const controlsNav = !isMobile || openMobile;

	// Never name a chord this root does not bind.
	const hint = keyboardShortcut ? shortcut : undefined;
	// Announce the chord rather than only binding it. Resolved after hydration,
	// like every platform-modifier read: the server cannot know the host, so it
	// renders the non-Apple answer and the effect corrects it.
	const platformChord = isApple ? "Meta+B" : "Control+B";

	return (
		// Unlike `Sidebar.Tooltip`, this label is not gated on the rail state: the
		// trigger is an icon-only button at every breakpoint, so a pointer user has
		// nothing else to read. Requires a `TooltipProvider` ancestor, like any
		// `Tooltip.Root` — mount one at your app root, decoupled from the sidebar,
		// so the app-wide delay and hover settings stay app-wide.
		<Tooltip.Root>
			<Tooltip.Trigger asChild>
				<IconButton
					appearance={appearance}
					aria-controls={controlsNav ? navId : undefined}
					aria-expanded={expanded}
					aria-keyshortcuts={keyboardShortcut ? platformChord : undefined}
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
			</Tooltip.Trigger>
			<Tooltip.Content data-slot="sidebar-trigger-tooltip">
				<TooltipLabel label={label} shortcut={hint} />
			</Tooltip.Content>
		</Tooltip.Root>
	);
};

type SidebarHeaderProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The top container of a `Sidebar.Nav`, pinned above the scrollable
 * `Sidebar.Body`. Typically holds an app/product switcher built from
 * `Sidebar.SwitcherTrigger` composed with a `DropdownMenu` or `Dialog`.
 *
 * Its **first child** owns a band exactly `--sidebar-header-height` tall
 * (default `4.5rem`) and centers inside it. When a sidebar header is composed
 * inside an `AppLayout`, the toolbar derives its own height from the same
 * variable, so overriding it at a shared ancestor (e.g. `AppLayout.Root`) moves
 * the switcher row and the toolbar together and the alignment holds by
 * construction.
 *
 * Every child after the first stacks flush below the band in its own row, the
 * way rows stack in `Sidebar.Footer` — the band's own lower half is the space
 * between them. The header grows to fit them. The band, and with it the toolbar,
 * stays the height of the switcher row alone, so a search row pinned under the
 * switcher (`Sidebar.SearchTrigger`) needs no override and no hand-copied
 * padding.
 *
 * The alignment is positional: keep the aligned row as the header's first direct
 * child. A wrapper around both rows takes the band itself. A first row taller
 * than the band overflows it — raise the variable instead.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-header-height` | `4.5rem` | The first child's band (72px) — the height an `AppLayout.Header` toolbar matches, not a cap on the header, which grows for every row after the first. Set it on a common ancestor of the sidebar and `AppLayout.Header`, not on `Sidebar.Nav`, so both rows read one value. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarheader
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
				// Why grid: the first track is exactly --sidebar-header-height, so the
				// first child owns the band an AppLayout.Header toolbar sizes itself
				// against (see AppLayout.Header) while every later child gets its own
				// auto track below it — a search row stacks under the switcher without
				// moving it off that band, and neither row needs a token override. The
				// single minmax(0,1fr) column keeps a long switcher label truncating
				// instead of widening the track.
				// No gap: the band's own lower half already separates the first row from
				// the next, the way Sidebar.Footer stacks its rows flush.
				"grid grid-cols-1 grid-rows-(--sidebar-header-height,4.5rem) shrink-0 items-center px-3",
				// When expanded, the adjacent AppLayout.Content contributes the
				// trailing card gutter with its own margin, so trim the sidebar's
				// own trailing inset to keep dividers and rows optically centered
				// between the viewport edge and content card.
				"group-data-[state=expanded]/sidebar-nav:pr-1",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

type SidebarBodyProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The scrollable middle region of a `Sidebar.Nav`, growing to fill the space
 * between `Sidebar.Header` and `Sidebar.Footer`. Holds the navigation
 * `Sidebar.Group` children. Overflowing edges fade out via the
 * `scroll-fade-y` mask; inside the collapsed icon rail the scrollbar and its
 * reserved gutter are hidden and the fade is the only overflow signal.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarbody
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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

type SidebarFooterProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The bottom container of a `Sidebar.Nav`, pinned below the scrollable
 * `Sidebar.Body`. Typically holds cross-product items and the account/user
 * switcher row (`Sidebar.SwitcherTrigger` with an
 * [Avatar](https://mantle.ngrok.com/components/data-display/avatar)).
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarfooter
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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

type SidebarGroupContextValue = {
	/**
	 * The id of the `Sidebar.GroupLabel` currently mounted in this group — the
	 * consumer's own `id` when they pass one, else the label's generated id —
	 * or `null` while no label is mounted, so the list's `aria-labelledby`
	 * never dangles.
	 */
	mountedLabelId: string | null;
	/**
	 * Registers/unregisters the group's label id (called by
	 * `Sidebar.GroupLabel` on mount/unmount). A stable setter, so the label's
	 * registration effect can depend on it without churning.
	 */
	setMountedLabelId: (labelId: string | null) => void;
};

const SidebarGroupContext = createContext<SidebarGroupContextValue | null>(null);

type SidebarGroupProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * A grouping container inside `Sidebar.Body` pairing an optional
 * `Sidebar.GroupLabel` with a `Sidebar.List`. When a label is present, the
 * group wires it to the list via `aria-labelledby` so assistive technology
 * announces the list with the group's name.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebargroup
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	const [mountedLabelId, setMountedLabelId] = useState<string | null>(null);
	const contextValue = useMemo<SidebarGroupContextValue>(
		() => ({ mountedLabelId, setMountedLabelId }),
		[mountedLabelId],
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

type SidebarGroupLabelProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The muted label of a `Sidebar.Group`, rendered above its `Sidebar.List`.
 * Renders a `<div>` (not a heading, so the sidebar never dictates the page's
 * heading outline); inside a `Sidebar.Group` it is automatically linked to
 * the sibling list via `aria-labelledby`. Pass `asChild` to render a heading
 * at a level you control.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebargrouplabel
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	const generatedId = useId();
	// Outside a group there is nothing to name, so the label renders no id at
	// all rather than an unreferenced generated one.
	const labelId = idProp ?? (groupContext == null ? undefined : generatedId);
	// Register the id the label actually renders with — a consumer-supplied
	// `id` included — so `Sidebar.List` stays named either way. Depends on the
	// stable setter rather than the whole context value: the registration
	// itself changes that value's identity, which would otherwise unregister
	// and re-register the label on the very next commit.
	const setMountedLabelId = groupContext?.setMountedLabelId;
	useEffect(() => {
		if (setMountedLabelId == null || labelId == null) {
			return;
		}
		setMountedLabelId(labelId);
		return () => {
			setMountedLabelId(null);
		};
	}, [setMountedLabelId, labelId]);

	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			id={labelId}
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
				"group-data-hydrated/sidebar-nav:transition-opacity group-data-hydrated/sidebar-nav:duration-200 group-data-hydrated/sidebar-nav:ease-linear group-data-hydrated/sidebar-nav:motion-reduce:transition-none",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

type SidebarListProps = ComponentProps<"ul"> & WithAsChild & WithDataSlot;

/**
 * The `<ul>` list of navigation rows inside a `Sidebar.Group`. When the group
 * has a `Sidebar.GroupLabel`, the list is announced with the group's name via
 * `aria-labelledby`.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarlist
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
			aria-labelledby={ariaLabelledBy ?? groupContext?.mountedLabelId ?? undefined}
			data-slot={joinDataSlot(dataSlot, "sidebar-list")}
			className={cx("mb-2 space-y-px", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

type SidebarItemProps = ComponentProps<"li"> & WithAsChild & WithDataSlot;

/**
 * A single `<li>` row of a `Sidebar.List`. A plain wrapper — the interactive
 * element is the `Sidebar.ItemButton` child, so props, `ref`, and `className`
 * all target the list item itself.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebaritem
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
			className={cx("list-none", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The chrome every row in the panel shares — `Sidebar.ItemButton` and
 * `Sidebar.SearchTrigger`.
 *
 * Shared rather than duplicated because "these are the same row" *is* the
 * contract: a search row whose geometry drifts from the navigation rows below it
 * reads as a foreign control, and in the collapsed icon rail it has to be the
 * same 28px chip in the same column. Both parts add their own state styling on
 * top (`data-current` for a nav row, the revealed shortcut hint for search).
 */
const rowClassName = [
	"ring-focus-accent flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 text-left font-normal transition-none focus:outline-hidden focus-visible:ring-4",
	"text-body hover:text-strong hover:bg-neutral-500/10",
	// A row composed as a menu or dialog trigger stays highlighted while the
	// surface it opens is open, matching Sidebar.SwitcherTrigger.
	"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
	// In the collapsed icon rail the row returns to its original 28px square
	// chip. ml-1 keeps body and footer icons aligned with their expanded
	// position and the switcher indicators.
	"group-data-[state=collapsed]/sidebar-nav:ml-1",
	"group-data-[state=collapsed]/sidebar-nav:w-7",
	"group-data-[state=collapsed]/sidebar-nav:p-1",
];

type SidebarItemButtonProps = ComponentProps<"button"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Marks this row as the current page: sets `aria-current="page"` and the
		 * `data-current` styling state. Consumers control it from their router,
		 * e.g. `current={pathname === "/endpoints"}`.
		 *
		 * A composed child that sets `aria-current="page"` itself — react-router's
		 * `NavLink` does — already gets the current-row treatment, so it needs no
		 * `current`. This prop is for the rows whose parent knows.
		 */
		current?: boolean;
	};

/**
 * The interactive row of a `Sidebar.Item`: a leading icon slot and a
 * truncating label. Renders a `<button>` by default; pass `asChild` to
 * compose with a router link. `current` sets `aria-current="page"` and the
 * `data-current` visual state.
 *
 * The current-row treatment follows either attribute, so a composed child that
 * marks itself as the current page gets it without `current` — a react-router
 * `NavLink` needs nothing but its `to`, since it already resolved the match the
 * parent would otherwise re-derive:
 *
 * ```tsx
 * <Sidebar.ItemButton asChild>
 *   <NavLink to="/endpoints">
 *     <GraphIcon />
 *     Endpoints
 *   </NavLink>
 * </Sidebar.ItemButton>
 * ```
 *
 * The row sizes its **leading** icon to 20px and leaves trailing visuals — a
 * caret, a count, a status dot — to size themselves, so a row composed with
 * `DropdownMenu.Trigger asChild` can end in `<CaretDownIcon className="text-muted
 * ml-auto size-4 shrink-0" />` and stays highlighted while its menu is open
 * (`data-state="open"`, supplied by the trigger). Give that menu the same width
 * floor the switcher rows use — `className="min-w-(--sidebar-row-width)"` — so
 * it keeps the expanded row's width instead of shrinking to this row's 28px
 * rail chip (see `Sidebar.SwitcherTrigger` for the whole contract).
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-current` | present when `current` | Presence-only — never `"false"`, since the `data-current:` variant matches the attribute's existence. Styles the current row. |
 * | `aria-current` | `"page"` when `current` | Set alongside `data-current`. The current-row styling follows *either*, so a composed child that marks itself (react-router's `NavLink`) gets the treatment without the prop. |
 * | `data-state` | `"open"` | **Read, not stamped** — supplied by a composing `DropdownMenu.Trigger` / `Dialog.Trigger`. The row styles against it so it stays highlighted while its menu is open. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebaritembutton
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
				rowClassName,
				// The current row is styled from either source of the same truth.
				// `current` sets both attributes, but a composed child can set
				// `aria-current="page"` on its own — react-router's `NavLink` does —
				// and then the router already knows what the parent would have had to
				// re-derive with `useMatch` to pass `current`.
				"data-current:bg-neutral-500/15 data-current:text-strong",
				"aria-[current=page]:bg-neutral-500/15 aria-[current=page]:text-strong",
				// Only the leading icon is pinned to 20px: trailing visuals (a menu
				// caret, a count, a status dot) size themselves, so composing one
				// does not need an `!` override to escape this rule.
				"[&>svg]:text-muted hover:[&>svg]:text-strong data-current:[&>svg]:text-strong aria-[current=page]:[&>svg]:text-strong [&>svg:first-child]:size-5 [&>svg]:shrink-0",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

type SidebarSearchTriggerProps = ComponentProps<"button"> &
	WithDataSlot &
	// `shortcut` and `asChild` are mutually exclusive: the hint is a sibling this
	// part renders after `children`, and a slotted child is cloned, not wrapped —
	// there is nowhere to put a sibling. With `asChild` the row's whole content is
	// yours, hint included; `group-hover:`/`group-focus-visible:` still work,
	// because the row keeps its `group` class either way.
	(
		| {
				/**
				 * Compose the search row's styling onto your own element. Then the
				 * row's entire content is yours — including any shortcut hint, which
				 * `shortcut` cannot add to a cloned child.
				 */
				asChild: true;
				shortcut?: never;
		  }
		| {
				/**
				 * Compose the search row's styling onto your own element. Then the
				 * row's entire content is yours — including any shortcut hint, which
				 * `shortcut` cannot add to a cloned child.
				 */
				asChild?: false;
				/**
				 * The keyboard hint for the chord that opens the same palette — usually
				 * `<><MetaKey /><Kbd>K</Kbd></>`.
				 *
				 * Rendered pinned to the end of the row and **revealed only on hover or
				 * keyboard focus**, so the row reads as a quiet navigation item at rest
				 * and teaches the chord at the moment a user reaches for it. It is
				 * `aria-hidden` and dropped outright in the collapsed rail: the chord is
				 * announced by the `aria-keyshortcuts` that `Command.SearchTrigger`
				 * adds, so repeating it here would announce it twice.
				 *
				 * Passed rather than built in, so the sidebar does not have to know
				 * which chord your palette binds.
				 */
				shortcut?: ReactNode;
		  }
	);

/**
 * The search row — the row that opens a search or command palette.
 *
 * Put it at the top of `Sidebar.Body`, above the first `Sidebar.Group`: it lands
 * in the same `px-3` gutter as the navigation rows, so it shares their column in
 * both panel states, and it scrolls with them.
 *
 * `Sidebar.Header`, under the switcher, also works, and pins the row above the
 * scrolling body instead. The switcher stays the header's first child, so it
 * keeps the `--sidebar-header-height` band an `AppLayout.Header` toolbar
 * matches, and this row takes the next row down — the header grows for it, so
 * nothing needs a token override. The header reserves no scrollbar gutter, so on
 * a platform whose scrollbars take space the row runs wider than the navigation
 * rows below it, which sit inside `Sidebar.Body`'s reserved gutter.
 *
 * It is deliberately a navigation row and not a text field. The row is the same
 * chrome as a `Sidebar.ItemButton` — same height, padding, radius, hover, and
 * the same 28px chip in the collapsed icon rail — because a search entry point
 * in a sidebar is one of the rows, not a form control wedged among them. The
 * `shortcut` hint appears on hover or focus and is otherwise invisible, which
 * keeps the resting panel quiet.
 *
 * A styled button only — it is not wired to any state. Compose it with
 * [`Command.SearchTrigger`](https://mantle.ngrok.com/components/navigation/command#commandsearchtrigger),
 * which supplies the dialog wiring, `aria-keyshortcuts`, and the behavior that
 * makes typing or pasting into the row open the palette with that text already
 * in the query. Wrap the pair in `Sidebar.Tooltip` so the row keeps a visible
 * label once the panel collapses.
 *
 * Like every row, the rail clips everything after the leading icon rather than
 * removing it, so the button keeps its accessible name as a chip.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-state` | `"open"` \| `"closed"` | **Read, not stamped** — supplied by the composing `Command.SearchTrigger` / `Dialog.Trigger`. The row stays highlighted while its palette is open. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarsearchtrigger
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <Sidebar.SwitcherTrigger>
 *         <GlobeIcon />
 *         <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *       </Sidebar.SwitcherTrigger>
 *     </Sidebar.Header>
 *     <Sidebar.Body>
 *       <Command.DialogRoot>
 *         <Sidebar.Tooltip label="Search">
 *           <Command.SearchTrigger>
 *             <Sidebar.SearchTrigger
 *               shortcut={
 *                 <>
 *                   <MetaKey />
 *                   <Kbd>K</Kbd>
 *                 </>
 *               }
 *             >
 *               <MagnifyingGlassIcon />
 *               <span className="min-w-0 flex-1 truncate">Search</span>
 *             </Sidebar.SearchTrigger>
 *           </Command.SearchTrigger>
 *         </Sidebar.Tooltip>
 *         <Command.DialogContent>
 *           <Command.Input placeholder="Search endpoints, agents, and settings..." />
 *           <Command.List>
 *             <Command.Empty>No results found.</Command.Empty>
 *           </Command.List>
 *         </Command.DialogContent>
 *       </Command.DialogRoot>
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
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const SearchTrigger = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	shortcut,
	type,
	...props
}: SidebarSearchTriggerProps) => {
	const Comp = asChild ? Slot : "button";

	// Built up rather than rendered inline so the `asChild` case hands `Slot`
	// exactly one child: `{shortcut != null && …}` would leave a `false` beside
	// the cloned element, which `Children.only` rejects.
	const content =
		shortcut == null ? (
			children
		) : (
			<>
				{children}
				<span
					aria-hidden
					// -mr-1 pulls the chips to the row's optical edge past the row
					// padding; the reveal is CSS-only so nothing re-renders on hover.
					className={cx(
						"pointer-events-none -mr-1 ml-auto inline-flex shrink-0 items-center gap-0.5 opacity-0 select-none",
						"group-hover:opacity-100 group-focus-visible:opacity-100",
						// The rail has room for the icon and nothing else, and the chord is
						// already announced via aria-keyshortcuts, so drop the hint outright
						// instead of letting it fight the 28px chip.
						"group-data-[state=collapsed]/sidebar-nav:hidden",
						// Quiet inline keys here rather than the standalone chips `Kbd`
						// renders elsewhere.
						"[&_kbd]:text-body [&_kbd]:h-5 [&_kbd]:min-w-5 [&_kbd]:bg-neutral-500/20 [&_kbd]:px-1 [&_kbd]:text-xs [&_kbd]:font-normal",
					)}
				>
					{shortcut}
				</span>
			</>
		);

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-search-trigger")}
			type={asChild ? type : (type ?? "button")}
			className={cx(
				// `group` scopes the shortcut hint's reveal to this row.
				"group",
				rowClassName,
				// The leading magnifier matches a nav row's leading icon, hover
				// brightening included — without it the row's label lifts to
				// `text-strong` while its icon stays muted, which no nav row does.
				"[&>svg:first-child]:text-muted hover:[&>svg:first-child]:text-strong [&>svg:first-child]:size-5 [&>svg]:shrink-0",
				className,
			)}
			{...props}
		>
			{content}
		</Comp>
	);
};

type SidebarSwitcherTriggerProps = ComponentProps<"button"> & WithAsChild & WithDataSlot;

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
 * A menu opened from the row should be as wide as the row: `width="trigger"`
 * does that while the panel is expanded, but the row shrinks to a 36px chip in
 * the icon rail and would drag the menu down to it. Floor the menu at the
 * expanded row width with `className="min-w-(--sidebar-row-width)"` — the
 * token `mantle.css` declares at `:root` for exactly this, since the menu
 * renders in a portal and inherits nothing from the panel. The floor is a
 * no-op while the panel is expanded (the row already measures that wide), and
 * inert in the mobile sheet as long as its row is the wider of the two
 * (`--sidebar-width-mobile` minus `1.5rem` and the sheet's 1px border, vs
 * `--sidebar-width` minus `1rem`; 263px vs 192px at the defaults) — so widen
 * `--sidebar-width-mobile` whenever you widen `--sidebar-width`, or the floor
 * overhangs the sheet.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-state` | `"open"` | **Read, not stamped** — supplied by the composing `DropdownMenu.Trigger` / `Dialog.Trigger`. The row styles against it so it stays highlighted while its menu is open. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarswitchertrigger
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const SwitcherTrigger = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	type,
	...props
}: SidebarSwitcherTriggerProps) => {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "sidebar-switcher-trigger")}
			type={asChild ? type : (type ?? "button")}
			className={cx(
				"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-2 rounded-[0.625rem] py-1 pr-1.5 pl-1 text-left font-medium transition-none",
				"data-state-open:bg-neutral-500/15 data-state-open:text-strong",
				"ring-focus-accent focus:outline-hidden focus-visible:ring-4",
				// The leading account/product tile uses rounded-md (6px) and
				// sits 4px from the edge, so the outer switcher radius is 10px.
				// Product/account indicators are a little larger than their
				// source components by default; the tighter padding keeps the
				// switcher row at the same net 36px height while preserving
				// prototype spacing on the trailing action icon.
				"*:first:size-7",
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

/**
 * The props for `Sidebar.Tooltip`. `Tooltip.Content`'s props — so `className`,
 * `style`, `ref`, `asChild`, and any `data-*` reach the tooltip surface — except
 * the parts this row owns: `children` is the row being labeled (not the tooltip
 * body, which is `label`), and `side` becomes optional with a sidebar default.
 */
type SidebarTooltipProps = Omit<ComponentProps<typeof Tooltip.Content>, "children" | "side"> &
	WithDataSlot & {
		/**
		 * The row this labels — a `Sidebar.ItemButton` or `Sidebar.SwitcherTrigger`,
		 * optionally already wrapped in a `DropdownMenu.Trigger asChild`.
		 *
		 * A single element, required: `Tooltip.Trigger asChild` clones its child, so
		 * text renders nothing a pointer can hover and no children renders no row at
		 * all — both silently.
		 */
		children: ReactElement;
		/**
		 * What the tooltip says. Normally the row's own label text: the rail clips the
		 * visible one, so this is what a sighted pointer user reads.
		 */
		label: ReactNode;
		/**
		 * The keyboard chord that reaches the same row, rendered after the label —
		 * usually `<><MetaKey /><Kbd>K</Kbd></>`. The rail hides the row's own
		 * shortcut hint along with its label, so the tooltip is where a pointer user
		 * can still learn the chord. The chips are `aria-hidden`: a tooltip is wired
		 * as its row's `aria-describedby`, and the chord is already announced by the
		 * row's `aria-keyshortcuts`.
		 *
		 * Passed rather than built in, so the sidebar does not have to know which
		 * chord the row's palette or action binds.
		 */
		shortcut?: ReactNode;
		/**
		 * Which side of the row the tooltip opens on. The rail sits at the inline
		 * start of the viewport, so the default points the tooltip away from it.
		 *
		 * @default "right"
		 */
		side?: ComponentProps<typeof Tooltip.Content>["side"];
	};

// Polymorphism forwards to Radix's own escape hatch: the props are
// `Tooltip.Content`'s, so `asChild` swaps the tooltip surface through the
// primitive that already implements it rather than through mantle's `Slot`.
/**
 * Labels a sidebar row while — and only while — the desktop panel is collapsed
 * to the icon rail. Wrap it around a `Sidebar.ItemButton` or
 * `Sidebar.SwitcherTrigger`.
 *
 * The collapsed rail keeps every row's label in the accessibility tree (clipped,
 * not removed), which serves screen-reader users but leaves a sighted pointer
 * user with an unlabeled icon column. This restores the label for them without
 * duplicating it for anyone else: expanded rows already read their own text, and
 * the mobile sheet shows full labels, so the collapsed desktop rail is the only
 * state that shows a label at all.
 *
 * It opens the way any tooltip does — the pointer entering the row, or focus
 * reaching it — and the rail state vetoes it: the expanded panel and the mobile
 * sheet keep the row at `data-state="closed"` with no `aria-describedby`, and
 * toggling the rail dismisses whatever was showing, so collapsing the panel
 * cannot pop a label under a pointer that has already moved on.
 *
 * **Requires a `TooltipProvider` ancestor**, like any `Tooltip.Root` — mount one
 * at your app root. This part deliberately does not mount its own, so the
 * app-wide tooltip delay stays app-wide rather than being overridden per row.
 * The one provider setting it does override is hoverable content: a rail label
 * holds nothing to hover into, so the pointer leaving the row closes it.
 *
 * It composes with a menu trigger: nest `DropdownMenu.Root >
 * Sidebar.Tooltip > DropdownMenu.Trigger asChild > Sidebar.ItemButton` for a
 * row that opens a menu *and* labels itself in the rail. `DropdownMenu.Root` must
 * stay **outside** the tooltip — it is renderless, and `Tooltip.Trigger asChild`
 * needs a real element to clone.
 *
 * `children` is the row; `label` is what the tooltip says. Every other prop is
 * `Tooltip.Content`'s and lands on the tooltip surface — `className`, `style`,
 * `ref`, `data-*`, positioning props such as `align` and `sideOffset`, and
 * `asChild`, which Radix's `Tooltip.Content` implements itself. `side` defaults
 * to `"right"` so the tooltip opens away from the rail.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebartooltip
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <Sidebar.Root>
 *     <Sidebar.Nav aria-label="Main">
 *       <Sidebar.Body>
 *         <Sidebar.Group>
 *           <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *           <Sidebar.List>
 *             <Sidebar.Item>
 *               <Sidebar.Tooltip label="Endpoints">
 *                 <Sidebar.ItemButton asChild current>
 *                   <a href="/endpoints">
 *                     <GraphIcon />
 *                     Endpoints
 *                   </a>
 *                 </Sidebar.ItemButton>
 *               </Sidebar.Tooltip>
 *             </Sidebar.Item>
 *           </Sidebar.List>
 *         </Sidebar.Group>
 *       </Sidebar.Body>
 *       <Sidebar.Footer>
 *         <DropdownMenu.Root>
 *           <Sidebar.Tooltip label="Help">
 *             <DropdownMenu.Trigger asChild>
 *               <Sidebar.ItemButton>
 *                 <QuestionIcon />
 *                 Help
 *               </Sidebar.ItemButton>
 *             </DropdownMenu.Trigger>
 *           </Sidebar.Tooltip>
 *           <DropdownMenu.Content>…</DropdownMenu.Content>
 *         </DropdownMenu.Root>
 *       </Sidebar.Footer>
 *     </Sidebar.Nav>
 *     <Sidebar.Trigger />
 *   </Sidebar.Root>
 * </TooltipProvider>
 * ```
 */
const SidebarTooltip = ({
	children,
	"data-slot": dataSlot,
	label,
	shortcut,
	side = "right",
	...props
}: SidebarTooltipProps) => {
	const { isMobile, open } = useSidebarContext("Tooltip");
	const isCollapsedRail = !isMobile && !open;
	const [labelOpen, setLabelOpen] = useState(false);
	const [previousCollapsedRail, setPreviousCollapsedRail] = useState(isCollapsedRail);

	// A rail flip drops the label. Radix opens on the pointer entering the trigger
	// and on focus reaching it, both of which can happen in a rail state that has
	// no business showing a label; without this, the next flip cashes that pending
	// state in and a tooltip appears under a pointer that is somewhere else
	// entirely. Reset during render (React's sanctioned "adjust state when a prop
	// changes" pattern) so Radix never sees the stale value.
	if (previousCollapsedRail !== isCollapsedRail) {
		setPreviousCollapsedRail(isCollapsedRail);
		setLabelOpen(false);
	}

	/**
	 * Mirrors Radix's open state, clamped so it can only ever hold `true` in the
	 * one rail state that shows a label.
	 *
	 * The clamp is load-bearing, not belt-and-braces. Radix reports every open it
	 * wants, including ones the veto below discards, so an unclamped mirror holds
	 * `true` through the whole expanded panel — and a repeat `open` (a menu on the
	 * row closing and restoring focus to it, say) then sets the mirror to a value
	 * it already has. React keeps that no-op update queued, and replays it after
	 * the rail-flip reset commits, which lands `true` in the collapsed rail with
	 * nothing hovering the row: the original bug, one path over.
	 */
	const setLabelOpenWhenRailShowsLabels = (nextOpen: boolean) => {
		setLabelOpen(nextOpen && isCollapsedRail);
	};

	return (
		/*
		 * The rail state vetoes the open state rather than withholding the Content:
		 * Radix's own pointer close path lives inside `Tooltip.Content`, so a Root
		 * left to its own devices while the Content is unmounted latches open with
		 * nothing to close it — and meanwhile points the row's `aria-describedby` at
		 * an id that is not in the document. Owning `open` keeps the expanded panel
		 * and the mobile sheet at `data-state="closed"`, which is the truth.
		 *
		 * The Root itself stays mounted at every rail state: unmounting it would
		 * unmount the Trigger with it, dropping focus off the row the user was on.
		 *
		 * `disableHoverableContent` moves the close path onto the Trigger, which is
		 * always mounted. A rail label has nothing to hover into — per the WAI-ARIA
		 * tooltip pattern it holds no interactive content — so trading the grace
		 * area for a close that cannot depend on what is mounted is free.
		 *
		 * `className` is not destructured on purpose: it rides `props` into
		 * `Tooltip.Content`, which already merges it last with `cx`, and this row
		 * adds no classes of its own to compose ahead of it.
		 */
		<Tooltip.Root
			disableHoverableContent
			onOpenChange={setLabelOpenWhenRailShowsLabels}
			open={isCollapsedRail && labelOpen}
		>
			<Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
			<Tooltip.Content data-slot={joinDataSlot(dataSlot, "sidebar-tooltip")} side={side} {...props}>
				<TooltipLabel label={label} shortcut={shortcut} />
			</Tooltip.Content>
		</Tooltip.Root>
	);
};

type SidebarSeparatorProps = ComponentProps<typeof Separator> & WithDataSlot;

/**
 * An inset hairline between sidebar regions. Composes the mantle `Separator`,
 * staying aligned with the `px-3` content padding of `Sidebar.Body` and
 * `Sidebar.Footer` (it deliberately does not run edge to edge) with `my-3`
 * breathing room above and below. When collapsed to the icon rail, it widens
 * to the same 36px chip width as `Sidebar.SwitcherTrigger`, balancing the
 * adjacent app-content gutter that sits outside the rail.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarseparator
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Sidebar.Nav aria-label="Main">
 *     <Sidebar.Header>
 *       <DropdownMenu.Root>
 *         <DropdownMenu.Trigger asChild>
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const SidebarSeparator = ({
	className,
	"data-slot": dataSlot,
	...props
}: SidebarSeparatorProps) => (
	<Separator
		data-slot={joinDataSlot(dataSlot, "sidebar-separator")}
		className={cx("my-3", "group-data-[state=collapsed]/sidebar-nav:w-9", className)}
		{...props}
	/>
);

/**
 * A composable, collapsible app-navigation sidebar. `Sidebar.Root` owns the
 * state (no DOM); `Sidebar.Nav` renders the panel — inline on desktop,
 * collapsing to a skinny icon rail, and a left-side `Sheet` below the root's
 * `mobileBreakpoint`; and `Sidebar.Trigger` toggles it from anywhere under the
 * root (typically an `AppLayout.Header`). Navigation is grouped with
 * `Sidebar.Group`/`Sidebar.GroupLabel`/`Sidebar.List`, and the switcher rows
 * (app switcher up top, account/user down bottom) compose
 * `Sidebar.SwitcherTrigger` with your own `DropdownMenu` or `Dialog`.
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
 * │   │   └── Sidebar.SwitcherTrigger
 * │   ├── Sidebar.Body
 * │   │   ├── Sidebar.SearchTrigger
 * │   │   └── Sidebar.Group
 * │   │       ├── Sidebar.GroupLabel
 * │   │       └── Sidebar.List
 * │   │           └── Sidebar.Item
 * │   │               └── Sidebar.Tooltip
 * │   │                   └── Sidebar.ItemButton
 * │   └── Sidebar.Footer
 * │       ├── Sidebar.ItemButton
 * │       ├── Sidebar.Separator
 * │       └── Sidebar.SwitcherTrigger
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
 *           <Sidebar.SwitcherTrigger>
 *             <GlobeIcon />
 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
 *           <Sidebar.SwitcherTrigger>
 *             <Avatar.Root appearance="square" colorSeed="acc_123">
 *               <Avatar.Fallback name="Acme Corp" />
 *             </Avatar.Root>
 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
 *           </Sidebar.SwitcherTrigger>
 *         </DropdownMenu.Trigger>
 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
 *       </DropdownMenu.Root>
 *     </Sidebar.Footer>
 *   </Sidebar.Nav>
 *   <Sidebar.Trigger />
 * </Sidebar.Root>
 * ```
 */
const Sidebar = {
	/**
	 * The state owner for a sidebar. Renders no DOM — carries expanded /
	 * mobile-sheet state to every part below it so the trigger can live in the
	 * app shell without coupling it to the sidebar.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarroot
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-state` | `"expanded"` \| `"collapsed"` | On the desktop panel surface. Mirrors the root's expanded state and drives the width collapse to the icon rail; descendant parts style off it with `group-data-[state=collapsed]/sidebar-nav:`. |
	 * | `data-hydrated` | present after hydration | Presence-only, desktop panel surface. The CSS-side twin of the `isHydrated` gate: descendant collapse transitions are enabled only under `group-data-hydrated/sidebar-nav:`, so an SSR state correction snaps instead of animating on page load. |
	 * | `data-mobile` | present in the mobile sheet | Presence-only. Marks the `Sheet.Content` presentation used below the root's `mobileBreakpoint`. |
	 * | `data-state` | `"open"` \| `"closed"` | In the mobile sheet only, where the panel *is* the `Sheet`'s Radix dialog content element and Radix owns the attribute — the sheet's open/close animation state, not the desktop expanded state. Consumers style against it too. |
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarnav
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-state` | `"expanded"` \| `"collapsed"` | Mirrors what the trigger toggles: the mobile sheet below the root's `mobileBreakpoint`, the desktop panel otherwise. Pairs with `aria-expanded`. |
	 * | `data-appearance` | `"filled"` \| `"ghost"` \| `"outlined"` | Read, not stamped: the underlying `IconButton` reflects its `appearance`, which this part defaults to `"ghost"`. |
	 * | `data-intent` | `"neutral"` | Read, not stamped: the underlying `IconButton` reflects its `intent`, and it draws the neutral tone only. |
	 * | `data-size` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | Read, not stamped: the underlying `IconButton` reflects its `size` and its own `"md"` default. |
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebartrigger
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Trigger,
	/**
	 * The pinned top container of the panel, typically holding the app
	 * switcher (`Sidebar.SwitcherTrigger` + `DropdownMenu`/`Dialog`). Its first
	 * child owns the band that aligns the switcher with an `AppLayout.Header`;
	 * later rows stack below the band.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarheader
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarbody
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarfooter
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebargroup
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebargrouplabel
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarlist
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebaritem
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-current` | present when `current` | Presence-only — never `"false"`, since the `data-current:` variant matches the attribute's existence. Styles the current row. |
	 * | `aria-current` | `"page"` when `current` | Set alongside `data-current`. The current-row styling follows *either*, so a composed child that marks itself (react-router's `NavLink`) gets the treatment without the prop. |
	 * | `data-state` | `"open"` | **Read, not stamped** — supplied by a composing `DropdownMenu.Trigger` / `Dialog.Trigger`. The row styles against it so it stays highlighted while its menu is open. |
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebaritembutton
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	ItemButton,
	/**
	 * The search row: an item-shaped row whose `shortcut` hint appears on hover or
	 * focus, and the same chip as any other row in the collapsed icon rail. Goes
	 * in `Sidebar.Body` to scroll with the navigation, or in `Sidebar.Header` to
	 * stay pinned above it. Not state-wired — compose with
	 * `Command.SearchTrigger`.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-state` | `"open"` \| `"closed"` | **Read, not stamped** — supplied by the composing `Command.SearchTrigger` / `Dialog.Trigger`. Style the row while its palette is open with `data-state-open:`. |
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarsearchtrigger
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <Sidebar.SwitcherTrigger>
	 *         <GlobeIcon />
	 *         <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *       </Sidebar.SwitcherTrigger>
	 *     </Sidebar.Header>
	 *     <Sidebar.Body>
	 *       <Command.DialogRoot>
	 *         <Sidebar.Tooltip label="Search">
	 *           <Command.SearchTrigger>
	 *             <Sidebar.SearchTrigger
	 *               shortcut={
	 *                 <>
	 *                   <MetaKey />
	 *                   <Kbd>K</Kbd>
	 *                 </>
	 *               }
	 *             >
	 *               <MagnifyingGlassIcon />
	 *               <span className="min-w-0 flex-1 truncate">Search</span>
	 *             </Sidebar.SearchTrigger>
	 *           </Command.SearchTrigger>
	 *         </Sidebar.Tooltip>
	 *         <Command.DialogContent>
	 *           <Command.Input placeholder="Search endpoints, agents, and settings..." />
	 *           <Command.List>
	 *             <Command.Empty>No results found.</Command.Empty>
	 *           </Command.List>
	 *         </Command.DialogContent>
	 *       </Command.DialogRoot>
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
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	SearchTrigger,
	/**
	 * The styled switcher row for the header/footer. Not state-wired — compose
	 * with `DropdownMenu.Trigger asChild` or `Dialog.Trigger asChild`.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute | Value | Description |
	 * | --- | --- | --- |
	 * | `data-state` | `"open"` | **Read, not stamped** — supplied by the composing `DropdownMenu.Trigger` / `Dialog.Trigger`. The row styles against it so it stays highlighted while its menu is open. |
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarswitchertrigger
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	SwitcherTrigger,
	/**
	 * Labels a row while the panel is collapsed to the icon rail — wrap it
	 * around a `Sidebar.ItemButton` or `Sidebar.SwitcherTrigger`. Requires a
	 * `TooltipProvider` ancestor. Takes `Tooltip.Content`'s props (including
	 * `asChild`) on the tooltip surface; `side` defaults to `"right"`.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebartooltip
	 *
	 * @example
	 * ```tsx
	 * <TooltipProvider>
	 *   <Sidebar.Root>
	 *     <Sidebar.Nav aria-label="Main">
	 *       <Sidebar.Header>
	 *         <DropdownMenu.Root>
	 *           <DropdownMenu.Trigger asChild>
	 *             <Sidebar.SwitcherTrigger>
	 *               <GlobeIcon />
	 *               <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *               <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *             </Sidebar.SwitcherTrigger>
	 *           </DropdownMenu.Trigger>
	 *           <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
	 *         </DropdownMenu.Root>
	 *       </Sidebar.Header>
	 *       <Sidebar.Body>
	 *         <Sidebar.Group>
	 *           <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
	 *           <Sidebar.List>
	 *             <Sidebar.Item>
	 *               <Sidebar.Tooltip label="Endpoints">
	 *                 <Sidebar.ItemButton asChild current>
	 *                   <a href="/endpoints">
	 *                     <GraphIcon />
	 *                     Endpoints
	 *                   </a>
	 *                 </Sidebar.ItemButton>
	 *               </Sidebar.Tooltip>
	 *             </Sidebar.Item>
	 *           </Sidebar.List>
	 *         </Sidebar.Group>
	 *       </Sidebar.Body>
	 *       <Sidebar.Footer>
	 *         <Sidebar.Separator />
	 *         <DropdownMenu.Root>
	 *           <Sidebar.Tooltip label="Acme Corp">
	 *             <DropdownMenu.Trigger asChild>
	 *               <Sidebar.SwitcherTrigger>
	 *                 <Avatar.Root appearance="square" colorSeed="acc_123">
	 *                   <Avatar.Fallback name="Acme Corp" />
	 *                 </Avatar.Root>
	 *                 <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *               </Sidebar.SwitcherTrigger>
	 *             </DropdownMenu.Trigger>
	 *           </Sidebar.Tooltip>
	 *           <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
	 *         </DropdownMenu.Root>
	 *       </Sidebar.Footer>
	 *     </Sidebar.Nav>
	 *     <Sidebar.Trigger />
	 *   </Sidebar.Root>
	 * </TooltipProvider>
	 * ```
	 */
	Tooltip: SidebarTooltip,
	/**
	 * An inset hairline between sidebar regions, aligned with the content
	 * padding.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarseparator
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <Sidebar.Nav aria-label="Main">
	 *     <Sidebar.Header>
	 *       <DropdownMenu.Root>
	 *         <DropdownMenu.Trigger asChild>
	 *           <Sidebar.SwitcherTrigger>
	 *             <GlobeIcon />
	 *             <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
	 *             <CaretDownIcon className="text-muted size-4 shrink-0" />
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
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
	 *           <Sidebar.SwitcherTrigger>
	 *             <Avatar.Root appearance="square" colorSeed="acc_123">
	 *               <Avatar.Fallback name="Acme Corp" />
	 *             </Avatar.Root>
	 *             <span className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Acme Corp</span>
	 *           </Sidebar.SwitcherTrigger>
	 *         </DropdownMenu.Trigger>
	 *         <DropdownMenu.Content width="trigger" className="min-w-(--sidebar-row-width)">…</DropdownMenu.Content>
	 *       </DropdownMenu.Root>
	 *     </Sidebar.Footer>
	 *   </Sidebar.Nav>
	 *   <Sidebar.Trigger />
	 * </Sidebar.Root>
	 * ```
	 */
	Separator: SidebarSeparator,
} as const;

export {
	//,
	Sidebar,
	useSidebar,
};

export type {
	//,
	SidebarMobileBreakpoint,
	SidebarState,
};
