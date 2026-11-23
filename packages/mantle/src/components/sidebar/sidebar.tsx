"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/SidebarSimple";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	startTransition,
} from "react";
import invariant from "tiny-invariant";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useIsBelowBreakpoint } from "../../hooks/use-breakpoint.js";
import { useIsApplePlatform } from "../../hooks/use-is-apple-platform.js";
import { useIsHydratedAfterPaint } from "../../hooks/use-is-hydrated-after-paint.js";
import type { SelfClosingWithAsChild, WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import {
	Content as NativeContent,
	closeAfterExit,
	createScope,
	moveDialog,
	Root as NativeRoot,
} from "../dialog/native-primitive.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { isApplePlatform } from "../../utils/platform.js";
import type { IconButtonProps } from "../button/icon-button.js";
import { IconButton } from "../button/icon-button.js";
import { Separator } from "../separator/separator.js";
import { contentSurfaceClassName } from "../sheet/presentation.js";
import { Slot } from "../slot/index.js";
import * as Tooltip from "../tooltip/tooltip-parts.js";
import { SidebarWidthRequestContext } from "./width-request-context.js";

/**
 * The breakpoints below which `Sidebar.Nav` swaps from the inline desktop
 * panel to the mobile sheet presentation. Kept to a closed set because the
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
 * Maps each supported `mobileBreakpoint` to the static visibility class that
 * hides the desktop panel below the breakpoint until hydration. The server
 * cannot know the viewport, and after hydration `isMobile` picks the
 * presentation on its own (see `Sidebar.Nav`). A complete `Record` (not cva) so
 * adding a breakpoint without its class is a compile error.
 */
const navVisibilityClassName: Record<SidebarMobileBreakpoint, string> = {
	sm: "max-sm:not-data-hydrated:hidden",
	md: "max-md:not-data-hydrated:hidden",
	lg: "max-lg:not-data-hydrated:hidden",
};

/**
 * The desktop panel: an inline column that collapses by animating its width
 * down to its icons, with its content still interactive and in the
 * accessibility tree. `bg-base` lives on this surface, not the inner nav, so a
 * consumer `bg-*` replaces it. Why the width transition has one negated gate:
 * an SSR state correction must snap, not animate shut on page load, and bare
 * utilities let a consumer `transition-none` or `duration-*` override the
 * default through tailwind-merge.
 */
const desktopPanelClassName =
	"group/sidebar-nav bg-base relative h-full w-(--sidebar-width,13rem) shrink-0 overflow-hidden not-data-expanded:w-(--sidebar-width-icon,3.25rem) transition-[width] duration-200 ease-out-strong motion-reduce:transition-none not-data-hydrated:transition-none";

/**
 * The mobile panel: the surface of a native `Sheet` on the left, at
 * `--sidebar-width-mobile`.
 */
/**
 * The slide of the mobile sheet. It keys on the `<dialog>`: `[open]` for the
 * entry, `data-closing` for the exit, which plays before the `<dialog>`
 * closes. Why not `data-open`: a tap before hydration opens the sheet, with no
 * `data-open`.
 */
const slideClassName =
	"transition-[translate] duration-200 ease-out-strong motion-reduce:transition-none group-data-closing/native-dialog:duration-150 group-data-closing/native-dialog:-translate-x-full starting:group-open/native-dialog:-translate-x-full";

const mobilePanelClassName = cx(
	"group/sidebar-nav",
	contentSurfaceClassName({
		side: "left",
		preferredWidth: "sm:max-w-(--sidebar-width-mobile,18rem)",
	}),
	slideClassName,
	"bg-base w-(--sidebar-width-mobile,18rem) max-w-full p-0",
);

/**
 * The clock and the gates every collapse transition under `Sidebar.Nav`
 * shares, so the sidebar, its rows, and its labels move together. The nav's own
 * width transition keys its gate on itself (`not-data-hydrated:`); everything
 * inside keys on the nav's group. Bare utilities, so a consumer
 * `transition-none` or `duration-*` replaces the default through
 * tailwind-merge, and the `motion-reduce` rule wins on order at equal
 * specificity.
 */
const collapseTransitionClassName =
	"duration-200 ease-out-strong motion-reduce:transition-none group-not-data-hydrated/sidebar-nav:transition-none";

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
	 * Whether the desktop sidebar is expanded. Mirrored as presence-only
	 * `data-expanded` on `Sidebar.Nav`. `false` while the
	 * sidebar yields its width to an open `AppLayout.SidePanel`.
	 */
	open: boolean;
	/**
	 * Set the desktop expanded state. Calls `onOpenChange` and, when
	 * uncontrolled, updates the internal state. Keeps one identity across
	 * renders, so it is safe in an effect dependency list.
	 */
	setOpen: (open: boolean) => void;
	/**
	 * Whether the mobile sheet is open. Only meaningful when `isMobile`.
	 */
	openMobile: boolean;
	/**
	 * Set the mobile sheet open state. Calls `onOpenMobileChange` and, when
	 * uncontrolled, updates the internal state. Use it to close the sheet on
	 * navigation. Keeps one identity across renders, so it is safe in an effect
	 * dependency list.
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

/** The scope of the native `<dialog>` that holds `Sidebar.Nav`. */
const navScope = createScope();

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
	 * The sidebar's parts: a `Sidebar.Nav` and anything that reads the state,
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
	 * Called with the next desktop expanded state when the reader or `setOpen`
	 * changes it. A collapse or an expand that an `AppLayout.SidePanel` causes
	 * does not call it, so a cookie written here keeps the reader's preference.
	 */
	onOpenChange?: (open: boolean) => void;
	/**
	 * Controlled mobile sheet open state. Pair with `onOpenMobileChange`.
	 */
	openMobile?: boolean;
	/**
	 * Called with the next mobile sheet open state whenever it changes. An
	 * uncontrolled sheet calls it only when it opens or closes, not when
	 * `setOpenMobile` asks for the state it already has.
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
	 * platforms and `Ctrl` everywhere else, resolved per host. The two never
	 * substitute for each other, so macOS's native `Ctrl+B` ("move the caret
	 * back one character") is left alone. Combinations with `Shift`/`Alt` (e.g.
	 * the browser's own `⌘⇧B`) pass through too.
	 *
	 * The shortcut is also ignored while focus is in a text-editing or form
	 * control (an `<input>`, `<textarea>`, `<select>`, or any `contenteditable`
	 * host), because the chord is usually already bound there (`⌘B` is "bold")
	 * and this is a `window` listener that calls `preventDefault()`. That covers
	 * embedded editors like Monaco and CodeMirror, which attach to exactly those
	 * elements. Set `false` to opt out entirely.
	 *
	 * An earlier `keydown` listener that calls `preventDefault()` (on `document`,
	 * or on an element) stops the shortcut. Do not bind `⌘B` in your app as
	 * well: delete the local binding, or set `false`.
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
 * Who holds the sidebar's width while an `AppLayout.SidePanel` is in the row.
 *
 * - `"idle"`: the side panel does not need the sidebar's width.
 * - `"yielded"`: the side panel needs the width, and it collapsed the sidebar.
 * - `"kept"`: the side panel needs the width, and the reader's choice stands.
 */
type SidebarYield = "idle" | "yielded" | "kept";

/**
 * Returns who holds the sidebar's width after a render. The side panel takes
 * an expanded sidebar only at the moment it starts to need the width, so a
 * toggle by the reader after that moment stands until the panel gives the
 * width back.
 *
 * @example
 * ```ts
 * resolveSidebarYield({ current: "idle", open: true, sidePanelNeedsWidth: true }); // "yielded"
 * resolveSidebarYield({ current: "kept", open: true, sidePanelNeedsWidth: true }); // "kept"
 * resolveSidebarYield({ current: "yielded", open: false, sidePanelNeedsWidth: true }); // "kept"
 * resolveSidebarYield({ current: "yielded", open: true, sidePanelNeedsWidth: false }); // "idle"
 * ```
 */
function resolveSidebarYield({
	current,
	open,
	sidePanelNeedsWidth,
}: {
	current: SidebarYield;
	/** The reader's preference, not the state on screen. */
	open: boolean;
	sidePanelNeedsWidth: boolean;
}): SidebarYield {
	if (!sidePanelNeedsWidth) {
		return "idle";
	}
	if (current === "idle") {
		return open ? "yielded" : "kept";
	}
	// Why: a preference that changes to collapsed is a choice by the reader. A
	// controlled `open` that changes back to `true` must then expand the sidebar.
	if (current === "yielded" && !open) {
		return "kept";
	}
	return current;
}

/**
 * The key that toggles the sidebar together with the platform modifier
 * (`⌘` on macOS, `Ctrl` elsewhere). The chord is shadcn-compatible.
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
 * `Tooltip.Root`). It carries the expanded/collapsed and mobile-sheet state
 * to every part below it, so `Sidebar.Trigger` can live anywhere in the tree
 * (for example inside an `AppLayout.Header`) without coupling the app shell
 * to the sidebar.
 *
 * Render exactly one `Sidebar.Nav` per `Sidebar.Root`. Nested roots shadow
 * the outer sidebar for everything below them.
 *
 * Beside an `AppLayout.SidePanel`, an expanded sidebar collapses while the open
 * panel needs the width, and expands again when the panel gives the width
 * back. A toggle by the reader in between stands, and neither change calls
 * `onOpenChange`: `open` and `defaultOpen` stay the reader's preference.
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
	// Why a ref: `setOpenMobile` keeps one identity across renders, and it must
	// not open the sheet on desktop.
	const isMobileRef = useRef(isMobile);

	// Why refs: an inline `onOpenChange` takes a new identity on every parent
	// render, and both setters are public through `useSidebar()` as effect
	// dependencies. Why not `useCallbackRef`: it writes in a passive effect,
	// after a consumer's `useEffect` in the same commit has read the stale callback.
	const onOpenChangeRef = useRef(onOpenChange);
	const onOpenMobileChangeRef = useRef(onOpenMobileChange);
	useLayoutEffect(() => {
		onOpenChangeRef.current = onOpenChange;
		onOpenMobileChangeRef.current = onOpenMobileChange;
		isMobileRef.current = isMobile;
	});

	const isOpenControlled = openProp != null;
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const preferredOpen = isOpenControlled ? openProp : internalOpen;

	// `AppLayout.SidePanel` sets it through `SidebarWidthRequestContext`.
	const [sidePanelNeedsWidth, setSidePanelNeedsWidth] = useState(false);
	const [sidebarYield, setSidebarYield] = useState<SidebarYield>("idle");
	const nextSidebarYield = resolveSidebarYield({
		current: sidebarYield,
		open: preferredOpen,
		sidePanelNeedsWidth,
	});
	if (nextSidebarYield !== sidebarYield) {
		setSidebarYield(nextSidebarYield);
	}
	const open = preferredOpen && sidebarYield !== "yielded";

	const setOpen = useCallback(
		(next: boolean) => {
			// Why only an expand: a collapse ends the yield when the preference
			// changes, so a controlled parent that refuses it keeps the sidebar
			// collapsed.
			if (next) {
				setSidebarYield((current) => (current === "yielded" ? "kept" : current));
			}
			if (!isOpenControlled) {
				setInternalOpen(next);
			}
			onOpenChangeRef.current?.(next);
		},
		[isOpenControlled],
	);

	const isOpenMobileControlled = openMobileProp != null;
	const [internalOpenMobile, setInternalOpenMobile] = useState(false);
	const openMobile = isOpenMobileControlled ? openMobileProp : internalOpenMobile;

	// The `<dialog>` of `Sidebar.Nav` reports each open and close here. An
	// uncontrolled sheet is the state owner, so its state follows the report.
	// Why a transition: the tap already opened the `<dialog>`, and the render of
	// every part that reads the state must not delay that paint.
	const reportOpenMobile = useCallback(
		(next: boolean) => {
			if (!isOpenMobileControlled) {
				startTransition(() => setInternalOpenMobile(next));
			}
			onOpenMobileChangeRef.current?.(next);
		},
		[isOpenMobileControlled],
	);

	const setOpenMobile = useCallback(
		(next: boolean) => {
			// Why the DOM first: an uncontrolled sheet opens and closes with no
			// React render, and the `<dialog>` reports the change back.
			const dialog = document.getElementById(navId)?.closest("dialog");
			if (!isOpenMobileControlled && dialog != null) {
				if (next && isMobileRef.current) {
					moveDialog({ dialog, open: true });
				} else {
					closeAfterExit(dialog);
				}
				// Why a close renders now: the parts that read the state must not
				// wait for the exit.
				if (!dialog.hasAttribute("data-open")) {
					setInternalOpenMobile(false);
				}
				return;
			}
			if (!isOpenMobileControlled) {
				setInternalOpenMobile(next);
			}
			onOpenMobileChangeRef.current?.(next);
		},
		[isOpenMobileControlled, navId],
	);

	// Crossing up over the breakpoint closes the sheet (see `Sidebar.Nav`);
	// clear a controlled flag too, so narrowing the window later doesn't pop the
	// sheet back open without user action. Only a true mobile→desktop transition
	// may reset: a bare state check would fire on mount and clobber a controlled
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
	// other. Accepting either would hijack macOS's native Ctrl+B ("move the
	// caret back one character"), which every macOS text field binds.
	// Ownership: only the registry's first claimant handles the keypress, so
	// multiple mounted roots (nested or siblings) never toggle together.
	//
	// `toggle` is read through a stable ref rather than listed as a dependency:
	// its identity changes on every toggle (and on every parent render when the
	// consumer passes an inline `onOpenChange`), and re-running the effect would
	// release the claim and re-queue it at the TAIL. That hands ownership to a
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
			// Yield to a listener that already handled the chord, such as an app
			// hotkey on `document`, which runs before this `window` listener.
			if (event.defaultPrevented) {
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
			// shiftKey false, and the shortcut must not silently die there.
			// The optional read is not redundant. The DOM type says `key` is a
			// string. An extension or a password manager can dispatch a `keydown`
			// that omits it. The bare read then throws on the page.
			if (
				event.key?.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
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

	return (
		<SidebarContext.Provider value={contextValue}>
			<SidebarWidthRequestContext.Provider value={setSidePanelNeedsWidth}>
				<NativeRoot
					scope={navScope}
					open={isOpenMobileControlled ? openMobile && isMobile : undefined}
					onOpenChange={reportOpenMobile}
				>
					{children}
				</NativeRoot>
			</SidebarWidthRequestContext.Provider>
		</SidebarContext.Provider>
	);
};

type SidebarNavProps = ComponentProps<"div"> & WithDataSlot;

// Why no `asChild`: Nav renders a fixed structure (a `<dialog>`, the panel
// surface, and the `<nav>` it clips). There is no single default element a
// Slot swap could coherently replace.
/**
 * The sidebar panel. On viewports at or above the root's `mobileBreakpoint`
 * it renders inline (in normal flow, so it composes under an
 * `AppLayout.Notice` banner) and collapses by animating its width down to a
 * narrow column (`--sidebar-width-icon`): group labels fade out in place
 * and each row becomes a square chip around its leading icon, but everything
 * keeps its expanded position and stays in the tab order and the
 * accessibility tree. Below the breakpoint the same tree is a modal sheet on
 * the left, on the browser's `<dialog>`: the browser makes the page inert,
 * closes it on Escape, and returns focus to the trigger, and CSS
 * locks page scroll. The nav mounts once and never moves between the two.
 *
 * `className`, `style`, `ref`, and rest props land on the panel surface in
 * both presentations (the desktop width animator / the sheet panel), so
 * the width variables work anywhere:
 * `className="[--sidebar-width:20rem] [--sidebar-width-mobile:20rem]"`.
 * The panel forwards `aria-label` (default `"Main"`) to the inner `<nav>` landmark.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-width` | `13rem` | Expanded desktop panel width (208px). |
 * | `--sidebar-width-mobile` | `18rem` | Mobile sheet width (288px). |
 * | `--sidebar-width-icon` | `3.25rem` | Collapsed sidebar width (52px). |
 * | `--sidebar-row-width` | `12rem` | Derived, not set: one row's width in the expanded panel (192px), for sizing surfaces that render *outside* it. See below and `Sidebar.SwitcherTrigger`. |
 *
 * `--sidebar-row-width` is `calc(var(--sidebar-width,13rem) - 1rem)`, declared
 * at `:root` by `mantle.css`: the panel width minus the row gutter this
 * component's regions apply.
 *
 * The panel reads each of the three widths with its default as the fallback,
 * and custom properties inherit, so set one on `Sidebar.Nav` to resize a single
 * sidebar or on any ancestor (`:root` in your global stylesheet) to resize
 * every sidebar in the app. `--sidebar-row-width` resolves at `:root`, so a
 * `--sidebar-width` override scoped to one `Sidebar.Nav` does not reach it in
 * either direction (a narrower panel leaves the floor *wider* than the row it
 * opens from). Override `--sidebar-width` at `:root` to move both together, or
 * set `--sidebar-row-width` on the outside surface itself.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-expanded` | present while expanded | Presence-only. On the desktop panel it mirrors the root's expanded state, and its absence drives the width collapse to its icons. The mobile sheet always has it. Descendant parts style off it with `group-data-expanded/sidebar-nav:` and `group-not-data-expanded/sidebar-nav:`. |
 * | `data-hydrated` | present one frame after hydration | Presence-only, desktop panel surface. The panel's pre-hydration visibility gate, its width transition, and descendant collapse transitions all key off its absence in CSS (`not-data-hydrated:`, `group-not-data-hydrated/sidebar-nav:`). The stamp waits one frame, so an SSR state correction paints first and snaps instead of animating on page load. |
 * | `data-mobile` | present in the mobile sheet | Presence-only. Marks the sheet presentation used below the root's `mobileBreakpoint`. |
 * | `data-open` | present while the sheet is open | Presence-only, in the mobile sheet only: the sheet's open state, not the desktop expanded state. |
 * | `data-closing` | present while the sheet's exit plays | Presence-only, in the mobile sheet only. Drives the slide-out. |
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
	const { isMobile, mobileBreakpoint, navId, open, openMobile } = useSidebarContext("Nav");
	const isHydrated = useIsHydratedAfterPaint();
	const ariaLabel = ariaLabelProp ?? (ariaLabelledBy == null ? "Main" : undefined);
	const navRef = useRef<HTMLElement>(null);

	// Why: crossing up over the breakpoint must close an open sheet. The inline
	// panel has no overlay marker, so the close cannot reach it, and the sheet's
	// `data-open` and `data-closing` are cleared here.
	useLayoutEffect(() => {
		const dialog = navRef.current?.closest("dialog");
		if (!isMobile && dialog != null) {
			moveDialog({ dialog, open: false });
			navRef.current?.parentElement?.removeAttribute("data-open");
			navRef.current?.parentElement?.removeAttribute("data-closing");
		}
	}, [isMobile]);

	return (
		// Why one tree for both presentations: a swap between them remounts every
		// row. Above the breakpoint the closed `<dialog>` is inline, with no box,
		// so the panel sits in the row; below it the browser shows the
		// `<dialog>` as a modal sheet.
		<NativeContent
			scope={navScope}
			forceMount
			inline={!isMobile}
			// Why only while open: the nav stays mounted in the closed sheet, and a
			// dialog that a shortcut opens from there must show on the page.
			layer={openMobile}
			positionerSlot="sidebar-positioner"
			// Why no transition before the hydration stamp: on a phone the inline
			// `<dialog>` hides when `isMobile` corrects, and a `display` transition
			// would hold the panel on screen for the length of an exit.
			positionerClassName={cx("inset-0", !isHydrated && "transition-none")}
			// The sheet takes the nav's name, so a localized `aria-label` names
			// both. An inline `<dialog>` drops the name.
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			data-slot={joinDataSlot(dataSlot, "sidebar-nav")}
			className={cx(
				isMobile ? mobilePanelClassName : desktopPanelClassName,
				!isMobile && navVisibilityClassName[mobileBreakpoint],
				className,
			)}
			{...props}
			// Why after the spread: a wider props object can carry `data-expanded` or
			// `data-hydrated` past the type, and a consumer value would desync the
			// collapse from `open` or release the gate. The sheet is always at full
			// width, so its descendants never match the collapsed styles. In the
			// sheet the `<dialog>` writes `data-open` itself.
			data-expanded={isMobile || open ? "" : undefined}
			data-mobile={isMobile ? "" : undefined}
			// Why data-hydrated: the first-paint gates above and the descendants'
			// collapse transitions key off this attribute in CSS, so an SSR state
			// correction snaps instead of animating.
			data-hydrated={isHydrated ? "" : undefined}
		>
			<nav
				ref={navRef}
				id={navId}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				className={cx(
					"flex w-full min-w-0 flex-col text-sm",
					// The desktop nav tracks the animating panel width, so the rows clip
					// in place during the collapse.
					isMobile ? "h-full" : "absolute inset-y-0 left-0",
				)}
			>
				{children}
			</nav>
		</NativeContent>
	);
};

/**
 * The props for `Sidebar.Trigger`. `IconButton`'s props, except the parts the
 * trigger owns: `asChild` and `children` are removed (the trigger renders
 * only its icon and `aria-label`; build custom triggers with `useSidebar`
 * instead), and `appearance`, `icon`, `intent`, `label`, and `size` become
 * optional with sidebar defaults.
 */
type SidebarTriggerProps = Omit<
	IconButtonProps,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "size"
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
		 * in the tooltip, usually `<><MetaKey /><Kbd>B</Kbd></>`.
		 *
		 * Ignored under `Sidebar.Root keyboardShortcut={false}`, so the tooltip can
		 * never name a binding that is not bound. Passed rather than built in so the
		 * sidebar does not have to reach into another component for the platform
		 * modifier glyph. `aria-keyshortcuts` is stamped either way, which is also
		 * why the chips render `aria-hidden`.
		 */
		shortcut?: ReactNode;
		/**
		 * The size of the trigger `IconButton`. Small, so it sits level with the
		 * other `size="sm"` controls in an `AppLayout.Header` row.
		 *
		 * @default "sm"
		 */
		size?: IconButtonProps["size"];
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
const TooltipLabel = ({
	label,
	labelHidden = false,
	shortcut,
}: {
	label: ReactNode;
	/** Hides the label from assistive technology, for a label that already names the control. */
	labelHidden?: boolean;
	shortcut: ReactNode;
}) => (
	// Why always the row: an early return for a null `shortcut` made this
	// component's root flip between a text node and an element, so React deleted
	// the whole child list when a chord arrived. A translated label is reparented
	// by then, and that removal raises `NotFoundError`.
	// decisions/2026-08-04-translation-safe-label-wrappers.md
	<span data-slot="sidebar-tooltip-row" className="flex items-center gap-1.5">
		{/* Why the label span: the chips stay mounted once a chord arrives, so a
		    bare text `label` is not a lone child and the consumer's own swap to an
		    element throws on a translated page. `contents` keeps the label a flex
		    item of the row. */}
		<span data-slot="sidebar-tooltip-label" className="contents">
			{/* Why an inner span: WebKit ignores `aria-hidden` on a `display: contents` element. */}
			{labelHidden ? <span aria-hidden>{label}</span> : label}
		</span>
		{shortcut != null && (
			<span
				aria-hidden
				data-slot="sidebar-tooltip-shortcut"
				className="inline-flex shrink-0 items-center gap-0.5 [&_kbd]:h-4 [&_kbd]:min-w-4 [&_kbd]:bg-neutral-500/25 [&_kbd]:px-0.5 [&_kbd]:text-xs"
				// Why translate="no": a chord is a key name, not prose.
				translate="no"
			>
				{shortcut}
			</span>
		)}
	</span>
);

// Why no `asChild`: Trigger renders a fully-wired mantle IconButton (icon +
// aria-label + aria-expanded/aria-controls); custom triggers compose the
// same behavior from `useSidebar()` instead of slot-swapping this one.
/**
 * The button that toggles the sidebar: the mobile sheet below the root's
 * `mobileBreakpoint`, the desktop expanded state otherwise. Renders a small
 * ghost neutral `IconButton` with `aria-expanded` and `aria-controls` wired to
 * the sidebar's `<nav>`. Place it in your app shell's header (for example
 * `AppLayout.Header`). It must stay visible at every breakpoint where the
 * sidebar can collapse, or users have no way to reopen it.
 *
 * The button is icon-only at every breakpoint, so it always renders a tooltip
 * showing `label` (plus the optional `shortcut` chips). A `TooltipProvider`
 * ancestor, when there is one, sets its delay.
 *
 * It also stamps `aria-keyshortcuts` for the `⌘B` / `Ctrl+B` chord the root
 * binds. The server cannot know the host, so the server HTML and the hydration
 * render carry `Control+B`. React corrects it once after hydration. A trigger
 * that mounts after hydration reads the platform in its first render. Both the
 * attribute and the chips are omitted under `Sidebar.Root keyboardShortcut={false}`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"sidebar-trigger icon-button"` | On the button: the part's slot, joined ahead of `IconButton`'s own. |
 * | `data-slot` | `"sidebar-trigger-tooltip tooltip-content"` | On the tooltip surface, not the button: the styling hook for the label-and-chord popup this part renders, joined ahead of `Tooltip.Content`'s own slot. |
 * | `data-open` | present while open | Read, not stamped: on the tooltip surface, from `Tooltip.Content`. |
 * | `data-side` | `"top"` \| `"right"` \| `"bottom"` \| `"left"` | Read, not stamped: on the tooltip surface, from `Tooltip.Content`. |
 * | `data-slot` | `"sidebar-tooltip-row"` | Inside that surface, on the flex row holding the label and the optional chord chips. Nested inside `Tooltip.Content`'s own `tooltip-label` div. Always present. |
 * | `data-slot` | `"sidebar-tooltip-label"` | On the `<span>` wrapping `label` inside that row. Always present, and `display: contents`, so the label stays a flex item of the row. |
 * | `data-slot` | `"sidebar-tooltip-shortcut"` | On the chord chips. Present only while `shortcut` holds something. Carries `translate="no"`: a chord is a key name, not prose. |
 * | `data-appearance` | `"filled"` \| `"ghost"` \| `"outlined"` | Read, not stamped: the underlying `IconButton` reflects its `appearance`, which this part defaults to `"ghost"`. |
 * | `data-intent` | `"neutral"` | Read, not stamped: the underlying `IconButton` reflects its `intent`, and it draws the neutral tone only. |
 * | `data-size` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | Read, not stamped: the underlying `IconButton` reflects its `size`, which this part defaults to `"sm"`. |
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
	size = "sm",
	...props
}: SidebarTriggerProps) => {
	const { isMobile, keyboardShortcut, navId, open, openMobile, toggle } =
		useSidebarContext("Trigger");
	const isApple = useIsApplePlatform();
	const expanded = isMobile ? openMobile : open;

	// Never name a chord this root does not bind.
	const hint = keyboardShortcut ? shortcut : undefined;
	// Announce the chord rather than only binding it. The server cannot know
	// the host, so it renders the non-Apple answer. The hydration render agrees
	// with it, and React corrects it once after hydration. A client mount reads
	// the real platform in its first render.
	const platformChord = isApple ? "Meta+B" : "Control+B";

	return (
		// Unlike `Sidebar.Tooltip`, this label is not gated on the sidebar state: the
		// trigger is an icon-only button at every breakpoint, so a pointer user has
		// nothing else to read.
		<Tooltip.Root>
			<Tooltip.Trigger asChild>
				<IconButton
					appearance={appearance}
					aria-controls={navId}
					aria-expanded={expanded}
					aria-keyshortcuts={keyboardShortcut ? platformChord : undefined}
					data-slot={joinDataSlot(dataSlot, "sidebar-trigger")}
					icon={icon}
					intent={intent}
					label={label}
					onClick={(event) => {
						onClick?.(event);
						if (!event.defaultPrevented) {
							toggle();
						}
					}}
					size={size}
					{...props}
				/>
			</Tooltip.Trigger>
			<Tooltip.Content data-slot="sidebar-trigger-tooltip">
				{/* Why hidden: the label is also the button's name, and the tooltip is its
				    description, so a screen reader would say the label twice. */}
				<TooltipLabel label={label} labelHidden shortcut={hint} />
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
 * way rows stack in `Sidebar.Footer`: the band's own lower half is the space
 * between them. The header grows to fit them. The band, and with it the toolbar,
 * stays the height of the switcher row alone, so a search row pinned under the
 * switcher (`Sidebar.SearchTrigger`) needs no override and no hand-copied
 * padding.
 *
 * The alignment is positional: keep the aligned row as the header's first direct
 * child. A wrapper around both rows takes the band itself. A first row taller
 * than the band overflows it. Raise the variable instead.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-header-height` | `4.5rem` | The first child's band (72px): the height an `AppLayout.Header` toolbar matches, not a cap on the header, which grows for every row after the first. Set it on a common ancestor of the sidebar and `AppLayout.Header`, not on `Sidebar.Nav`, so both rows read one value. |
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
				// auto track below it. A search row stacks under the switcher without
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
				"group-data-expanded/sidebar-nav:pr-1",
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
 * `scroll-fade-y` mask; inside the collapsed sidebar it hides the scrollbar
 * and its reserved gutter, so the fade is the only overflow signal.
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
				// Match Header/Footer trailing geometry when expanded. The padding moves
				// on the sidebar's clock, so the rows' available width never jumps.
				"group-data-expanded/sidebar-nav:pr-1",
				"transition-[padding]",
				collapseTransitionClassName,
				// The collapsed sidebar is too narrow for a scrollbar: hide it (and drop
				// the reserved gutter, which would off-center the icons) and let
				// the scroll fade signal the overflow instead.
				"group-not-data-expanded/sidebar-nav:scrollbar-none",
				"group-not-data-expanded/sidebar-nav:scrollbar-gutter-auto",
				"group-not-data-expanded/sidebar-nav:[&::-webkit-scrollbar]:hidden",
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
				"group-data-expanded/sidebar-nav:pr-1",
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
	 * The id of the `Sidebar.GroupLabel` currently mounted in this group (the
	 * consumer's own `id` when they pass one, else the label's generated id),
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
 * heading outline); inside a `Sidebar.Group` the group links it to the
 * sibling list via `aria-labelledby`. Pass `asChild` to render a heading at a
 * level you control.
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
	// Register the id the label renders with (a consumer-supplied `id`
	// included), so `Sidebar.List` stays named either way. Depends on the
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
				// In the collapsed sidebar the label fades out in place: its 24px
				// row stays, so icon groups keep their separation and every row keeps
				// its expanded position. Opacity keeps it in the accessibility tree, so
				// lists stay named via aria-labelledby, and pointer-events-none keeps
				// the invisible label from intercepting stray clicks.
				"group-not-data-expanded/sidebar-nav:opacity-0",
				"group-not-data-expanded/sidebar-nav:pointer-events-none",
				"transition-opacity",
				collapseTransitionClassName,
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
 * A single `<li>` row of a `Sidebar.List`. A plain wrapper: the interactive
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
 * The chrome every row in the panel shares: `Sidebar.ItemButton` and
 * `Sidebar.SearchTrigger`.
 *
 * Shared rather than duplicated because "these are the same row" *is* the
 * contract: a search row whose geometry drifts from the navigation rows below it
 * reads as a foreign control, and in the collapsed sidebar it has to be the
 * same 28px chip in the same column. Both parts add their own state styling on
 * top (`aria-current` for a nav row, the revealed shortcut hint for search).
 *
 * Why one string: `cx` caches a call by the identity of its string arguments.
 * An array argument skips that cache, and the call then joins and re-hashes a
 * fresh class string on every row render.
 */
const rowClassName = [
	"focus-visible:focus-ring flex w-full min-w-0 items-center gap-2 truncate rounded-md px-2 py-1 text-left font-normal",
	"text-body hover:text-strong hover:bg-neutral-500/10",
	// A row composed as a menu or dialog trigger stays highlighted while the
	// surface it opens is open, matching Sidebar.SwitcherTrigger.
	"aria-expanded:bg-neutral-500/15 aria-expanded:text-strong",
	// In the collapsed sidebar the row returns to its original 28px square
	// chip. ml-1 keeps body and footer icons aligned with their expanded
	// position and the switcher indicators.
	"group-not-data-expanded/sidebar-nav:ml-1",
	"group-not-data-expanded/sidebar-nav:w-7",
	"group-not-data-expanded/sidebar-nav:p-1",
	// Why text-clip: the label clips with no ellipsis, so a collapse shows no
	// shimmer of dots as the row narrows.
	"group-not-data-expanded/sidebar-nav:text-clip",
	// Why these three properties: the chip and the row trade width, padding,
	// and margin, and the sidebar's width runs on the same clock, so the row grows
	// with the sidebar instead of taking the row shape on the first frame. Colors
	// stay instant.
	`transition-[width,padding,margin] ${collapseTransitionClassName}`,
].join(" ");

type SidebarItemButtonProps = ComponentProps<"button"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Marks this row as the current page: sets `aria-current="page"`, which
		 * also drives the current-row styling. Consumers control it from their router,
		 * e.g. `current={pathname === "/endpoints"}`.
		 *
		 * A composed child that sets `aria-current="page"` itself (react-router's
		 * `NavLink` does) already gets the current-row treatment, so it needs no
		 * `current`. This prop is for the rows whose parent knows.
		 */
		current?: boolean;
	};

/**
 * The interactive row of a `Sidebar.Item`: a leading icon slot and a
 * truncating label. Renders a `<button>` by default; pass `asChild` to
 * compose with a router link. `current` sets `aria-current="page"`, which
 * drives the current-row styling.
 *
 * The current-row treatment follows `aria-current`, so a composed child that
 * marks itself as the current page gets it without `current`: a react-router
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
 * The row sizes its **leading** icon to 20px. Trailing visuals (a caret, a
 * count, a status dot) size themselves, so a row composed with
 * `DropdownMenu.Trigger asChild` can end in `<CaretDownIcon className="text-muted
 * ml-auto size-4 shrink-0" />`. That row stays highlighted while its menu is
 * open (`aria-expanded="true"`, supplied by the trigger). Give that menu the same
 * width floor the switcher rows use, `className="min-w-(--sidebar-row-width)"`,
 * so it keeps the expanded row's width instead of shrinking to this row's 28px
 * collapsed chip (see `Sidebar.SwitcherTrigger` for the whole contract).
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `aria-current` | `"page"` when `current` | Styles the current row with `aria-[current=page]:`, so a composed child that marks itself (react-router's `NavLink`) gets the treatment without the prop. |
 * | `aria-expanded` | `"true"` \| `"false"` | **Read, not stamped**: supplied by a composing `DropdownMenu.Trigger` / `Dialog.Trigger`. The row styles against it so it stays highlighted while its menu is open. |
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
			aria-current={current ? "page" : undefined}
			type={asChild ? type : (type ?? "button")}
			className={cx(
				rowClassName,
				// The current row is styled from `aria-current`, so a composed child
				// that sets `aria-current="page"` on its own (react-router's
				// `NavLink` does) gets the same style as `current`.
				"aria-[current=page]:bg-neutral-500/15 aria-[current=page]:text-strong",
				// Only the leading icon is pinned to 20px: trailing visuals (a menu
				// caret, a count, a status dot) size themselves, so composing one
				// does not need an `!` override to escape this rule.
				"[&>svg]:text-muted hover:[&>svg]:text-strong aria-[current=page]:[&>svg]:text-strong [&>svg:first-child]:size-5 [&>svg]:shrink-0",
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
	// part renders after `children`, and a slotted child is cloned, not wrapped:
	// there is nowhere to put a sibling. With `asChild` the row's whole content is
	// yours, hint included; `group-hover:`/`group-focus-visible:` still work,
	// because the row keeps its `group` class either way.
	(
		| {
				/**
				 * Compose the search row's styling onto your own element. Then the
				 * row's entire content is yours, including any shortcut hint, which
				 * `shortcut` cannot add to a cloned child.
				 */
				asChild: true;
				shortcut?: never;
		  }
		| {
				/**
				 * Compose the search row's styling onto your own element. Then the
				 * row's entire content is yours, including any shortcut hint, which
				 * `shortcut` cannot add to a cloned child.
				 */
				asChild?: false;
				/**
				 * The keyboard hint for the chord that opens the same palette, usually
				 * `<><MetaKey /><Kbd>K</Kbd></>`.
				 *
				 * Rendered pinned to the end of the row and **revealed only on hover or
				 * keyboard focus**, so the row reads as a quiet navigation item at rest
				 * and teaches the chord at the moment a user reaches for it. It is
				 * `aria-hidden` and dropped outright in the collapsed sidebar: the chord is
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
 * The search row: the row that opens a search or command palette.
 *
 * Put it at the top of `Sidebar.Body`, above the first `Sidebar.Group`: it lands
 * in the same `px-3` gutter as the navigation rows, so it shares their column in
 * both panel states, and it scrolls with them.
 *
 * `Sidebar.Header`, under the switcher, also works, and pins the row above the
 * scrolling body instead. The switcher stays the header's first child, so it
 * keeps the `--sidebar-header-height` band an `AppLayout.Header` toolbar
 * matches, and this row takes the next row down. The header grows for it, so
 * nothing needs a token override. The header reserves no scrollbar gutter, so on
 * a platform whose scrollbars take space the row runs wider than the navigation
 * rows below it, which sit inside `Sidebar.Body`'s reserved gutter.
 *
 * It is deliberately a navigation row and not a text field. The row is the same
 * chrome as a `Sidebar.ItemButton` (same height, padding, radius, hover, and
 * the same 28px chip in the collapsed sidebar), because a search entry point
 * in a sidebar is one of the rows, not a form control wedged among them. The
 * `shortcut` hint appears on hover or focus and is otherwise invisible, which
 * keeps the resting panel quiet.
 *
 * A styled button only. It is not wired to any state. Compose it with
 * [`Command.SearchTrigger`](https://mantle.ngrok.com/components/navigation/command#commandsearchtrigger),
 * which supplies the dialog wiring, `aria-keyshortcuts`, and the behavior that
 * makes typing or pasting into the row open the palette with that text already
 * in the query. Wrap the pair in `Sidebar.Tooltip` so the row keeps a visible
 * label once the panel collapses.
 *
 * Like every row, the collapsed sidebar clips everything after the leading icon rather than
 * removing it, so the button keeps its accessible name as a chip.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"sidebar-search-trigger"` | On the row element. |
 * | `data-slot` | `"sidebar-search-trigger-label"` | On the `<span>` wrapping `children` on the default `button` path. Absent under `asChild`, which renders no sibling. Always `display: contents`, so your icon and label stay flex items of the row. |
 * | `data-slot` | `"sidebar-search-trigger-shortcut"` | On the chord chips. Always present on the default `button` path, and `display: none` while it is empty. Absent under `asChild`, where the props union forbids `shortcut`. Carries `translate="no"`: a chord is a key name, not prose. |
 * | `aria-expanded` | `"true"` \| `"false"` | **Read, not stamped**: supplied by the composing `Command.SearchTrigger` / `Dialog.Trigger`. The row stays highlighted while its palette is open. |
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebarsearchtrigger
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <Command.DialogRoot>
 *     <Sidebar.Nav aria-label="Main">
 *       <Sidebar.Header>
 *         <Sidebar.SwitcherTrigger>
 *           <GlobeIcon />
 *           <span className="text-strong min-w-0 flex-1 truncate text-base">Universal Gateway</span>
 *         </Sidebar.SwitcherTrigger>
 *       </Sidebar.Header>
 *       <Sidebar.Body>
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
 *         <Sidebar.Group>
 *           <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
 *           <Sidebar.List>
 *             <Sidebar.Item>
 *               <Sidebar.ItemButton asChild current>
 *                 <a href="/endpoints">
 *                   <GraphIcon />
 *                   Endpoints
 *                 </a>
 *               </Sidebar.ItemButton>
 *             </Sidebar.Item>
 *           </Sidebar.List>
 *         </Sidebar.Group>
 *       </Sidebar.Body>
 *     </Sidebar.Nav>
 *     <Command.DialogContent>
 *       <Command.Input placeholder="Search endpoints, agents, and settings..." />
 *       <Command.List>
 *         <Command.Empty>No results found.</Command.Empty>
 *       </Command.List>
 *     </Command.DialogContent>
 *   </Command.DialogRoot>
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

	// Why branch on `asChild` and not on `shortcut`: the `asChild` case hands
	// `Slot` exactly one child, and `Children.only` rejects a second. Branching
	// on `shortcut` instead flipped the child list between `children` and a
	// Fragment, so React deleted every child when a chord arrived. A
	// translated label is reparented by then, so that removal throws.
	// decisions/2026-08-04-translation-safe-label-wrappers.md
	const content = asChild ? (
		children
	) : (
		<>
			{/* Why the label span: the chord span below never unmounts, so without
			    this one a bare text label is not a lone child and a consumer's own
			    swap throws on a translated page.
			    decisions/2026-08-04-translation-safe-label-wrappers.md */}
			<span data-slot="sidebar-search-trigger-label" className="contents">
				{children}
			</span>
			<span
				aria-hidden
				data-slot="sidebar-search-trigger-shortcut"
				// Why translate="no": a chord is a key name, not prose.
				translate="no"
				// -mr-1 pulls the chips to the row's optical edge past the row
				// padding; the reveal is CSS-only so nothing re-renders on hover.
				className={cx(
					"pointer-events-none -mr-1 ml-auto inline-flex shrink-0 items-center gap-0.5 opacity-0 select-none",
					"group-hover:opacity-100 group-focus-visible:opacity-100",
					// The collapsed sidebar has room for the icon and nothing else, and the chord is
					// already announced via aria-keyshortcuts, so drop the hint outright
					// instead of letting it fight the 28px chip.
					"group-not-data-expanded/sidebar-nav:hidden",
					// Quiet inline keys here rather than the standalone chips `Kbd`
					// renders elsewhere.
					"[&_kbd]:text-body [&_kbd]:h-5 [&_kbd]:min-w-5 [&_kbd]:bg-neutral-500/20 [&_kbd]:px-1 [&_kbd]:text-xs [&_kbd]:font-normal",
					// With no chord the span is empty, and `display: none` keeps it out
					// of the row's flex formatting context so it costs no gap.
					"empty:hidden",
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
				// brightening included. Without it the row's label lifts to
				// `text-strong` while its icon stays muted, which no nav row does.
				// Why both forms: the label span makes a consumer's icon a grandchild
				// on the `button` path, and `asChild` renders no label span at all, so
				// each path needs the selector that reaches its own leading icon.
				"[&>svg:first-child]:text-muted hover:[&>svg:first-child]:text-strong",
				"[&>svg:first-child]:size-5",
				"[&>[data-slot=sidebar-search-trigger-label]>svg:first-child]:text-muted",
				"hover:[&>[data-slot=sidebar-search-trigger-label]>svg:first-child]:text-strong",
				"[&>[data-slot=sidebar-search-trigger-label]>svg:first-child]:size-5",
				"[&_svg]:shrink-0",
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
 * button only: it is not wired to any state. Compose it with
 * `DropdownMenu.Trigger asChild` or `Dialog.Trigger asChild`, which supply
 * the open state (`aria-expanded` styling comes for free from those
 * primitives).
 *
 * Inside the collapsed sidebar, the row collapses to its **first child
 * element**, the leading visual (product icon, account avatar), and the
 * remaining children become visually hidden while staying in the
 * accessibility tree, so the button's accessible name is unchanged. Wrap
 * loose text in an element (e.g. a `<span>`) so it participates.
 *
 * A menu opened from the row should be as wide as the row. `width="trigger"`
 * does that while the panel is expanded, but the row shrinks to a 36px chip in
 * the collapsed sidebar and would drag the menu down to it. Floor the menu at the
 * expanded row width with `className="min-w-(--sidebar-row-width)"`, the
 * token `mantle.css` declares at `:root` for exactly this, since the menu
 * renders in a portal and inherits nothing from the panel.
 *
 * - The floor is a no-op while the panel is expanded: the row already measures that wide.
 * - In the mobile sheet the floor is inert as long as the sheet's row is the wider of the two: `--sidebar-width-mobile` minus `1.5rem` and the sheet's 1px border, vs `--sidebar-width` minus `1rem` (263px vs 192px at the defaults).
 * - Widen `--sidebar-width-mobile` whenever you widen `--sidebar-width`, or the floor overhangs the sheet.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `aria-expanded` | `"true"` \| `"false"` | **Read, not stamped**: supplied by the composing `DropdownMenu.Trigger` / `Dialog.Trigger`. The row styles against it so it stays highlighted while its menu is open. |
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
				"text-body hover:text-strong hover:bg-neutral-500/10 flex w-full min-w-0 items-center gap-2 rounded-[0.625rem] py-1 pr-1.5 pl-1 text-left font-medium",
				"aria-expanded:bg-neutral-500/15 aria-expanded:text-strong",
				"focus-visible:focus-ring",
				// The leading account/product tile uses rounded-md (6px) and
				// sits 4px from the edge, so the outer switcher radius is 10px.
				// Product/account indicators are a little larger than their
				// source components by default; the tighter padding keeps the
				// switcher row at the same net 36px height while preserving
				// prototype spacing on the trailing action icon.
				"*:first:size-7",
				// In the collapsed sidebar only the leading visual (product
				// icon, account avatar) stays visible; the rest goes sr-only:
				// visually gone but still part of the button's accessible name.
				// w-9 keeps the leading visual centered in the same 36px chip as
				// the switcher row.
				"group-not-data-expanded/sidebar-nav:w-9",
				"group-not-data-expanded/sidebar-nav:p-1",
				"group-not-data-expanded/sidebar-nav:[&>:not(:first-child)]:sr-only",
				// The chip and the row trade width and padding on the sidebar's clock, so
				// the switcher grows with the sidebar instead of snapping to the row shape.
				"transition-[width,padding]",
				collapseTransitionClassName,
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The props for `Sidebar.Tooltip`. `Tooltip.Content`'s props (so `className`,
 * `style`, `ref`, and any `data-*` reach the tooltip surface), except the parts
 * this row owns: `children` is the row being labeled (not the tooltip body,
 * which is `label`), and `side` becomes optional with a sidebar default.
 */
type SidebarTooltipProps = Omit<ComponentProps<typeof Tooltip.Content>, "children" | "side"> &
	WithDataSlot & {
		/**
		 * The row this labels: a `Sidebar.ItemButton` or `Sidebar.SwitcherTrigger`,
		 * optionally already wrapped in a `DropdownMenu.Trigger asChild`.
		 *
		 * A single element, required: `Tooltip.Trigger asChild` clones its child, so
		 * text renders nothing a pointer can hover and no children renders no row at
		 * all. Both fail silently.
		 */
		children: ReactElement;
		/**
		 * What the tooltip says. Normally the row's own label text: the collapsed sidebar clips the
		 * visible one, so this is what a sighted pointer user reads. Required: the
		 * collapsed sidebar is the only state that shows a label, so there is no text to fall
		 * back to.
		 */
		label: ReactNode;
		/**
		 * The keyboard chord that reaches the same row, rendered after the label,
		 * usually `<><MetaKey /><Kbd>K</Kbd></>`. The collapsed sidebar hides the row's own
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
		 * Which side of the row the tooltip opens on. The sidebar sits at the inline
		 * start of the viewport, so the default points the tooltip away from it.
		 *
		 * @default "right"
		 */
		side?: ComponentProps<typeof Tooltip.Content>["side"];
	};

// Why no asChild: the surface is mantle's Tooltip.Content, which omits it
// because its arrow is a permanent sibling of the body. The row's own
// polymorphism goes through the part inside.
/**
 * Labels a sidebar row only while the desktop panel is collapsed
 * to its icons. Wrap it around a `Sidebar.ItemButton` or
 * `Sidebar.SwitcherTrigger`.
 *
 * The collapsed sidebar keeps every row's label in the accessibility tree (clipped,
 * not removed), which serves screen-reader users but leaves a sighted pointer
 * user with an unlabeled icon column. This restores the label for them without
 * duplicating it for anyone else: expanded rows already read their own text, and
 * the mobile sheet shows full labels, so the collapsed desktop sidebar is the only
 * state that shows a label at all.
 *
 * It opens the way any tooltip does (the pointer entering the row, or focus
 * reaching it), and the sidebar state vetoes it: the expanded panel and the mobile
 * sheet keep the tooltip closed with no `aria-describedby` on the row, and
 * toggling the sidebar dismisses whatever was showing, so collapsing the panel
 * cannot pop a label under a pointer that has already moved on.
 *
 * This part does not mount its own `TooltipProvider`, so an app-wide provider
 * sets the delay for each row.
 * The one provider setting it does override is hoverable content: a row label
 * holds nothing to hover into, so the pointer leaving the row closes it.
 *
 * It composes with a menu trigger: nest `DropdownMenu.Root >
 * Sidebar.Tooltip > DropdownMenu.Trigger asChild > Sidebar.ItemButton` for a
 * row that opens a menu *and* labels itself in the collapsed sidebar. `DropdownMenu.Root` must
 * stay **outside** the tooltip: it is renderless, and `Tooltip.Trigger asChild`
 * needs a real element to clone.
 *
 * `children` is the row; `label` is what the tooltip says. Every other prop is
 * `Tooltip.Content`'s and lands on the tooltip surface: `className`, `style`,
 * `ref`, `data-*`, and positioning props such as `align` and `sideOffset`.
 * `side` defaults to `"right"`, so the tooltip opens away from the sidebar.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"sidebar-tooltip tooltip-content"` | On the tooltip surface, with any forwarded chain ahead of it and `Tooltip.Content`'s own slot after it. |
 * | `data-open` | present while open | Read, not stamped: on the tooltip surface, from `Tooltip.Content`. |
 * | `data-side` | `"top"` \| `"right"` \| `"bottom"` \| `"left"` | Read, not stamped: on the tooltip surface, from `Tooltip.Content`. The resolved side, `"right"` by default. |
 * | `data-slot` | `"sidebar-tooltip-row"` | Inside that surface, on the flex row holding the label and the optional chord chips. Nested inside `Tooltip.Content`'s own `tooltip-label` div. Always present, so a chord that arrives later appends instead of replacing the label. |
 * | `data-slot` | `"sidebar-tooltip-label"` | On the `<span>` wrapping `label` inside that row. Always present, and `display: contents`, so the label stays a flex item of the row. |
 * | `data-slot` | `"sidebar-tooltip-shortcut"` | On the chord chips. Present only while `shortcut` holds something. Carries `translate="no"`: a chord is a key name, not prose. |
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
const SidebarTooltip = ({
	children,
	"data-slot": dataSlot,
	label,
	shortcut,
	side = "right",
	...props
}: SidebarTooltipProps) => {
	const { isMobile, open } = useSidebarContext("Tooltip");
	const isCollapsedSidebar = !isMobile && !open;
	const [labelOpen, setLabelOpen] = useState(false);
	const [previousCollapsedSidebar, setPreviousCollapsedSidebar] = useState(isCollapsedSidebar);

	// A sidebar toggle drops the label. The tooltip opens on the pointer entering the trigger
	// and on focus reaching it, both of which can happen in a sidebar state that has
	// no business showing a label; without this, the next flip cashes that pending
	// state in and a tooltip appears under a pointer that is somewhere else
	// entirely. Reset during render (React's sanctioned "adjust state when a prop
	// changes" pattern) so the tooltip never sees the stale value.
	if (previousCollapsedSidebar !== isCollapsedSidebar) {
		setPreviousCollapsedSidebar(isCollapsedSidebar);
		setLabelOpen(false);
	}

	/**
	 * Mirrors the tooltip's open state, clamped so it can only ever hold `true` in the
	 * one sidebar state that shows a label.
	 *
	 * The clamp is required, not belt-and-braces. The tooltip reports every open it
	 * wants, including ones the veto below discards, so an unclamped mirror holds
	 * `true` through the whole expanded panel. A repeat `open` (a menu on the
	 * row closing and restoring focus to it, say) then sets the mirror to a value
	 * it already has. React keeps that no-op update queued, and replays it after
	 * the sidebar-toggle reset commits, which lands `true` in the collapsed sidebar with
	 * nothing hovering the row: the original bug, one path over.
	 */
	const setLabelOpenWhenCollapsed = (nextOpen: boolean) => {
		setLabelOpen(nextOpen && isCollapsedSidebar);
	};

	return (
		/*
		 * The sidebar state vetoes the open state rather than withholding the Content:
		 * The tooltip's own pointer close path lives inside `Tooltip.Content`, so a Root
		 * left to its own devices while the Content is unmounted latches open with
		 * nothing to close it. Meanwhile it points the row's `aria-describedby` at
		 * an id that is not in the document. Owning `open` keeps the expanded panel
		 * and the mobile sheet closed, which is the truth.
		 *
		 * The Root itself stays mounted at every sidebar state: unmounting it would
		 * unmount the Trigger with it, dropping focus off the row the user was on.
		 *
		 * `disableHoverableContent` moves the close path onto the Trigger, which is
		 * always mounted. A row label has nothing to hover into (per the WAI-ARIA
		 * tooltip pattern it holds no interactive content), so trading the grace
		 * area for a close that cannot depend on what is mounted is free.
		 *
		 * `className` is not destructured on purpose: it rides `props` into
		 * `Tooltip.Content`, which already merges it last with `cx`, and this row
		 * adds no classes of its own to compose ahead of it.
		 */
		<Tooltip.Root
			disableHoverableContent
			onOpenChange={setLabelOpenWhenCollapsed}
			open={isCollapsedSidebar && labelOpen}
		>
			<Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
			<Tooltip.Content data-slot={joinDataSlot(dataSlot, "sidebar-tooltip")} side={side} {...props}>
				<TooltipLabel label={label} shortcut={shortcut} />
			</Tooltip.Content>
		</Tooltip.Root>
	);
};

type SidebarSeparatorProps = Omit<ComponentProps<typeof Separator>, "asChild" | "children"> &
	SelfClosingWithAsChild &
	WithDataSlot;

/**
 * An inset hairline between sidebar regions. Composes the mantle `Separator`,
 * staying aligned with the `px-3` content padding of `Sidebar.Body` and
 * `Sidebar.Footer` (it deliberately does not run edge to edge) with `my-3`
 * breathing room above and below. In the collapsed sidebar it narrows to the 36px chip
 * width of `Sidebar.SwitcherTrigger`, 8px wider than the collapsed sidebar's 28px row chips,
 * so it stays optically centered between the viewport edge and the content
 * card.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | Read, not stamped: `Separator` reflects its `orientation` prop, `"horizontal"` by default, after a `HorizontalSeparatorGroup` ancestor wins. |
 * | `data-separator` | present | Read, not stamped: presence-only, from `Separator`. Lets a `HorizontalSeparatorGroup` exempt it from `shrink-0`. |
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
		className={cx(
			"my-3",
			"group-not-data-expanded/sidebar-nav:w-9",
			// The rule shortens to the chip's width on the sidebar's clock, with the rows.
			"transition-[width]",
			collapseTransitionClassName,
			className,
		)}
		{...props}
	/>
);

export {
	//,
	Root,
	Nav,
	Trigger,
	Header,
	Body,
	Footer,
	Group,
	GroupLabel,
	List,
	Item,
	ItemButton,
	SearchTrigger,
	SwitcherTrigger,
	SidebarTooltip,
	SidebarSeparator,
	useSidebar,
};

export type {
	//,
	SidebarMobileBreakpoint,
	SidebarState,
};
