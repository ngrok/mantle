"use client";

import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/Check";
import type {
	ComponentProps,
	FocusEvent,
	KeyboardEvent,
	MouseEvent,
	PointerEvent,
	ReactNode,
	RefObject,
} from "react";
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
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import { enterModal } from "../../behaviors/enter-modal.js";
import { swallowOutsideClick } from "../../behaviors/swallow-outside-click.js";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { Align, Side } from "../../utils/float/position.js";
import {
	floatClassName,
	hasPopoverApi,
	useFloat,
	useReconcileOnTriggerChange,
	useTriggerRef,
} from "../../utils/float/use-float.js";
import type { OutsideHandlers } from "../../utils/float/use-float.js";
import { LayerContainerContext } from "../../utils/layer-container/layer-container.js";
import { observeScrollEdges } from "../../utils/scroll-edges.js";
import { Icon } from "../icon/icon.js";
import { Separator } from "../separator/separator.js";
import { Slot, slotContent } from "../slot/slot.js";

/** Where focus goes when a menu opens: its first item, its last item, or the menu itself. */
type OpenFocus = "first" | "last" | "menu";

type RootState = {
	open: boolean;
	setOpen: (open: boolean) => void;
	modal: boolean;
	dir: "ltr" | "rtl" | undefined;
	triggerId: string;
	contentId: string;
	triggerRef: RefObject<HTMLElement | null>;
	/** The trigger's ref callback. It tells `onTriggerChangeRef` about a new trigger element. */
	setTrigger: (element: HTMLElement | null) => void;
	/** Runs when the trigger gets a new element, such as a custom trigger that replaces its own button. */
	onTriggerChangeRef: RefObject<(() => void) | null>;
	/** Sets where focus goes when the menu opens next. */
	setOpenFocus: (focus: OpenFocus) => void;
	/** Returns where focus goes as the menu opens, and resets it to the menu. */
	takeOpenFocus: () => OpenFocus;
};

const RootContext = createContext<RootState | null>(null);

function useRootState(part: string): RootState {
	const state = useContext(RootContext);
	invariant(
		state != null,
		`\`DropdownMenu.${part}\` must be rendered inside \`DropdownMenu.Root\`.`,
	);
	return state;
}

/** One open menu: the root content or a submenu. Its items move focus and close the menu tree. */
type SubmenuPath = (x: number, y: number) => boolean;

type MenuLevel = {
	menuRef: RefObject<HTMLElement | null>;
	/** Closes every menu in the tree. */
	closeAll: () => void;
	/** Whether a pointer at this point is on its way to an open submenu, so items it crosses keep their state. */
	isInSubmenuPath: (x: number, y: number) => boolean;
	/** Sets the path to an open submenu. */
	setSubmenuPath: (path: SubmenuPath) => void;
	/** Clears the path to an open submenu: any path, or only `path` when it is still the current one. */
	clearSubmenuPath: (path?: SubmenuPath) => void;
	/** Whether a typeahead search is running, so Space adds to it instead of selecting. */
	isTyping: () => boolean;
};

const MenuLevelContext = createContext<MenuLevel | null>(null);

function useMenuLevel(part: string): MenuLevel {
	const level = useContext(MenuLevelContext);
	invariant(
		level != null,
		`\`DropdownMenu.${part}\` must be rendered inside \`DropdownMenu.Content\`.`,
	);
	return level;
}

type SubState = {
	open: boolean;
	setOpen: (open: boolean) => void;
	triggerRef: RefObject<HTMLElement | null>;
	/** The sub-trigger's ref callback. It tells `onTriggerChangeRef` about a new element. */
	setTrigger: (element: HTMLElement | null) => void;
	/** Runs when the sub-trigger gets a new element. */
	onTriggerChangeRef: RefObject<(() => void) | null>;
	triggerId: string;
	contentId: string;
	setOpenFocus: (focus: OpenFocus) => void;
	takeOpenFocus: () => OpenFocus;
};

const SubContext = createContext<SubState | null>(null);

function useSubState(part: string): SubState {
	const state = useContext(SubContext);
	invariant(
		state != null,
		`\`DropdownMenu.${part}\` must be rendered inside \`DropdownMenu.Sub\`.`,
	);
	return state;
}

type RadioGroupState = {
	value: string | undefined;
	setValue: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupState | null>(null);

/** Builds the setter of an open state that is controlled or not. */
function openSetter({
	open,
	openProp,
	onOpenChange,
	setUncontrolledOpen,
}: {
	open: boolean;
	openProp: boolean | undefined;
	onOpenChange: ((open: boolean) => void) | undefined;
	setUncontrolledOpen: (open: boolean) => void;
}): (open: boolean) => void {
	return (next) => {
		if (next === open) {
			return;
		}
		if (openProp === undefined) {
			setUncontrolledOpen(next);
		}
		onOpenChange?.(next);
	};
}

const itemSelector = "[role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio']";

/** The enabled items of `menu`, in order, without the items of a submenu inside it. */
function itemsOf(menu: HTMLElement): HTMLElement[] {
	return Array.from(menu.querySelectorAll<HTMLElement>(itemSelector)).filter(
		(item) =>
			item.closest("[role='menu']") === menu && item.getAttribute("aria-disabled") !== "true",
	);
}

/** The shown menu element, and the inert boundary that a modal menu holds around it and its trigger. */
type ModalBoundary = {
	shown: HTMLElement | null;
	held: {
		element: HTMLElement;
		trigger: HTMLElement;
		exit: ReturnType<typeof enterModal>;
	} | null;
};

/**
 * Makes the page inert around a shown modal menu and its trigger, and lets it
 * go when the menu hides or stops being modal. Why update in place: the menu
 * (under `asChild`) or the trigger can get a new element while the menu stays
 * open, and a modal menu that opened later must stay above this one.
 */
function syncModal(
	boundary: ModalBoundary,
	{ modal, trigger }: { modal: boolean; trigger: HTMLElement | null },
): void {
	const element = modal ? boundary.shown : null;
	const { held } = boundary;
	if (element == null || trigger == null) {
		held?.exit();
		boundary.held = null;
		return;
	}
	if (held == null) {
		boundary.held = { element, trigger, exit: enterModal([trigger, element]) };
	} else if (held.element !== element || held.trigger !== trigger) {
		held.exit.update([trigger, element]);
		boundary.held = { element, trigger, exit: held.exit };
	}
}

/** Moves focus to an item or the menu, with no scroll jump. */
function focusWithoutScroll(element: HTMLElement | null | undefined): void {
	element?.focus({ preventScroll: true });
}

/**
 * Moves keyboard focus to the first of `items` that takes it, and scrolls the
 * menu so the item shows. Why try each: an item that CSS hides, that is
 * `inert`, or that is a disabled button cannot take focus, as with Radix.
 */
function focusFirst(items: readonly HTMLElement[]): boolean {
	for (const item of items) {
		const before = item.ownerDocument.activeElement;
		focusWithoutScroll(item);
		const after = item.ownerDocument.activeElement;
		if (after === item) {
			// Why optional: jsdom has no `scrollIntoView`.
			item.scrollIntoView?.({ block: "nearest" });
			return true;
		}
		// Why stop: a consumer's focus handler sent focus somewhere else on purpose.
		if (after !== before) {
			return true;
		}
	}
	return false;
}

/**
 * Whether a key event is for `menu`: it comes from the menu itself or one of
 * its own items, not from a float inside it, such as a popover's input.
 */
function isMenuKey(menu: HTMLElement, target: EventTarget): target is HTMLElement {
	return (
		target instanceof HTMLElement &&
		(target === menu || target.closest(itemSelector)?.closest("[role='menu']") === menu)
	);
}

/**
 * The items that a navigation key tries, in order, from the item at `current`
 * (-1 for none). Returns `null` for a key that does not navigate.
 */
function navigationOrder({
	key,
	items,
	current,
	loop,
}: {
	key: string;
	items: HTMLElement[];
	current: number;
	loop: boolean;
}): HTMLElement[] | null {
	const after = items.slice(current + 1);
	const before = current === -1 ? [] : items.slice(0, current);
	switch (key) {
		case "ArrowDown":
			return current === -1 ? items : [...after, ...(loop ? before : [])];
		case "ArrowUp":
			return current === -1 ? items.toReversed() : [...(loop ? after : []), ...before].toReversed();
		case "Home":
		case "PageUp":
			return items;
		case "End":
		case "PageDown":
			return items.toReversed();
		default:
			return null;
	}
}

/** Moves focus as the menu opens: to its first item, its last item, or the menu itself. */
function focusOnOpen(menu: HTMLElement, focus: OpenFocus): void {
	const items = itemsOf(menu);
	const moved =
		(focus === "first" && focusFirst(items)) ||
		(focus === "last" && focusFirst(items.toReversed()));
	if (!moved) {
		focusWithoutScroll(menu);
	}
}

/** Where focus goes when a menu opens next. The trigger sets it, and the menu takes it as it opens. */
function useOpenFocus() {
	const openFocus = useRef<OpenFocus>("menu");
	return useMemo(
		() => ({
			setOpenFocus: (focus: OpenFocus) => {
				openFocus.current = focus;
			},
			takeOpenFocus: () => {
				const focus = openFocus.current;
				openFocus.current = "menu";
				return focus;
			},
		}),
		[],
	);
}

/** The path to the open submenu of one menu level. Items that the pointer crosses on that path keep their state. */
function useSubmenuPath() {
	const path = useRef<SubmenuPath | null>(null);
	return useMemo(
		() => ({
			isInSubmenuPath: (x: number, y: number) => path.current?.(x, y) ?? false,
			setSubmenuPath: (next: SubmenuPath) => {
				path.current = next;
			},
			clearSubmenuPath: (only?: SubmenuPath) => {
				if (only == null || path.current === only) {
					path.current = null;
				}
			},
		}),
		[],
	);
}

/** How long typeahead keeps the characters typed before, in milliseconds. */
const TYPEAHEAD_RESET = 1000;

/**
 * The keyboard and typeahead of one menu. Returns the menu's `onKeyDown` and
 * whether a typeahead search is running.
 */
function useMenuKeyboard(loop: boolean): {
	onMenuKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
	isTyping: () => boolean;
	resetTyping: () => void;
} {
	const search = useRef("");
	const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(searchTimer.current), []);
	return useMemo(() => {
		const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
			const menu = event.currentTarget;
			const target = event.target;
			if (!isMenuKey(menu, target)) {
				return;
			}
			if (event.key === "Tab") {
				// Why: a menu keeps focus until it closes, as a native menu does.
				event.preventDefault();
				return;
			}
			const items = itemsOf(menu);
			const current = items.indexOf(target);
			const move = navigationOrder({ key: event.key, items, current, loop });
			// Why not with a modifier: as with Radix, Shift or Ctrl with an arrow key is the page's.
			if (move != null) {
				if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
					event.preventDefault();
					focusFirst(move);
				}
				return;
			}
			const isCharacter =
				event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
			if (!isCharacter || (event.key === " " && search.current === "")) {
				return;
			}
			event.preventDefault();
			clearTimeout(searchTimer.current);
			search.current += event.key.toLowerCase();
			searchTimer.current = setTimeout(() => {
				search.current = "";
			}, TYPEAHEAD_RESET);
			// Why: a repeated character, such as "aaa", steps through the items that start with it.
			const isRepeat = /^(.)\1*$/su.test(search.current);
			const query = isRepeat ? search.current.charAt(0) : search.current;
			const start = isRepeat ? current + 1 : Math.max(current, 0);
			const ordered = [...items.slice(start), ...items.slice(0, start)];
			focusFirst(
				ordered.filter((item) =>
					(item.dataset.textValue ?? item.textContent ?? "").trim().toLowerCase().startsWith(query),
				),
			);
		};
		return {
			onMenuKeyDown,
			isTyping: () => search.current !== "",
			// Why: a menu that opens again starts a new search, as with Radix.
			resetTyping: () => {
				clearTimeout(searchTimer.current);
				search.current = "";
			},
		};
	}, [loop]);
}

/** Whether a point is inside the triangle `a`, `b`, `c`. */
function isInTriangle(
	point: { x: number; y: number },
	[a, b, c]: readonly [
		{ x: number; y: number },
		{ x: number; y: number },
		{ x: number; y: number },
	],
): boolean {
	const cross = (p: { x: number; y: number }, q: { x: number; y: number }) =>
		(q.x - p.x) * (point.y - p.y) - (q.y - p.y) * (point.x - p.x);
	const d1 = cross(a, b);
	const d2 = cross(b, c);
	const d3 = cross(c, a);
	const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
	const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
	return !(hasNegative && hasPositive);
}

/** Whether the menu reads right to left: the `dir` prop, else the element's direction. */
function isRtl(element: Element, dir: "ltr" | "rtl" | undefined): boolean {
	return (dir ?? getComputedStyle(element).direction) === "rtl";
}

/** Whether a point is inside a box. */
function isInBox(x: number, y: number, box: DOMRect): boolean {
	return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/**
 * A menu of options or actions, triggered by a button.
 * This is the root, stateful component that manages the open/closed state of the dropdown menu.
 *
 * `DropdownMenu.Content` and `DropdownMenu.SubContent` are native
 * `popover="manual"` elements in the browser's top layer, placed by a script
 * next to their trigger, so no `overflow` or `z-index` clips them. Each portals into the
 * overlay or float that holds it, else into `document.body`, and closes when an
 * overlay that does not hold it opens. A float opened from an item, such as a
 * `Popover`, portals into the menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuroot
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Root = ({
	children,
	defaultOpen = false,
	dir,
	modal = false,
	onOpenChange,
	open: openProp,
}: {
	children?: ReactNode;
	/** The open state, for a controlled menu. Pair it with `onOpenChange`. */
	open?: boolean;
	/**
	 * The open state on the first render, for an uncontrolled menu.
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the menu opens or closes. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * Whether the page behind the open menu is inert: it does not scroll, take
	 * focus, take pointer input, or reach a screen reader. By default the page
	 * stays live, as with a native popover and the WAI-ARIA menu button pattern.
	 * A press that ends outside still closes the menu, and its primary click
	 * (left button, no Ctrl) does not activate what is under it.
	 * @default false
	 */
	modal?: boolean;
	/** The reading direction. It decides which arrow key opens and closes a submenu. Defaults to the trigger's direction. */
	dir?: "ltr" | "rtl";
}) => {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
	const { setOpenFocus, takeOpenFocus } = useOpenFocus();
	const triggerId = useId();
	const contentId = useId();
	const state = useMemo<RootState>(
		() => ({
			open,
			setOpen: openSetter({ open, openProp, onOpenChange, setUncontrolledOpen }),
			modal,
			dir,
			triggerId,
			contentId,
			triggerRef,
			setTrigger,
			onTriggerChangeRef,
			setOpenFocus,
			takeOpenFocus,
		}),
		[
			contentId,
			dir,
			modal,
			open,
			openProp,
			onOpenChange,
			onTriggerChangeRef,
			setOpenFocus,
			setTrigger,
			takeOpenFocus,
			triggerId,
			triggerRef,
		],
	);
	const { setOpen } = state;
	// Why: a menu closes when the window loses focus, as a native menu does.
	useEffect(() => {
		if (!open) {
			return;
		}
		const close = () => setOpen(false);
		window.addEventListener("blur", close);
		return () => window.removeEventListener("blur", close);
	}, [open, setOpen]);
	return <RootContext.Provider value={state}>{children}</RootContext.Provider>;
};

/**
 * The trigger button that opens the dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenutrigger
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Trigger = ({
	asChild = false,
	"data-slot": dataSlot,
	disabled,
	onKeyDown,
	onPointerDown,
	ref,
	...props
}: ComponentProps<"button"> & WithAsChild & WithDataSlot) => {
	const state = useRootState("Trigger");
	const composedRef = useComposedRefs(ref, state.setTrigger);
	const Component = asChild ? Slot : "button";
	return (
		<Component
			aria-controls={state.open ? state.contentId : undefined}
			aria-expanded={state.open}
			aria-haspopup="menu"
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-trigger")}
			disabled={disabled}
			id={state.triggerId}
			ref={composedRef}
			// Why also under `asChild`: a slotted `<button>` with no type would submit its form.
			type="button"
			{...props}
			onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
				onPointerDown?.(event);
				if (event.defaultPrevented || disabled || event.button !== 0 || event.ctrlKey) {
					return;
				}
				state.setOpenFocus("menu");
				state.setOpen(!state.open);
				// Why: focus stays off the trigger, so the open menu takes it.
				if (!state.open) {
					event.preventDefault();
				}
			}}
			onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
				onKeyDown?.(event);
				if (event.defaultPrevented || disabled) {
					return;
				}
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					state.setOpenFocus("first");
					state.setOpen(!state.open);
				} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
					event.preventDefault();
					state.setOpenFocus(event.key === "ArrowDown" ? "first" : "last");
					state.setOpen(true);
				}
			}}
		/>
	);
};

/**
 * A group container for organizing related dropdown menu items.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenugroup
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Group>
 *       <DropdownMenu.Label>Account</DropdownMenu.Label>
 *       <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *       <DropdownMenu.Item>Settings</DropdownMenu.Item>
 *     </DropdownMenu.Group>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Group = ({
	asChild = false,
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-group")}
			role="group"
			className={cx("between:mb-px", className)}
			{...props}
		/>
	);
};

/**
 * A submenu container for creating nested dropdown menus.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusub
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <DropdownMenu.Item>Sub item 1</DropdownMenu.Item>
 *         <DropdownMenu.Item>Sub item 2</DropdownMenu.Item>
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Sub = ({
	children,
	defaultOpen = false,
	onOpenChange,
	open: openProp,
}: {
	children?: ReactNode;
	/** The open state, for a controlled submenu. Pair it with `onOpenChange`. */
	open?: boolean;
	/**
	 * The open state on the first render, for an uncontrolled submenu.
	 * @default false
	 */
	defaultOpen?: boolean;
	/** Runs when the submenu opens or closes. */
	onOpenChange?: (open: boolean) => void;
}) => {
	const root = useRootState("Sub");
	const parentSub = useContext(SubContext);
	const parentOpen = root.open && (parentSub?.open ?? true);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	const { triggerRef, setTrigger, onTriggerChangeRef } = useTriggerRef();
	const { setOpenFocus, takeOpenFocus } = useOpenFocus();
	const triggerId = useId();
	const contentId = useId();
	const state = useMemo<SubState>(
		() => ({
			open,
			setOpen: openSetter({ open, openProp, onOpenChange, setUncontrolledOpen }),
			triggerRef,
			setTrigger,
			onTriggerChangeRef,
			triggerId,
			contentId,
			setOpenFocus,
			takeOpenFocus,
		}),
		[
			contentId,
			onTriggerChangeRef,
			open,
			openProp,
			onOpenChange,
			setOpenFocus,
			setTrigger,
			takeOpenFocus,
			triggerId,
			triggerRef,
		],
	);
	const { setOpen } = state;
	const setLatestOpen = useCallbackRef(setOpen);
	// Why: a submenu closes, and tells its owner, when the menu that holds it closes.
	useEffect(() => {
		if (!parentOpen && open) {
			setOpen(false);
		}
	}, [open, parentOpen, setOpen]);
	// Why: a controlled submenu that unmounts open closes, so it does not open again when it mounts.
	useEffect(() => () => setLatestOpen(false), [setLatestOpen]);
	return <SubContext.Provider value={state}>{children}</SubContext.Provider>;
};

/**
 * A radio group container for exclusive selection within the dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuradiogroup
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.RadioGroup value={value} onValueChange={setValue}>
 *       <DropdownMenu.RadioItem value="option1">Option 1</DropdownMenu.RadioItem>
 *       <DropdownMenu.RadioItem value="option2">Option 2</DropdownMenu.RadioItem>
 *     </DropdownMenu.RadioGroup>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const RadioGroup = ({
	asChild = false,
	"data-slot": dataSlot,
	className,
	defaultValue,
	onValueChange,
	value: valueProp,
	...props
}: Omit<ComponentProps<"div">, "defaultValue"> &
	WithAsChild &
	WithDataSlot & {
		/** The value of the checked item, for a controlled group. Pair it with `onValueChange`. */
		value?: string;
		/** The value of the checked item on the first render, for an uncontrolled group. */
		defaultValue?: string;
		/** Runs when the user checks another item. */
		onValueChange?: (value: string) => void;
	}) => {
	const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
	const value = valueProp ?? uncontrolledValue;
	const state = useMemo<RadioGroupState>(
		() => ({
			value,
			setValue: (next) => {
				// Why: as with a native radio, checking the checked item changes nothing.
				if (next === value) {
					return;
				}
				if (valueProp === undefined) {
					setUncontrolledValue(next);
				}
				onValueChange?.(next);
			},
		}),
		[onValueChange, value, valueProp],
	);
	const Component = asChild ? Slot : "div";
	return (
		<RadioGroupContext.Provider value={state}>
			<Component
				data-slot={joinDataSlot(dataSlot, "dropdown-menu-radio-group")}
				role="group"
				className={cx("between:mb-px", className)}
				{...props}
			/>
		</RadioGroupContext.Provider>
	);
};

/** The props every menu panel takes. */
type MenuPanelProps = ComponentProps<"div"> &
	OutsideHandlers &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether ArrowDown on the last item moves to the first, and ArrowUp on the first moves to the last.
		 * @default true
		 */
		loop?: boolean;
		/** Runs on Escape while the menu is the top float. Call `event.preventDefault()` to keep it open. */
		onEscapeKeyDown?: (event: globalThis.KeyboardEvent) => void;
	};

const panelClassName =
	"text-popover-foreground border-popover bg-popover flex flex-col min-w-32 max-h-(--available-height) rounded-md border shadow-xl outline-hidden font-sans";

/**
 * How the element that scrolls a menu's items scrolls. Why `scroll-py-6`: a
 * focused item scrolls clear of the 1.5rem `scroll-cue-y` fade at each edge.
 */
const scrollClassName =
	"scrollbar-none [&::-webkit-scrollbar]:hidden min-h-0 overflow-auto overscroll-none scroll-py-6 p-1.25 between:mb-px";

/**
 * Puts a menu panel's items in an element that scrolls them, with the
 * `scroll-cue-y` fade at each edge that has more items past it. Why the
 * offsets: sticky offsets start inside the padding, so the cue moves out by
 * the 1.25 padding to meet the edge. Why not under `asChild`: a custom panel
 * can render items of its own beside its children, so the panel scrolls
 * itself, with no cue.
 */
const renderScroller = (items: ReactNode) => (
	<div
		ref={observeScrollEdges}
		data-slot="dropdown-menu-viewport"
		className={cx("scroll-cue-y before:-top-1.25 after:-bottom-1.25", scrollClassName)}
	>
		{items}
	</div>
);

type DropdownMenuContentProps = MenuPanelProps & {
	/**
	 * The side of the trigger the menu prefers. It flips to the opposite side when only that side has room.
	 * @default "bottom"
	 */
	side?: Side;
	/**
	 * How the menu lines up with the trigger along `side`.
	 * @default "center"
	 */
	align?: Align;
	/**
	 * The gap between the trigger and the menu, in pixels.
	 * @default 8
	 */
	sideOffset?: number;
	/** Whether the menu matches the width of the trigger or uses the intrinsic width of its items. */
	width?: "trigger" | "content";
	/**
	 * Runs as the menu closes, before focus returns to the trigger. Call
	 * `event.preventDefault()` to move focus yourself.
	 */
	onCloseAutoFocus?: (event: Event) => void;
};

/**
 * The container for the dropdown menu content.
 *
 * `DropdownMenu.Content` and `DropdownMenu.SubContent` are native
 * `popover="manual"` elements in the browser's top layer, placed by a script
 * next to their trigger, so no `overflow` or `z-index` clips them. Each portals into the
 * overlay or float that holds it, else into `document.body`, and closes when an
 * overlay that does not hold it opens. A float opened from an item, such as a
 * `Popover`, portals into the menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenucontent
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Content = ({
	align = "center",
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	loop = true,
	onClick,
	onCloseAutoFocus,
	onEscapeKeyDown,
	onFocusOutside,
	onInteractOutside,
	onKeyDown,
	onPointerDownOutside,
	ref,
	side = "bottom",
	sideOffset = 8,
	width,
	...props
}: DropdownMenuContentProps) => {
	const state = useRootState("Content");
	const menuRef = useRef<HTMLElement | null>(null);
	const { isInSubmenuPath, setSubmenuPath, clearSubmenuPath } = useSubmenuPath();
	/** How the last outside interaction left focus: where it landed (`keep`), or back to the trigger (`restore`). */
	const outsideFocus = useRef<"keep" | "restore" | null>(null);
	const outsideRightClick = useRef(false);
	const modalBoundary = useRef<ModalBoundary>({ shown: null, held: null });
	const [menu, setMenu] = useState<HTMLElement | null>(null);
	const { onMenuKeyDown, isTyping, resetTyping } = useMenuKeyboard(loop);
	const { portalTarget, floatingRef, reconcile } = useFloat({
		open: state.open,
		onDismiss: (reason, outside) => {
			// Why: in a modal menu the page is inert, so an outside press puts focus
			// nowhere and it returns to the trigger. A right click, or any outside
			// interaction with a menu that is not modal, leaves focus where it lands.
			outsideFocus.current = null;
			if (reason === "outside") {
				outsideFocus.current = !state.modal || outsideRightClick.current ? "keep" : "restore";
				// Why: the primary press that closes the menu must not also activate
				// what is under it, as with the pickers. A focus move that closes it
				// does not count. A modal menu's inert page takes no click.
				const press = outside?.detail.originalEvent;
				if (!state.modal && press instanceof MouseEvent && press.button === 0 && !press.ctrlKey) {
					// Why the check at the click: a controlled menu can refuse to close,
					// and then the click lands.
					swallowOutsideClick(() => !menuRef.current?.hasAttribute("data-open"));
				}
			}
			state.setOpen(false);
		},
		getAnchor: () => state.triggerRef.current,
		getInsideElements: () => [state.triggerRef.current],
		dismissOnOutside: true,
		dismissWhenCovered: true,
		side,
		align,
		sideOffset,
		dir: state.dir,
		onEscapeKeyDown,
		onFocusOutside,
		onInteractOutside,
		onPointerDownOutside: (event) => {
			const { button, ctrlKey } = event.detail.originalEvent;
			outsideRightClick.current = button === 2 || (button === 0 && ctrlKey);
			onPointerDownOutside?.(event);
		},
		onShow: (floating) => {
			outsideFocus.current = null;
			modalBoundary.current.shown = floating;
			syncModal(modalBoundary.current, { modal: state.modal, trigger: state.triggerRef.current });
			focusOnOpen(floating, state.takeOpenFocus());
		},
		onHide: (floating, focusWasInside) => {
			resetTyping();
			modalBoundary.current.shown = null;
			syncModal(modalBoundary.current, { modal: state.modal, trigger: state.triggerRef.current });
			const event = new Event("mantle.dropdown-menu.closeAutoFocus", { cancelable: true });
			onCloseAutoFocus?.(event);
			if (event.defaultPrevented) {
				const activeElement = floating.ownerDocument.activeElement;
				if (activeElement instanceof HTMLElement && floating.contains(activeElement)) {
					activeElement.blur();
				}
				return;
			}
			const trigger = state.triggerRef.current;
			if (outsideFocus.current === "restore") {
				// Why the next task: the press on the inert page moves focus to the
				// body after this runs, as the default action of its mousedown.
				const document = floating.ownerDocument;
				setTimeout(() => {
					if (document.activeElement == null || document.activeElement === document.body) {
						focusWithoutScroll(trigger);
					}
				});
			} else if (focusWasInside && outsideFocus.current !== "keep") {
				focusWithoutScroll(trigger);
			}
		},
	});
	// Why after each render: `modal` or the trigger element can change while the
	// menu is open. A render that changes neither costs two comparisons.
	useEffect(() => {
		syncModal(modalBoundary.current, { modal: state.modal, trigger: state.triggerRef.current });
	});
	// Why: a custom trigger can replace its own element with no render here.
	const { onTriggerChangeRef } = state;
	useEffect(() => {
		onTriggerChangeRef.current = () => {
			reconcile();
			syncModal(modalBoundary.current, { modal: state.modal, trigger: state.triggerRef.current });
		};
		return () => {
			onTriggerChangeRef.current = null;
		};
	});
	const menuElementRef = useCallback((element: HTMLElement | null) => {
		menuRef.current = element;
		setMenu(element);
	}, []);
	const composedRef = useComposedRefs(ref, floatingRef, menuElementRef);
	const { setOpen } = state;
	const level = useMemo<MenuLevel>(
		() => ({
			menuRef,
			closeAll: () => setOpen(false),
			isInSubmenuPath,
			setSubmenuPath,
			clearSubmenuPath,
			isTyping,
		}),
		[clearSubmenuPath, isInSubmenuPath, isTyping, setOpen, setSubmenuPath],
	);
	// Why the layer container: a float opened from an item, such as a popover,
	// portals into the menu, so it is inside the menu's inert boundary, outside
	// press check, and focus. Why around the element: under `asChild`, a custom
	// component can render items of its own, and they need the menu too.
	const renderLevel = (inner: ReactNode) => (
		<LayerContainerContext.Provider value={menu}>
			<MenuLevelContext.Provider value={level}>{inner}</MenuLevelContext.Provider>
		</LayerContainerContext.Provider>
	);
	const Component = asChild ? Slot : "div";

	return (
		portalTarget != null &&
		createPortal(
			renderLevel(
				<Component
					id={state.contentId}
					popover={hasPopoverApi ? "manual" : undefined}
					role="menu"
					aria-labelledby={state.triggerId}
					aria-orientation="vertical"
					tabIndex={-1}
					dir={state.dir}
					data-slot={joinDataSlot(dataSlot, "dropdown-menu-content")}
					data-open={state.open ? "" : undefined}
					inert={!state.open}
					className={cx(
						floatClassName,
						panelClassName,
						asChild && scrollClassName,
						width === "trigger" && "w-(--anchor-width)",
						className,
					)}
					ref={composedRef}
					{...props}
					onClick={(event: MouseEvent<HTMLDivElement>) => {
						// Why: a click in the menu must not reach a clickable parent of the trigger.
						event.stopPropagation();
						onClick?.(event);
					}}
					onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
						onKeyDown?.(event);
						if (!event.defaultPrevented) {
							onMenuKeyDown(event);
						}
					}}
				>
					{asChild ? children : renderScroller(children)}
				</Component>,
			),
			portalTarget,
		)
	);
};

/** The common behavior of every item: highlight, pointer focus, and selection. */
function useItemBehavior({
	disabled,
	onSelect,
	selectCloses = true,
	afterSelect,
}: {
	disabled: boolean | undefined;
	onSelect: ((event: Event) => void) | undefined;
	selectCloses?: boolean;
	afterSelect?: () => void;
}) {
	const level = useMenuLevel("Item");
	const pointerDown = useRef(false);
	const select = (item: HTMLElement) => {
		if (disabled) {
			return;
		}
		const event = new CustomEvent("mantle.dropdown-menu.select", {
			bubbles: true,
			cancelable: true,
		});
		item.addEventListener(event.type, (selectEvent) => onSelect?.(selectEvent), { once: true });
		item.dispatchEvent(event);
		afterSelect?.();
		if (selectCloses && !event.defaultPrevented) {
			level.closeAll();
		}
	};
	return {
		"aria-disabled": disabled ? true : undefined,
		tabIndex: -1,
		onFocus: (event: FocusEvent<HTMLDivElement>) => {
			event.currentTarget.setAttribute("data-highlighted", "");
		},
		onBlur: (event: FocusEvent<HTMLDivElement>) => {
			event.currentTarget.removeAttribute("data-highlighted");
		},
		onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
			if (event.pointerType !== "mouse" || level.isInSubmenuPath(event.clientX, event.clientY)) {
				return;
			}
			if (disabled) {
				focusWithoutScroll(level.menuRef.current);
			} else if (event.currentTarget.ownerDocument.activeElement !== event.currentTarget) {
				focusWithoutScroll(event.currentTarget);
			}
		},
		onPointerLeave: (event: PointerEvent<HTMLDivElement>) => {
			if (event.pointerType !== "mouse" || level.isInSubmenuPath(event.clientX, event.clientY)) {
				return;
			}
			if (event.currentTarget.ownerDocument.activeElement === event.currentTarget) {
				focusWithoutScroll(level.menuRef.current);
			}
		},
		onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
			pointerDown.current = event.isPrimary;
		},
		onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
			// Why: a press that started on the trigger and ends on an item selects
			// it, as a native menu does. A press on the item itself selects on click.
			if (!pointerDown.current) {
				event.currentTarget.click();
			}
			pointerDown.current = false;
		},
		onClick: (event: MouseEvent<HTMLDivElement>) => select(event.currentTarget),
		onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
			if (event.target !== event.currentTarget || disabled) {
				return;
			}
			if (event.key === "Enter" || (event.key === " " && !level.isTyping())) {
				event.preventDefault();
				event.currentTarget.click();
			}
		},
	};
}

/** Composes a consumer handler with a part's handler: the consumer's runs first and can prevent the part's. */
function compose<TEvent extends { defaultPrevented: boolean }>(
	consumer: ((event: TEvent) => void) | undefined,
	part: (event: TEvent) => void,
): (event: TEvent) => void {
	return (event) => {
		consumer?.(event);
		if (!event.defaultPrevented) {
			part(event);
		}
	};
}

/** The item props `useItemBehavior` handles, so a part can compose a consumer's handlers with its own. */
type ItemHandlers = Pick<
	ComponentProps<"div">,
	| "onBlur"
	| "onClick"
	| "onFocus"
	| "onKeyDown"
	| "onPointerDown"
	| "onPointerLeave"
	| "onPointerMove"
	| "onPointerUp"
>;

/** Spreads `behavior` with each consumer handler composed ahead of it. */
function withHandlers(
	behavior: ReturnType<typeof useItemBehavior>,
	handlers: ItemHandlers,
): ReturnType<typeof useItemBehavior> {
	return {
		...behavior,
		onBlur: compose(handlers.onBlur, behavior.onBlur),
		onClick: compose(handlers.onClick, behavior.onClick),
		onFocus: compose(handlers.onFocus, behavior.onFocus),
		onKeyDown: compose(handlers.onKeyDown, behavior.onKeyDown),
		onPointerDown: compose(handlers.onPointerDown, behavior.onPointerDown),
		onPointerLeave: compose(handlers.onPointerLeave, behavior.onPointerLeave),
		onPointerMove: compose(handlers.onPointerMove, behavior.onPointerMove),
		onPointerUp: compose(handlers.onPointerUp, behavior.onPointerUp),
	};
}

/** The props every item takes. */
type ItemProps = Omit<ComponentProps<"div">, "onSelect"> &
	WithAsChild &
	WithDataSlot & {
		/** Whether the item is disabled. Keyboard focus skips it, and it does not select. */
		disabled?: boolean;
		/** Runs when the user selects the item, by pointer or key. Call `event.preventDefault()` to keep the menu open. */
		onSelect?: (event: Event) => void;
		/** The text typeahead matches. Defaults to the item's text content. */
		textValue?: string;
	};

/**
 * Props for `DropdownMenu.SubTrigger`.
 */
type DropdownMenuSubTriggerProps = Omit<ItemProps, "onSelect"> & {
	/** Adds left padding, to line up with items that have an icon. */
	inset?: boolean;
};

/**
 * A timer that opens a submenu after the pointer rests on its trigger for 100 ms.
 * A second `start` while it runs does not restart it, and an unmount cancels it.
 */
function useHoverTimer() {
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	return useMemo(
		() => ({
			start: (callback: () => void) => {
				if (timer.current !== undefined) {
					return;
				}
				timer.current = setTimeout(() => {
					timer.current = undefined;
					callback();
				}, 100);
			},
			cancel: () => {
				clearTimeout(timer.current);
				timer.current = undefined;
			},
		}),
		[],
	);
}

/**
 * Owns the stop function of the pointer path to an open submenu, which
 * listens on the document. A new path, a close, or an unmount stops it.
 */
function usePathListener() {
	const current = useRef<(() => void) | null>(null);
	useEffect(() => () => current.current?.(), []);
	return useMemo(
		() => ({
			start: (stop: () => void) => {
				current.current?.();
				current.current = stop;
			},
			stop: () => current.current?.(),
			forget: (stop: () => void) => {
				if (current.current === stop) {
					current.current = null;
				}
			},
		}),
		[],
	);
}

/** The label span and the caret of a sub-menu trigger. */
const renderSubTriggerContent = (label: ReactNode) => (
	<>
		{/* Why the label span: decisions/2026-08-04-translation-safe-label-wrappers.md */}
		<span data-slot="dropdown-menu-sub-trigger-label" className="contents">
			{label}
		</span>
		<span className="absolute right-2 flex items-center">
			<Icon svg={<CaretRightIcon weight="bold" />} className="size-4 rtl:rotate-180" />
		</span>
	</>
);
/**
 * A trigger for a dropdown menu sub-menu. It opens the submenu on hover, or on
 * ArrowRight or Enter.
 *
 * **Structure.** `children` render inside a
 * `<span data-slot="dropdown-menu-sub-trigger-label">`. The caret is a permanent element
 * sibling, so without the span a bare text label is never a lone child: a
 * browser translation engine reparents that text node, and the removal React
 * runs when the label changes shape or goes away throws. The span is
 * `display: contents`, so an icon and its label stay flex items of the item and
 * keep its `gap`. An icon you pass as a child is now a grandchild, so a
 * `[&>svg]` class of your own no longer reaches it. Match the part's own
 * variant instead: `[&>[data-slot=dropdown-menu-sub-trigger-label]>svg]:size-4`.
 * A `[&_svg]` class or a class on the icon loses to the default, which is more
 * specific.
 *
 * **`asChild`.** The part merges onto your single child as the item element. The label
 * span and the caret move inside it, so the guarantee above holds on both paths.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"dropdown-menu-sub-trigger"` | On the item element. |
 * | `data-slot` | `"dropdown-menu-sub-trigger-label"` | On the `<span>` wrapping `children`. |
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusubtrigger
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <DropdownMenu.Item>Email</DropdownMenu.Item>
 *         <DropdownMenu.Item>Copy link</DropdownMenu.Item>
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const SubTrigger = ({
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	disabled,
	inset,
	onBlur,
	onClick,
	onFocus,
	onKeyDown,
	onPointerDown,
	onPointerLeave,
	onPointerMove,
	onPointerUp,
	ref,
	textValue,
	...props
}: DropdownMenuSubTriggerProps) => {
	const root = useRootState("SubTrigger");
	const sub = useSubState("SubTrigger");
	const level = useMenuLevel("SubTrigger");
	const composedRef = useComposedRefs(ref, sub.setTrigger);
	const openTimer = useHoverTimer();
	const path = usePathListener();
	useEffect(() => {
		if (!sub.open) {
			path.stop();
		}
	}, [path, sub.open]);
	const behavior = useItemBehavior({ disabled, onSelect: undefined, selectCloses: false });
	const Component = asChild ? Slot : "div";

	return (
		<Component
			role="menuitem"
			aria-haspopup="menu"
			aria-expanded={sub.open}
			aria-controls={sub.open ? sub.contentId : undefined}
			id={sub.triggerId}
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-sub-trigger")}
			data-text-value={textValue}
			className={cx(
				"focus:bg-accent aria-expanded:bg-accent relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-9 text-sm outline-hidden",
				"data-highlighted:bg-active-menu-item aria-expanded:bg-active-menu-item",
				"aria-disabled:cursor-default aria-disabled:opacity-50",
				// Why slot-scoped: the label span makes a consumer's svg a grandchild, so
				// a bare `[&>svg]` matches nothing. A `[&_svg]` would also resize the
				// indicator this part renders.
				"[&>[data-slot=dropdown-menu-sub-trigger-label]>svg]:size-5 [&_svg]:shrink-0",
				inset && "pl-8",
				className,
			)}
			ref={composedRef}
			{...props}
			{...withHandlers(behavior, {
				onBlur,
				onFocus,
				onPointerDown,
				onPointerUp,
				onClick: (event) => {
					onClick?.(event);
					// Why: a touch or a screen reader opens the submenu with a click.
					if (!event.defaultPrevented && !disabled && !sub.open) {
						sub.setOpenFocus("menu");
						sub.setOpen(true);
					}
				},
				onKeyDown: (event) => {
					onKeyDown?.(event);
					if (event.defaultPrevented || disabled || event.target !== event.currentTarget) {
						return;
					}
					const openKey = isRtl(event.currentTarget, root.dir) ? "ArrowLeft" : "ArrowRight";
					// Why: a space in a typeahead search is part of the search, as on an item.
					const isSpace = event.key === " " && !level.isTyping();
					if (event.key === openKey || event.key === "Enter" || isSpace) {
						event.preventDefault();
						sub.setOpenFocus("first");
						if (sub.open) {
							const subMenu = event.currentTarget.ownerDocument.getElementById(sub.contentId);
							focusFirst(subMenu == null ? [] : itemsOf(subMenu));
						} else {
							sub.setOpen(true);
						}
					}
				},
				onPointerMove: (event) => {
					onPointerMove?.(event);
					// Why the path check: a pointer on its way to a sibling's open submenu
					// crosses this trigger, and must not close that submenu.
					if (
						event.defaultPrevented ||
						event.pointerType !== "mouse" ||
						disabled ||
						level.isInSubmenuPath(event.clientX, event.clientY)
					) {
						return;
					}
					level.clearSubmenuPath();
					if (!sub.open) {
						openTimer.start(() => {
							sub.setOpenFocus("menu");
							sub.setOpen(true);
						});
					}
				},
				onPointerLeave: (event) => {
					onPointerLeave?.(event);
					openTimer.cancel();
					if (event.defaultPrevented || event.pointerType !== "mouse") {
						return;
					}
					const subMenu = event.currentTarget.ownerDocument.getElementById(sub.contentId);
					if (!sub.open || subMenu == null) {
						return;
					}
					// Why a triangle: a pointer on its way from the trigger to the
					// submenu crosses other items. The triangle from where it left to
					// the submenu's near edge keeps the submenu open and those items as they are.
					const box = subMenu.getBoundingClientRect();
					const edge = box.left >= event.clientX ? box.left : box.right;
					const exit = { x: event.clientX + (edge > event.clientX ? -4 : 4), y: event.clientY };
					const triangle = [exit, { x: edge, y: box.top }, { x: edge, y: box.bottom }] as const;
					const trigger = event.currentTarget;
					const inPath = (x: number, y: number) =>
						isInTriangle({ x, y }, triangle) ||
						isInBox(x, y, box) ||
						isInBox(x, y, trigger.getBoundingClientRect());
					level.setSubmenuPath(inPath);
					const document = trigger.ownerDocument;
					const onMove = (moveEvent: globalThis.PointerEvent) => {
						if (isInBox(moveEvent.clientX, moveEvent.clientY, subMenu.getBoundingClientRect())) {
							stop();
						} else if (!inPath(moveEvent.clientX, moveEvent.clientY)) {
							stop();
							sub.setOpen(false);
						}
					};
					const stop = () => {
						document.removeEventListener("pointermove", onMove);
						level.clearSubmenuPath(inPath);
						path.forget(stop);
					};
					path.start(stop);
					document.addEventListener("pointermove", onMove);
				},
			})}
		>
			{asChild ? slotContent(children, renderSubTriggerContent) : renderSubTriggerContent(children)}
		</Component>
	);
};

/**
 * The content container for a dropdown menu sub-menu.
 *
 * `DropdownMenu.Content` and `DropdownMenu.SubContent` are native
 * `popover="manual"` elements in the browser's top layer, placed by a script
 * next to their trigger, so no `overflow` or `z-index` clips them. Each portals into the
 * overlay or float that holds it, else into `document.body`, and closes when an
 * overlay that does not hold it opens. A float opened from an item, such as a
 * `Popover`, portals into the menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenusubcontent
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <DropdownMenu.Item>Export as PDF</DropdownMenu.Item>
 *         <DropdownMenu.Item>Export as CSV</DropdownMenu.Item>
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const SubContent = ({
	align = "start",
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	loop = true,
	onClick,
	onEscapeKeyDown,
	onFocusOutside,
	onInteractOutside,
	onKeyDown,
	onPointerDownOutside,
	ref,
	sideOffset = 2,
	...props
}: MenuPanelProps & {
	/**
	 * Which edge of the submenu lines up with the sub-trigger: its top edge (`start`) or its bottom edge (`end`).
	 * @default "start"
	 */
	align?: "start" | "end";
	/**
	 * The gap between the sub-trigger and the submenu, in pixels.
	 * @default 2
	 */
	sideOffset?: number;
}) => {
	const root = useRootState("SubContent");
	const sub = useSubState("SubContent");
	const parent = useMenuLevel("SubContent");
	const menuRef = useRef<HTMLElement | null>(null);
	const { isInSubmenuPath, setSubmenuPath, clearSubmenuPath } = useSubmenuPath();
	const [menu, setMenu] = useState<HTMLElement | null>(null);
	const { onMenuKeyDown, isTyping, resetTyping } = useMenuKeyboard(loop);
	const trigger = sub.triggerRef.current;
	// Why the trigger's direction: the keyboard opens the submenu with the arrow
	// key of the menu's direction, so the submenu opens on that side too.
	const opensLeft = sub.open && trigger != null ? isRtl(trigger, root.dir) : root.dir === "rtl";
	const { portalTarget, floatingRef, reconcile } = useFloat({
		open: root.open && sub.open,
		onDismiss: (reason) => {
			// Why: Escape in a submenu closes the whole menu, as a native menu does.
			if (reason === "escape") {
				parent.closeAll();
			} else {
				sub.setOpen(false);
			}
		},
		getAnchor: () => sub.triggerRef.current,
		getInsideElements: () => [sub.triggerRef.current],
		dismissOnOutside: true,
		dismissWhenCovered: true,
		side: opensLeft ? "left" : "right",
		align,
		sideOffset,
		dir: root.dir,
		onEscapeKeyDown,
		onFocusOutside,
		onInteractOutside,
		onPointerDownOutside,
		onShow: (floating) => {
			const focus = sub.takeOpenFocus();
			if (focus !== "menu") {
				focusOnOpen(floating, focus);
			}
		},
		onHide: (_floating, focusWasInside) => {
			resetTyping();
			if (focusWasInside) {
				focusWithoutScroll(sub.triggerRef.current);
			}
		},
	});
	const menuElementRef = useCallback((element: HTMLElement | null) => {
		menuRef.current = element;
		setMenu(element);
	}, []);
	const composedRef = useComposedRefs(ref, floatingRef, menuElementRef);
	const { closeAll } = parent;
	const level = useMemo<MenuLevel>(
		() => ({ menuRef, closeAll, isInSubmenuPath, setSubmenuPath, clearSubmenuPath, isTyping }),
		[clearSubmenuPath, closeAll, isInSubmenuPath, isTyping, setSubmenuPath],
	);
	useReconcileOnTriggerChange(sub.onTriggerChangeRef, reconcile);
	// Why around the element: see `Content`.
	const renderLevel = (inner: ReactNode) => (
		<LayerContainerContext.Provider value={menu}>
			<MenuLevelContext.Provider value={level}>{inner}</MenuLevelContext.Provider>
		</LayerContainerContext.Provider>
	);
	const Component = asChild ? Slot : "div";

	return (
		portalTarget != null &&
		createPortal(
			renderLevel(
				<Component
					id={sub.contentId}
					popover={hasPopoverApi ? "manual" : undefined}
					role="menu"
					aria-labelledby={sub.triggerId}
					aria-orientation="vertical"
					tabIndex={-1}
					dir={root.dir}
					data-slot={joinDataSlot(dataSlot, "dropdown-menu-sub-content")}
					data-open={sub.open ? "" : undefined}
					inert={!sub.open}
					className={cx(floatClassName, panelClassName, asChild && scrollClassName, className)}
					ref={composedRef}
					{...props}
					onClick={(event: MouseEvent<HTMLDivElement>) => {
						event.stopPropagation();
						onClick?.(event);
					}}
					onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
						onKeyDown?.(event);
						if (event.defaultPrevented) {
							return;
						}
						const closeKey = isRtl(event.currentTarget, root.dir) ? "ArrowRight" : "ArrowLeft";
						if (event.key === closeKey && isMenuKey(event.currentTarget, event.target)) {
							event.preventDefault();
							sub.setOpen(false);
							focusWithoutScroll(sub.triggerRef.current);
							return;
						}
						onMenuKeyDown(event);
					}}
				>
					{asChild ? children : renderScroller(children)}
				</Component>,
			),
			portalTarget,
		)
	);
};

/**
 * An item in the dropdown menu.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Open Menu
 *     </Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Item 1</DropdownMenu.Item>
 *     <DropdownMenu.Item>Item 2</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Item = ({
	asChild = false,
	className,
	"data-slot": dataSlot,
	disabled,
	inset,
	onBlur,
	onClick,
	onFocus,
	onKeyDown,
	onPointerDown,
	onPointerLeave,
	onPointerMove,
	onPointerUp,
	onSelect,
	textValue,
	...props
}: ItemProps & {
	/** Adds left padding, to line up with items that have an icon. */
	inset?: boolean;
}) => {
	const behavior = useItemBehavior({ disabled, onSelect });
	const Component = asChild ? Slot : "div";
	return (
		<Component
			role="menuitem"
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-item")}
			data-text-value={textValue}
			className={cx(
				"relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-strong text-sm font-normal outline-hidden transition-colors",
				"data-highlighted:bg-active-menu-item",
				"focus:bg-accent focus:text-accent-foreground",
				"aria-disabled:cursor-default aria-disabled:opacity-50",
				"[&>svg]:size-5 [&_svg]:shrink-0",
				inset && "pl-8",
				className,
			)}
			{...props}
			{...withHandlers(behavior, {
				onBlur,
				onClick,
				onFocus,
				onKeyDown,
				onPointerDown,
				onPointerLeave,
				onPointerMove,
				onPointerUp,
			})}
		/>
	);
};

/** The check this part shows while checked, with the label span beside it. */
function renderCheckContent({ slot, checked }: { slot: string; checked: boolean }) {
	return (label: ReactNode) => (
		<>
			<span className="absolute right-2 flex items-center">
				{checked && <Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />}
			</span>
			{/* Why the label span: decisions/2026-08-04-translation-safe-label-wrappers.md */}
			<span data-slot={`${slot}-label`} className="contents">
				{label}
			</span>
		</>
	);
}

/**
 * Props for `DropdownMenu.CheckboxItem`.
 */
type DropdownMenuCheckboxItemProps = ItemProps & {
	/** The checked state, for a controlled item. Pair it with `onCheckedChange`. */
	checked?: boolean | "indeterminate";
	/** The checked state on the first render, for an uncontrolled item. */
	defaultChecked?: boolean | "indeterminate";
	/** Runs when the user checks or unchecks the item. */
	onCheckedChange?: (checked: boolean) => void;
};

/**
 * A menu item with a checkbox that can be controlled or uncontrolled.
 *
 * **Structure.** `children` render inside a
 * `<span data-slot="dropdown-menu-checkbox-item-label">`. The check indicator is a permanent element
 * sibling, so without the span a bare text label is never a lone child: a
 * browser translation engine reparents that text node, and the removal React
 * runs when the label changes shape or goes away throws. The span is
 * `display: contents`, so an icon and its label stay flex items of the item and
 * keep its `gap`. An icon you pass as a child is now a grandchild, so a
 * `[&>svg]` class of your own no longer reaches it. Match the part's own
 * variant instead: `[&>[data-slot=dropdown-menu-checkbox-item-label]>svg]:size-4`.
 * A `[&_svg]` class or a class on the icon loses to the default, which is more
 * specific.
 *
 * **`asChild`.** The part merges onto your single child as the item element. The label
 * span and the indicator move inside it, so the guarantee above holds on both paths.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"dropdown-menu-checkbox-item"` | On the item element. |
 * | `data-slot` | `"dropdown-menu-checkbox-item-label"` | On the `<span>` wrapping `children`. |
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenucheckboxitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.CheckboxItem checked={true} onCheckedChange={setChecked}>
 *       Show notifications
 *     </DropdownMenu.CheckboxItem>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const CheckboxItem = ({
	asChild = false,
	checked: checkedProp,
	children,
	className,
	"data-slot": dataSlot,
	defaultChecked = false,
	disabled,
	onBlur,
	onCheckedChange,
	onClick,
	onFocus,
	onKeyDown,
	onPointerDown,
	onPointerLeave,
	onPointerMove,
	onPointerUp,
	onSelect,
	textValue,
	...props
}: DropdownMenuCheckboxItemProps) => {
	const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
	const checked = checkedProp ?? uncontrolledChecked;
	const behavior = useItemBehavior({
		disabled,
		onSelect,
		afterSelect: () => {
			const next = checked === "indeterminate" ? true : !checked;
			if (checkedProp === undefined) {
				setUncontrolledChecked(next);
			}
			onCheckedChange?.(next);
		},
	});
	const Component = asChild ? Slot : "div";
	const renderContent = renderCheckContent({
		slot: "dropdown-menu-checkbox-item",
		checked: checked !== false,
	});
	const ariaChecked = checked === "indeterminate" ? "mixed" : checked;
	return (
		<Component
			role="menuitemcheckbox"
			aria-checked={ariaChecked}
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-checkbox-item")}
			data-text-value={textValue}
			className={cx(
				"text-strong aria-disabled:pointer-events-none aria-disabled:opacity-50 relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-9 text-sm font-normal outline-hidden",
				"data-highlighted:bg-active-menu-item",
				"aria-checked:bg-selected-menu-item",
				"data-highlighted:aria-checked:bg-active-selected-menu-item!",
				// Why slot-scoped: the label span makes a consumer's svg a grandchild, so
				// a bare `[&>svg]` matches nothing. A `[&_svg]` would also resize the
				// indicator this part renders.
				"[&>[data-slot=dropdown-menu-checkbox-item-label]>svg]:size-5 [&_svg]:shrink-0",
				className,
			)}
			{...props}
			{...withHandlers(behavior, {
				onBlur,
				onClick,
				onFocus,
				onKeyDown,
				onPointerDown,
				onPointerLeave,
				onPointerMove,
				onPointerUp,
			})}
		>
			{asChild ? slotContent(children, renderContent) : renderContent(children)}
		</Component>
	);
};

/**
 * Props for `DropdownMenu.RadioItem`.
 */
type DropdownMenuRadioItemProps = ItemProps & {
	/** The value the group takes when the user checks this item. */
	value: string;
	/** Rendered as the item's `name` attribute. */
	name?: string;
};

/**
 * A menu item with a radio button that can be controlled or uncontrolled.
 * Used within a RadioGroup to create a set of mutually exclusive options.
 *
 * **Structure.** `children` render inside a
 * `<span data-slot="dropdown-menu-radio-item-label">`. The check indicator is a permanent element
 * sibling, so without the span a bare text label is never a lone child: a
 * browser translation engine reparents that text node, and the removal React
 * runs when the label changes shape or goes away throws. The span is
 * `display: contents`, so an icon and its label stay flex items of the item and
 * keep its `gap`. An icon you pass as a child is now a grandchild, so a
 * `[&>svg]` class of your own no longer reaches it. Match the part's own
 * variant instead: `[&>[data-slot=dropdown-menu-radio-item-label]>svg]:size-4`.
 * A `[&_svg]` class or a class on the icon loses to the default, which is more
 * specific.
 *
 * **`asChild`.** The part merges onto your single child as the item element. The label
 * span and the indicator move inside it, so the guarantee above holds on both paths.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"dropdown-menu-radio-item"` | On the item element. |
 * | `data-slot` | `"dropdown-menu-radio-item-label"` | On the `<span>` wrapping `children`. |
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuradioitem
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.RadioGroup value="small" onValueChange={setSize}>
 *       <DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
 *       <DropdownMenu.RadioItem value="medium">Medium</DropdownMenu.RadioItem>
 *       <DropdownMenu.RadioItem value="large">Large</DropdownMenu.RadioItem>
 *     </DropdownMenu.RadioGroup>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const RadioItem = ({
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	disabled,
	onBlur,
	onClick,
	onFocus,
	onKeyDown,
	onPointerDown,
	onPointerLeave,
	onPointerMove,
	onPointerUp,
	onSelect,
	textValue,
	value,
	...props
}: DropdownMenuRadioItemProps) => {
	const group = useContext(RadioGroupContext);
	invariant(
		group != null,
		"`DropdownMenu.RadioItem` must be rendered inside `DropdownMenu.RadioGroup`.",
	);
	const checked = group.value === value;
	const behavior = useItemBehavior({
		disabled,
		onSelect,
		afterSelect: () => group.setValue(value),
	});
	const Component = asChild ? Slot : "div";
	const renderContent = renderCheckContent({ slot: "dropdown-menu-radio-item", checked });
	return (
		<Component
			role="menuitemradio"
			aria-checked={checked}
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-radio-item")}
			data-text-value={textValue}
			className={cx(
				"text-strong aria-disabled:pointer-events-none aria-disabled:opacity-50 relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 px-2 text-sm font-normal outline-none",
				"data-highlighted:bg-active-menu-item",
				"aria-checked:bg-selected-menu-item aria-checked:pr-9",
				"data-highlighted:aria-checked:bg-active-selected-menu-item!",
				// Why slot-scoped: the label span makes a consumer's svg a grandchild, so
				// a bare `[&>svg]` matches nothing. A `[&_svg]` would also resize the
				// indicator this part renders.
				"[&>[data-slot=dropdown-menu-radio-item-label]>svg]:size-5 [&_svg]:shrink-0",
				className,
			)}
			{...props}
			{...withHandlers(behavior, {
				onBlur,
				onClick,
				onFocus,
				onKeyDown,
				onPointerDown,
				onPointerLeave,
				onPointerMove,
				onPointerUp,
			})}
		>
			{asChild ? slotContent(children, renderContent) : renderContent(children)}
		</Component>
	);
};

/**
 * A label for a group of dropdown menu items.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenulabel
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Label>My Account</DropdownMenu.Label>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <DropdownMenu.Item>Settings</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Label = ({
	asChild = false,
	className,
	"data-slot": dataSlot,
	inset,
	...props
}: ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/** Adds left padding, to line up with items that have an icon. */
		inset?: boolean;
	}) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-label")}
			className={cx("px-2 py-1.5 text-sm font-medium", inset && "pl-8", className)}
			{...props}
		/>
	);
};

/**
 * A visual separator between dropdown menu items or groups.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenuseparator
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item>Copy</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item>Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const DropdownSeparator = ({
	"data-slot": dataSlot,
	className,
	...props
}: ComponentProps<typeof Separator> & WithDataSlot) => (
	<Separator
		data-slot={joinDataSlot(dataSlot, "dropdown-menu-separator")}
		className={cx("-mx-1.25 my-1 w-auto", className)}
		{...props}
	/>
);

/**
 * A keyboard shortcut indicator for dropdown menu items. It locks
 * `translate="no"`, because a translated key name names the wrong key.
 *
 * @see https://mantle.ngrok.com/components/overlays/dropdown-menu#dropdownmenushortcut
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>
 *       Save
 *       <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
 *     </DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const Shortcut = ({
	"data-slot": dataSlot,
	className,
	...props
}: Omit<ComponentProps<"span">, "translate"> & WithDataSlot) => {
	return (
		<span
			data-slot={joinDataSlot(dataSlot, "dropdown-menu-shortcut")}
			className={cx("ml-auto text-xs tracking-widest opacity-60", className)}
			{...props}
			// Why after the spread: a wider props object can still carry `translate`
			// past the type, and a translated shortcut key names the wrong key.
			translate="no"
		/>
	);
};

export {
	//,
	Root,
	CheckboxItem,
	Content,
	Group,
	Item,
	Label,
	RadioGroup,
	RadioItem,
	DropdownSeparator,
	Shortcut,
	Sub,
	SubContent,
	SubTrigger,
	Trigger,
};
