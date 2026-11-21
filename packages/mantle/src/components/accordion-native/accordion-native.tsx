"use client";
// Why no memo: the browser owns the open state, so the parts re-render only with their parent,
// and `Root` memoizes its context by hand. The compiler's caches add 0.8 KB gzip and save no render.
"use no memo";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import {
	cloneElement,
	type ComponentProps,
	createContext,
	isValidElement,
	useContext,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	accordionBodyClassName,
	accordionRootClassName,
	accordionTriggerClassName,
	accordionTriggerIconClassName,
} from "../accordion/accordion-classes.js";
import {
	type AccordionValueProps,
	emitValueChange,
	isItemOpen,
	nextOpenValues,
	toOpenValues,
} from "../accordion/accordion-state.js";
import type { IconProps } from "../icon/icon.js";
import type { SvgAttributes } from "../icon/types.js";
import { Slot } from "../slot/index.js";

type AccordionContextValue = {
	/** The shared `<details name>` of a `"single"` accordion; `undefined` in `"multiple"` mode. */
	name: string | undefined;
	/** The open item values that `Item` writes to `open`: the controlled `value`, else the `defaultValue`. */
	openValues: readonly string[];
	/** Reports one `<details>` element's `toggle` event to the consumer's `onValueChange`. */
	onItemToggle: (options: { itemValue: string; open: boolean }) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

// Why no item context: a check that `Trigger` and `Content` sit in an `Item` needs a provider in
// each item, which adds about 4 ms to the hydration of 40 items. A misplaced part is visible.

/**
 * Reads the nearest {@link Root} context, and throws a helpful error when a part renders
 * outside of `Accordion.Root`.
 */
function useAccordionContext(component: string): AccordionContextValue {
	const context = useContext(AccordionContext);
	invariant(context, `\`${component}\` must be rendered within \`Accordion.Root\`.`);
	return context;
}

/**
 * Props for {@link Root}: the same `type`, `value`, `defaultValue`, and `onValueChange` union as
 * `Accordion.Root` from `@ngrok/mantle/accordion`, plus all standard `<div>` props and `asChild`.
 */
type AccordionRootProps = AccordionValueProps &
	// `defaultValue` is omitted because the union above types it per `type`.
	Omit<ComponentProps<"div">, "defaultValue"> &
	WithAsChild &
	WithDataSlot;

/**
 * A vertically stacked set of disclosure sections on native `<details>` and `<summary>`
 * elements. The browser opens and closes each section, so the accordion ships no
 * open-state JavaScript, and a section opens before the page hydrates.
 *
 * The API is the API of `Accordion` from `@ngrok/mantle/accordion`, so a swap is an import
 * change. Know these trade-offs first:
 * - `Trigger` is a `<summary>` and the direct first child of `Item`. It takes no `asChild`.
 * - `type="single"` sets one `<details name>` on every item (Chrome 120, Safari 17.2,
 *   Firefox 130). Older browsers let several sections open at once.
 * - The browser owns `open`. `onValueChange` reports from the `toggle` event after the change,
 *   and a controlled `value` that rejects a change does not close the section again.
 * - The open and close slide needs `::details-content` and `interpolate-size`. Without them, a
 *   section opens and closes with no motion.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native#accordionroot
 *
 * @example
 * ```tsx
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
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
 * ```
 */
const Root = (props: AccordionRootProps) => {
	const {
		type = "multiple",
		value,
		defaultValue,
		onValueChange: _onValueChange,
		"data-slot": dataSlot,
		asChild,
		children,
		className,
		ref,
		...domProps
	} = props;
	const isControlled = value != null;
	const name = useId();
	// Why state and not a fresh read of `defaultValue`: an uncontrolled `open` must never change
	// after the first render, so React never writes over the open state the browser owns.
	const [defaultOpenValues] = useState(() => toOpenValues(defaultValue));
	// Why a ref: the browser owns the uncontrolled open state, so a re-render has nothing to show.
	// The `toggle` handler reads and writes it to compute the next `onValueChange` value.
	const uncontrolledOpenValuesRef = useRef<readonly string[] | null>(null);
	// Why the memo: `toOpenValues` wraps a controlled single `value` in a fresh array, and a fresh
	// array on every render misses the context memo below.
	const openValues = useMemo(
		() => (isControlled ? toOpenValues(value) : defaultOpenValues),
		[isControlled, value, defaultOpenValues],
	);
	// Why a ref: `emitValueChange` needs the whole discriminated `props`, a new object on every
	// render. The layout effect writes it before any `toggle` event can read it.
	const propsRef = useRef(props);
	useIsomorphicLayoutEffect(() => {
		propsRef.current = props;
	});

	const context = useMemo<AccordionContextValue>(
		() => ({
			name: type === "single" ? name : undefined,
			openValues,
			// Why no guard for the item a `<details name>` group closes: its `toggle` event fires
			// after the opened item's, so `current` no longer holds it and nothing changes.
			onItemToggle: ({ itemValue, open }) => {
				const current = isControlled
					? openValues
					: (uncontrolledOpenValuesRef.current ?? defaultOpenValues);
				const next = nextOpenValues({ openValues: current, value: itemValue, open, type });
				if (next === current) {
					return;
				}
				uncontrolledOpenValuesRef.current = next;
				emitValueChange(propsRef.current, next);
			},
		}),
		[type, name, openValues, isControlled, defaultOpenValues],
	);

	const containerProps = {
		...domProps,
		"data-slot": joinDataSlot(dataSlot, "accordion"),
		className: accordionRootClassName(className),
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
 * A single collapsible section, rendered as a native `<details>`. The browser sets its `open`
 * attribute; style the open state with Tailwind's `open:` variant. In a `type="single"`
 * accordion, every item shares one `name`, so the browser keeps one item open.
 *
 * Its first child must be the {@link Trigger}, so the header is the `<summary>` itself. Put no
 * other control in the header row.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native#accordionitem
 *
 * @example
 * ```tsx
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It is a native disclosure widget.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Item = ({
	"data-slot": dataSlot,
	children,
	className,
	onToggle,
	value,
	ref,
	...props
}: Omit<ComponentProps<"details">, "open" | "name"> & {
	/** The unique value identifying this item within its accordion. */
	value: string;
} & WithDataSlot) => {
	const { name, openValues, onItemToggle } = useAccordionContext("Accordion.Item");

	return (
		<details
			ref={ref}
			{...props}
			name={name}
			open={isItemOpen(openValues, value)}
			data-slot={joinDataSlot(dataSlot, "accordion-item")}
			className={cx(
				// The browser wraps every child after the `<summary>` in `::details-content`, which
				// slides height 0 <-> auto through `interpolate-size` (Chromium only; other engines
				// snap). `content-visibility` transitions with `allow-discrete`, so the content stays
				// rendered through the close slide.
				"[interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-hidden details-content:transition-[height,content-visibility] details-content:transition-discrete details-content:duration-200 details-content:ease-out-strong open:details-content:h-auto motion-reduce:details-content:transition-none",
				className,
			)}
			onToggle={(event) => {
				onToggle?.(event);
				onItemToggle({ itemValue: value, open: event.currentTarget.open });
			}}
		>
			{children}
		</details>
	);
};

/**
 * The header that toggles its section, rendered as a native `<summary>`: the browser gives it
 * the button role, the expanded state, and the Enter and Space keys. It must be the direct
 * first child of {@link Item}. Place the {@link TriggerIcon} as the last child so the default
 * `justify-between` layout pushes it to the trailing edge.
 *
 * Why no `asChild` and no `disabled`: the browser toggles a `<details>` only from its own
 * `<summary>`, and a `<summary>` has no disabled state.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native#accordiontrigger
 *
 * @example
 * ```tsx
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It is a native disclosure widget.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Trigger = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<"summary"> & WithDataSlot) => (
	<summary
		ref={ref}
		{...props}
		data-slot={joinDataSlot(dataSlot, "accordion-trigger")}
		className={accordionTriggerClassName(className)}
	/>
);

// Hoisted so the default `svg` is a stable element reference instead of a new
// element allocated on every render.
const defaultTriggerIcon = <CaretDownIcon weight="bold" />;

/**
 * The icon that shows the open or closed state of its {@link Trigger}. Defaults to a downward
 * caret that turns 180° while its section is open. Pass `svg` to override it with any icon
 * (the turn still applies; override `className` to change it). It renders the svg itself with
 * `aria-hidden`, so its `data-slot` is `accordion-trigger-icon` alone; pass `aria-hidden={false}`
 * with a label to announce it.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native#accordiontriggericon
 *
 * @example
 * ```tsx
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It is a native disclosure widget.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const TriggerIcon = ({
	"data-slot": dataSlot,
	className,
	svg = defaultTriggerIcon,
	...props
}: Omit<IconProps, "svg"> & {
	/** The icon to render. Defaults to a downward caret that turns while open. */
	svg?: IconProps["svg"];
} & WithDataSlot) => {
	invariant(
		isValidElement<SvgAttributes>(svg),
		"`Accordion.TriggerIcon` must be passed a single SVG icon as a JSX tag.",
	);
	// Why `cloneElement` and not `Icon`: the `Icon` and `SvgOnly` layers add about 9 ms to the
	// hydration of 40 items at a 4x CPU throttle, and a long page is this component's use case.
	return cloneElement(svg, {
		"aria-hidden": true,
		...props,
		"data-slot": joinDataSlot(dataSlot, "accordion-trigger-icon"),
		className: accordionTriggerIconClassName(
			svg.props.className == null ? className : cx(className, svg.props.className),
		),
	});
};

/**
 * The collapsible region of an {@link Item}. The browser hides it while its `<details>` is
 * closed: out of the accessibility tree and the tab order, and still found by find-in-page
 * in browsers that open a `<details>` on a match. Wrap its children in {@link Body} for the
 * standard padding. It fades with the slide of its `<details>`.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native#accordioncontent
 *
 * @example
 * ```tsx
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body>Yes. It is a native disclosure widget.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Content = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		ref={ref}
		{...props}
		data-slot={joinDataSlot(dataSlot, "accordion-content")}
		className={cx(
			"opacity-0 transition-opacity duration-200 ease-out-strong [[open]>&]:opacity-100 motion-reduce:transition-none",
			className,
		)}
	/>
);

/**
 * The padded inner region of an {@link Item}'s {@link Content}, where the section's body
 * content lives. The `pt-1` keeps the trigger's focus ring off the body's first line. Text
 * inherits the ambient size. Override `className` to retune the padding (e.g. `pb-0`,
 * `px-6`); `cx` resolves last-wins.
 *
 * @see https://mantle.ngrok.com/components/data-display/accordion-native#accordionbody
 *
 * @example
 * ```tsx
 * import { Accordion } from "@ngrok/mantle/accordion/native";
 *
 * <Accordion.Root type="single" defaultValue="item-1">
 *   <Accordion.Item value="item-1">
 *     <Accordion.Trigger>
 *       Is it accessible?
 *       <Accordion.TriggerIcon />
 *     </Accordion.Trigger>
 *     <Accordion.Content>
 *       <Accordion.Body className="pb-6">Yes. It is a native disclosure widget.</Accordion.Body>
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Body = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<"div"> & WithDataSlot) => (
	<div
		ref={ref}
		{...props}
		data-slot={joinDataSlot(dataSlot, "accordion-body")}
		className={accordionBodyClassName(className)}
	/>
);

export {
	//,
	Root,
	Item,
	Trigger,
	TriggerIcon,
	Content,
	Body,
};
