"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import {
	type ComponentProps,
	type ComponentRef,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon, type IconProps } from "../icon/icon.js";
import { Slot } from "../slot/index.js";
import { type AccordionType, isItemOpen, nextOpenValues, toOpenValues } from "./accordion-state.js";

/**
 * Invokes the consumer's `onValueChange` with the correctly-typed value for the
 * current `type`. Kept as a standalone function so the discriminated-union
 * narrowing on `props.type` (and thus the matching `onValueChange` signature) is
 * preserved without a type assertion.
 *
 * @example
 * emitValueChange({ type: "single", onValueChange }, ["a"]);        // onValueChange("a")
 * emitValueChange({ type: "multiple", onValueChange }, ["a", "b"]); // onValueChange(["a", "b"])
 */
function emitValueChange(props: AccordionRootProps, next: readonly string[]): void {
	if (props.type === "single") {
		props.onValueChange?.(next[0] ?? "");
	} else {
		props.onValueChange?.([...next]);
	}
}

/**
 * Feature-detects support for `hidden="until-found"` + the `beforematch` event,
 * which is what lets the browser's find-in-page reveal collapsed content. Safe
 * to call only on the client (after mount).
 *
 * @example
 * if (supportsBeforeMatch()) { node.setAttribute("hidden", "until-found"); }
 */
function supportsBeforeMatch(): boolean {
	return (
		typeof document !== "undefined" && document.body != null && "onbeforematch" in document.body
	);
}

type AccordionContextValue = {
	type: AccordionType;
	openValues: readonly string[];
	setItemOpen: (value: string, open: boolean) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

/**
 * Reads the nearest {@link Root} context, throwing a helpful error if a part is
 * rendered outside of `Accordion.Root`.
 */
function useAccordionContext(component: string): AccordionContextValue {
	const context = useContext(AccordionContext);
	invariant(context, `\`${component}\` must be rendered within \`Accordion.Root\`.`);
	return context;
}

type AccordionItemContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
};

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

/**
 * Reads the nearest {@link Item} context, throwing a helpful error if a part is
 * rendered outside of `Accordion.Item`.
 */
function useAccordionItemContext(component: string): AccordionItemContextValue {
	const context = useContext(AccordionItemContext);
	invariant(context, `\`${component}\` must be rendered within \`Accordion.Item\`.`);
	return context;
}

/**
 * `"single"` mode props: at most one item open at a time — opening a section
 * auto-closes the previously open one. This is the **opt-in** behavior; `type`
 * defaults to `"multiple"`, so you must set `type="single"` explicitly to get
 * the auto-close accordion. `value`/`defaultValue` are the open item's value
 * (`""` for none).
 */
type AccordionSingleProps = {
	/**
	 * Keep at most one section open at a time: opening a section auto-closes the
	 * previously open one. Must be set explicitly — the default is `"multiple"`,
	 * where sections open independently.
	 */
	type: "single";
	/** The controlled open item value (`""` for none). */
	value?: string;
	/** The initial open item value when uncontrolled. */
	defaultValue?: string;
	/** Called with the newly open item value (`""` when collapsed). */
	onValueChange?: (value: string) => void;
};

/**
 * `"multiple"` mode props — the **default** when `type` is omitted: any number
 * of items may be open at once, and opening one never closes another.
 * `value`/`defaultValue` are the list of open item values. Use `type="single"`
 * instead if you want opening a section to auto-close the others.
 */
type AccordionMultipleProps = {
	/**
	 * Allow any number of sections open at once — the **default** when `type` is
	 * omitted. Opening one section never collapses the others. Switch to
	 * `type="single"` for the accordion that auto-closes the previously open
	 * section.
	 *
	 * @default "multiple"
	 */
	type?: "multiple";
	/** The controlled list of open item values. */
	value?: string[];
	/** The initial list of open item values when uncontrolled. */
	defaultValue?: string[];
	/** Called with the new list of open item values. */
	onValueChange?: (value: string[]) => void;
};

/**
 * Props for {@link Root}. A discriminated union on `type` so `value`,
 * `defaultValue`, and `onValueChange` are typed as a single string in
 * `"single"` mode and a string array in `"multiple"` mode. `type` is optional
 * and **defaults to `"multiple"`** — omitting it is the same as
 * `type="multiple"` (sections open independently), so `value` / `defaultValue` /
 * `onValueChange` are typed as string arrays. Set `type="single"` for the
 * accordion that keeps at most one section open at a time. Also accepts all
 * standard `<div>` props (forwarded to the container) plus `asChild`.
 */
type AccordionRootProps = (AccordionSingleProps | AccordionMultipleProps) &
	// `defaultValue` is omitted because the discriminated union above types it per
	// `type` (a `string` or `string[]`), narrower than the DOM's `defaultValue`.
	Omit<ComponentProps<"div">, "defaultValue"> &
	WithAsChild;

/**
 * A vertically stacked set of disclosure sections. The root owns the open/closed
 * state and provides it to its items.
 *
 * Built without a UI framework's collapsible: each section's collapsed content
 * stays in the DOM with `hidden="until-found"`, so the browser's find-in-page
 * (⌘F / Ctrl-F) can discover and auto-reveal matches inside closed sections (the
 * `beforematch` event syncs that reveal back into this component's state). Works
 * with controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`)
 * usage in both `"single"` and `"multiple"` modes.
 *
 * `type` is optional and **defaults to `"multiple"`** — sections open
 * independently and opening one never closes another. Pass `type="single"` for
 * the classic accordion where opening a section auto-closes the previously open
 * one.
 *
 * Items are separated by a hairline divider drawn with `divide-y` on the root,
 * colored with the shared `separator` token so it matches `Separator` and every
 * other divider in the system. Disable the dividers with `divide-y-0` on the root
 * (e.g. pair it with `space-y-*` for a spaced-card layout).
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion#accordionroot
 *
 * @example
 * <Accordion.Root type="single" defaultValue="shipping">
 *   <Accordion.Item value="shipping">
 *     <Accordion.Trigger>
 *       How long does shipping take?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Two to five business days.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const Root = (props: AccordionRootProps) => {
	// Pull the accordion-specific props out so the rest (`aria-*`, `data-*`, `id`,
	// `style`, event handlers, …) can be forwarded to the container without leaking
	// non-DOM attributes. `props` stays whole for `emitValueChange`, which relies on
	// the discriminated-union narrowing on `props.type` — so `onValueChange` is only
	// destructured to exclude it from `domProps` (hence the `_` name).
	const {
		// `type` defaults to "multiple": omitting it opens sections independently.
		// `type="single"` is the opt-in for the auto-closing accordion.
		type = "multiple",
		value,
		defaultValue,
		onValueChange: _onValueChange,
		asChild,
		children,
		className,
		ref,
		...domProps
	} = props;
	const isControlled = value != null;

	const [internalOpenValues, setInternalOpenValues] = useState<readonly string[]>(() =>
		toOpenValues(defaultValue),
	);
	const openValues = isControlled ? toOpenValues(value) : internalOpenValues;

	// `props` is intentionally a dependency: it carries the latest, correctly-typed
	// `onValueChange` (see `emitValueChange`). The memo only exists to satisfy
	// `react/jsx-no-constructed-context-values`; recomputing per render is fine at
	// accordion scale.
	const context = useMemo<AccordionContextValue>(() => {
		const setItemOpen = (itemValue: string, open: boolean) => {
			const next = nextOpenValues(openValues, itemValue, open, type);
			if (next === openValues) {
				return;
			}
			if (!isControlled) {
				setInternalOpenValues(next);
			}
			emitValueChange(props, next);
		};
		return { type, openValues, setItemOpen };
	}, [type, openValues, isControlled, props]);

	const containerProps = {
		...domProps,
		"data-slot": "accordion",
		// Dividers live on the root via `divide-y` (one border between adjacent items,
		// none trailing) rather than a per-item `border-b` + `last:border-b-0`. The color
		// is the shared `separator` token so dividers match `Separator` across the system.
		className: cx("w-full divide-y divide-separator", className),
	};

	return (
		<AccordionContext.Provider value={context}>
			{asChild ? (
				<Slot ref={ref} {...containerProps}>
					{children}
				</Slot>
			) : (
				<div ref={ref} {...containerProps}>
					{children}
				</div>
			)}
		</AccordionContext.Provider>
	);
};

/**
 * A single collapsible section, rendered as a plain `<div role="group">` — the
 * same accessibility role the browser gives a native `<details>`. Derives its
 * open state from {@link Root}.
 *
 * Because the item is just a `<div>`, its header can be any layout — e.g. a flex
 * row with the {@link Trigger} alongside a separate, non-toggling action button.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion#accordionitem
 *
 * @example
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const Item = ({
	children,
	value,
	ref,
	...props
}: ComponentProps<"div"> & {
	/** The unique value identifying this item within its accordion. */
	value: string;
}) => {
	const { openValues, setItemOpen } = useAccordionContext("Accordion.Item");
	const open = isItemOpen(openValues, value);

	const setOpen = useCallback(
		(next: boolean) => {
			setItemOpen(value, next);
		},
		[setItemOpen, value],
	);

	const itemContext = useMemo<AccordionItemContextValue>(
		() => ({ open, setOpen }),
		[open, setOpen],
	);

	return (
		<AccordionItemContext.Provider value={itemContext}>
			<div
				ref={ref}
				{...props}
				role="group"
				data-slot="accordion-item"
				data-state={open ? "open" : "closed"}
			>
				{children}
			</div>
		</AccordionItemContext.Provider>
	);
};

/**
 * The interactive header that toggles its section, rendered as a `<button>` with
 * `aria-expanded` — the disclosure semantics a native `<summary>` provides, but
 * via a real button so the role is consistent across browsers (native summary's
 * role varies). Place the {@link TriggerIcon} as the last child so the default
 * `justify-between` layout pushes it to the trailing edge.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion#accordiontrigger
 *
 * @example
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const Trigger = ({
	className,
	children,
	onClick,
	ref,
	...props
}: Omit<ComponentProps<"button">, "type">) => {
	const { open, setOpen } = useAccordionItemContext("Accordion.Trigger");

	return (
		<button
			ref={ref}
			type="button"
			{...props}
			data-slot="accordion-trigger"
			data-state={open ? "open" : "closed"}
			aria-expanded={open}
			className={cx(
				"group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left font-medium outline-none",
				// `-mx-2 px-2` gives the focus ring (and tap target) horizontal breathing room
				// without shifting the trigger's content — the negative margin cancels the padding,
				// the same trick the tabs trigger uses. `rounded-md` matches Button/IconButton.
				"-mx-2 rounded-md px-2",
				// When open, hand 8px of the trigger's bottom padding to `Accordion.Body`'s `pt-2`.
				// The gap below the trigger text stays a uniform 16px (8px here + 8px there), but
				// 8px of it now sits *outside* the button box, giving the `ring-4` focus ring the
				// vertical clearance it needs so it stops painting over the body's first line. The
				// split is invisible without a ring, and only applies when open — the collapsed
				// trigger keeps its symmetric `py-4`, so the trigger-to-divider rhythm is untouched.
				// Transition the padding on the same 200ms/ease-out curve as `Accordion.Content`'s
				// height so the bottom padding (and the ring's bottom edge) eases in step with the
				// open/close slide instead of snapping.
				"transition-[padding] duration-200 ease-out data-state-open:pb-2 motion-reduce:transition-none",
				"focus:outline-hidden focus-visible:ring-4 focus-visible:ring-focus-accent",
				className,
			)}
			onClick={(event) => {
				onClick?.(event);
				setOpen(!open);
			}}
		>
			{children}
		</button>
	);
};

// Hoisted so the default `svg` is a stable element reference instead of a new
// element allocated on every render.
const defaultTriggerIcon = <CaretDownIcon weight="bold" />;

/**
 * The icon that indicates the open/closed state of its {@link Trigger}. Defaults
 * to a downward caret that rotates 180° when the section is open. Pass `svg` to
 * override it with any icon (the rotation-on-open still applies; override
 * `className` to change that).
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion#accordiontriggericon
 *
 * @example
 * // Default caret
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 *
 * @example
 * // Custom icon
 * import { PlusIcon } from "@phosphor-icons/react/Plus";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon svg={<PlusIcon />} />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const TriggerIcon = ({
	className,
	svg = defaultTriggerIcon,
	...props
}: Omit<IconProps, "svg"> & {
	/** The icon to render. Defaults to a downward caret that rotates open. */
	svg?: IconProps["svg"];
}) => (
	<Icon
		{...props}
		data-slot="accordion-trigger-icon"
		svg={svg}
		className={cx(
			"size-4 shrink-0 text-muted transition-transform duration-200 group-data-state-open:rotate-180",
			className,
		)}
	/>
);

/**
 * The collapsible region of an {@link Item} — the zero-padding viewport that
 * slides open and closed. Wrap its children in {@link Body} for the standard
 * padding (text inherits the ambient size); `Content` itself stays unpadded so
 * its `h-0` collapse can reach zero height. Always rendered into the DOM; when
 * collapsed (in
 * supporting browsers) it carries `hidden="until-found"` so its text stays
 * discoverable by the browser's find-in-page, and a `beforematch` listener opens
 * the section when the browser reveals a match. It is flow content, so it may
 * contain anything — including interactive elements.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion#accordioncontent
 *
 * @example
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const Content = ({ className, children, ref, ...props }: ComponentProps<"div">) => {
	const { open, setOpen } = useAccordionItemContext("Accordion.Content");
	// Track the node ourselves (for the find-in-page reveal effects below) while
	// still forwarding it to any ref the consumer passes.
	const nodeRef = useRef<ComponentRef<"div">>(null);
	const composedRef = useComposedRefs(nodeRef, ref);

	// When the browser is about to reveal a find-in-page match inside this
	// (collapsed) region, open the item so our state agrees and it stays open.
	useEffect(() => {
		const node = nodeRef.current;
		if (!node || !supportsBeforeMatch()) {
			return;
		}
		const handleBeforeMatch = () => {
			// The browser reveals and highlights the match synchronously right after
			// this event, but our React-driven height (`data-state-open:h-auto`) only
			// applies a tick later. Without expanding now, the box is still
			// `h-0 overflow-hidden` when the browser paints its find highlight, so the
			// match opens but its highlight is clipped to zero height and lost. Removing
			// `hidden` restores `content-visibility`, so setting `height: auto` lays the
			// text out at full height before the highlight paints. The close branch of
			// the effect below clears this inline height so the slide animation resumes.
			node.removeAttribute("hidden");
			node.style.height = "auto";
			setOpen(true);
		};

		node.addEventListener("beforematch", handleBeforeMatch);

		return () => {
			node.removeEventListener("beforematch", handleBeforeMatch);
		};
	}, [setOpen]);

	// Toggle `hidden="until-found"` with the open state, imperatively: React types
	// `hidden` as boolean-only (no `"until-found"`) and has no `onBeforeMatch`, so
	// going through the JSX attribute is impossible without a type assertion.
	// Layout effect so the collapsed item is hidden before first paint (no flash).
	useIsomorphicLayoutEffect(() => {
		const node = nodeRef.current;
		if (!node) {
			return;
		}

		if (open || !supportsBeforeMatch()) {
			node.removeAttribute("hidden");
		} else {
			node.setAttribute("hidden", "until-found");
			// Drop any inline height a find-in-page reveal set so the class-driven
			// `h-0 ↔ h-auto` open/close slide takes over again.
			node.style.height = "";
		}
	}, [open]);

	return (
		<div
			ref={composedRef}
			{...props}
			data-slot="accordion-content"
			data-state={open ? "open" : "closed"}
			className={cx(
				// Animate height 0 <-> auto via `interpolate-size` (Chromium only; other
				// engines snap, which is fine — the slide is a progressive enhancement and
				// find-in-page works regardless). `content-visibility` transitions with
				// `allow-discrete` so the content stays rendered through the close slide
				// before `hidden="until-found"` skips it; `overflow-hidden` clips. Padding
				// lives on `Accordion.Body`, never here: a padded `h-0` border-box can't
				// collapse below its padding, so the closed section would stop short of
				// zero height instead of fully collapsing.
				"h-0 overflow-hidden transition-[height,content-visibility] duration-200 ease-out [interpolate-size:allow-keywords] transition-discrete data-state-open:h-auto motion-reduce:transition-none",
				className,
			)}
		>
			{children}
		</div>
	);
};

/**
 * The padded inner region of an {@link Item}'s {@link Content} — where the
 * section's body content lives. Owns the body's padding so {@link Content} can
 * stay a zero-padding animation viewport: a padded `h-0` border-box can't
 * collapse below its padding, so keeping the padding here lets the closed slide
 * reach zero height. The `pt-2` doubles as the focus ring's vertical clearance —
 * it pairs with the trigger's open-state `pb-2` so the gap below the trigger
 * stays a uniform 16px while 8px of it sits outside the button box, keeping the
 * ring off the body's first line (see {@link Trigger}). Text inherits the ambient
 * size — it isn't forced — so set a size on the content where you need one.
 * Override `className` to retune the padding (e.g. `pb-0`, `px-6`); `cx` resolves
 * last-wins.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion#accordionbody
 *
 * @example
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body className="pb-6">
 *         Yes. It adheres to the WAI-ARIA disclosure pattern.
 *       </Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const Body = ({ className, ref, ...props }: ComponentProps<"div">) => (
	<div ref={ref} {...props} data-slot="accordion-body" className={cx("pt-2 pb-4", className)} />
);

/**
 * A vertically stacked set of disclosure sections styled after the shadcn /
 * ngrok.com accordion.
 *
 * Its defining feature: collapsed content is never removed from the DOM — it
 * stays put with `hidden="until-found"` — so the browser's find-in-page (⌘F /
 * Ctrl-F) can find text inside closed sections and auto-expand them (synced via
 * the `beforematch` event). Built on plain `<div>`/`<button>` elements, so a
 * section header can be any layout, including a non-toggling action button
 * beside the trigger.
 *
 * `Accordion.Root` defaults to `type="multiple"` (sections open independently);
 * pass `type="single"` when opening one section should auto-close the others.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion
 *
 * @example
 * Composition:
 * ```
 * Accordion.Root
 * └── Accordion.Item
 *     ├── Accordion.Trigger
 *     │   └── Accordion.TriggerIcon
 *     └── Accordion.Content
 *         └── Accordion.Body
 * ```
 *
 * @example
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 */
const Accordion = {
	/**
	 * The root that owns open/closed state. See {@link Root}.
	 *
	 * @example
	 * <Accordion.Root type="single" defaultValue="item-1">
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Trigger>
	 *       Is it accessible?
	 *       <Accordion.TriggerIcon />
	 *     </Accordion.Trigger>
	 *     <Accordion.Content>
	 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 */
	Root,
	/**
	 * A single collapsible section. See {@link Item}.
	 *
	 * @example
	 * <Accordion.Root type="single" defaultValue="item-1">
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Trigger>
	 *       Is it accessible?
	 *       <Accordion.TriggerIcon />
	 *     </Accordion.Trigger>
	 *     <Accordion.Content>
	 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 */
	Item,
	/**
	 * The `<button>` header that toggles a section. See {@link Trigger}.
	 *
	 * @example
	 * <Accordion.Root type="single" defaultValue="item-1">
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Trigger>
	 *       Is it accessible?
	 *       <Accordion.TriggerIcon />
	 *     </Accordion.Trigger>
	 *     <Accordion.Content>
	 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 */
	Trigger,
	/**
	 * The caret indicating open/closed state. See {@link TriggerIcon}.
	 *
	 * @example
	 * <Accordion.Root type="single" defaultValue="item-1">
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Trigger>
	 *       Is it accessible?
	 *       <Accordion.TriggerIcon />
	 *     </Accordion.Trigger>
	 *     <Accordion.Content>
	 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 */
	TriggerIcon,
	/**
	 * The collapsible, find-in-page-discoverable body. See {@link Content}.
	 *
	 * @example
	 * <Accordion.Root type="single" defaultValue="item-1">
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Trigger>
	 *       Is it accessible?
	 *       <Accordion.TriggerIcon />
	 *     </Accordion.Trigger>
	 *     <Accordion.Content>
	 *       <Accordion.Body>Yes. It adheres to the WAI-ARIA disclosure pattern.</Accordion.Body>
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 */
	Content,
	/**
	 * The padded inner region of a {@link Content}. See {@link Body}.
	 *
	 * @example
	 * <Accordion.Root type="single" defaultValue="item-1">
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Trigger>
	 *       Is it accessible?
	 *       <Accordion.TriggerIcon />
	 *     </Accordion.Trigger>
	 *     <Accordion.Content>
	 *       <Accordion.Body className="pb-6">
	 *         Yes. It adheres to the WAI-ARIA disclosure pattern.
	 *       </Accordion.Body>
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 */
	Body,
} as const;

export {
	//,
	Accordion,
};
