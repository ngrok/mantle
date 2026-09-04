import { createSlot } from "@radix-ui/react-slot";
import {
	Children,
	type ComponentProps,
	type CSSProperties,
	createElement,
	type HTMLAttributes,
	isValidElement,
} from "react";
import type { WithStyleProps } from "../../types/with-style-props.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

/**
 * A `className` or `style` the child resolves itself, from state only the child
 * knows — react-router's `NavLink` calls it with
 * `{ isActive, isPending, isTransitioning }`, another component with something else
 * entirely. `Slot` never invents arguments for one and never inspects them; it
 * forwards the ones the child supplied, so they are typed `unknown`.
 */
type RenderProp<TValue> = (...args: unknown[]) => TValue | undefined;

/**
 * The child props `Slot` composes itself, because Radix's prop merging would
 * destroy a render prop it finds in them. They are the only two: a handler Radix
 * composes correctly already, and every other prop it forwards whole, so a render
 * prop anywhere else survives untouched and has nothing to compose.
 */
type ComposedChildProps = WithDataSlot & {
	className?: string | RenderProp<string>;
	style?: CSSProperties | RenderProp<CSSProperties>;
};

/**
 * Radix's `Slot`, retyped to carry a composed render prop. `createSlot`'s props
 * generic is Radix's own way to type a slot whose child is not a DOM element; it
 * replaces the default `HTMLAttributes` rather than extending it, so the DOM
 * attributes are re-added here minus the two props composed above.
 */
const SlotPrimitive = createSlot<
	HTMLElement,
	Omit<HTMLAttributes<HTMLElement>, "className" | "style"> & ComposedChildProps
>("Slot");

/**
 * `Slot`'s own `className` and `style` stay plain values. A render prop is only
 * meaningful on the child that knows how to call it, so accepting one here would
 * admit a value nothing ever resolves.
 */
type Props = Omit<ComponentProps<typeof SlotPrimitive>, "className" | "style"> & WithStyleProps;

/**
 * Composes the slot's `className` with the child's, in this precedence
 * (highest → lowest):
 *
 * 1. Child element’s own `className`   ← most specific / closest to the DOM
 * 2. Slot’s `className`                ← passed from the parent component
 * 3. Component’s internal base styles  ← applied earlier inside the component
 *
 * so a child can fully override parent + base styles when using `asChild` while the
 * component still defines sensible defaults. A render-prop child composes into a
 * render prop of the same shape, merging in the same precedence once the child
 * calls it.
 */
function composeClassName(
	slotClassName: string | undefined,
	childClassName: string | RenderProp<string> | undefined,
): string | RenderProp<string> {
	if (typeof childClassName === "function") {
		return (...args) => cx(slotClassName, childClassName(...args));
	}
	return cx(slotClassName, childClassName);
}

/**
 * Composes the slot's `style` with the child's, letting the child win per property —
 * the same precedence {@link composeClassName} uses. A lone side is returned as-is
 * rather than copied, so a stable `style` object keeps its identity across renders.
 */
function composeStyle(
	slotStyle: CSSProperties | undefined,
	childStyle: CSSProperties | RenderProp<CSSProperties> | undefined,
): CSSProperties | RenderProp<CSSProperties> | undefined {
	if (typeof childStyle === "function") {
		return (...args) => ({ ...slotStyle, ...childStyle(...args) });
	}
	if (slotStyle == null) {
		return childStyle;
	}
	if (childStyle == null) {
		return slotStyle;
	}
	return { ...slotStyle, ...childStyle };
}

/**
 * Merges its props onto its immediate child. This is useful for creating
 * components that can be rendered as different elements. Automatically merges
 * className props using `cx` for proper Tailwind class handling, and
 * concatenates `data-slot` values in DOM order (the composing parent's slot
 * chain first, then the child's own) so `asChild` composition accumulates the
 * whole slot chain instead of one side clobbering the other.
 *
 * A child that resolves its own `className` or `style` from state only it knows —
 * react-router's `NavLink`, whose `className` may be `({ isActive }) => …` — keeps
 * that behavior: the merge composes a function of the same shape, which forwards
 * the child's arguments to the child's function and merges the resolved value with
 * the slot's classes or style. `Slot` never calls it, so it needs to know nothing
 * about the arguments:
 *
 * ```tsx
 * <Sidebar.ItemButton asChild>
 *   <NavLink className={({ isActive }) => (isActive ? "font-medium" : undefined)} to="/endpoints">
 *     Endpoints
 *   </NavLink>
 * </Sidebar.ItemButton>
 * ```
 *
 * A function `children` is forwarded to the child as-is.
 *
 * @see https://mantle.ngrok.com/components/primitives/slot
 *
 * @example
 * ```tsx
 * <Slot className="custom-class">
 *   <a href="/">Home</a>
 * </Slot>
 * ```
 */
const Slot = ({ children, className, "data-slot": dataSlot, ref, style, ...props }: Props) => {
	if (!isValidElement<ComposedChildProps>(children)) {
		return Children.only(children);
	}

	const {
		className: childClassName,
		style: childStyle,
		"data-slot": childDataSlot,
		...childProps
	} = children.props;
	const joinedDataSlot = joinDataSlot(dataSlot, childDataSlot);

	return (
		<SlotPrimitive
			ref={ref}
			{...props}
			className={composeClassName(className, childClassName)}
			style={composeStyle(style, childStyle)}
		>
			{/*
			 * The child is rebuilt without the composed props rather than cloned with
			 * them, because a composed value may be a function. Radix's `mergeProps`
			 * (`@radix-ui/react-slot` 1.3.3) walks the child's own prop keys and rewrites
			 * `className` with `join(" ")` and `style` with an object spread — which
			 * stringifies one function and empties the other — while it forwards a slot
			 * prop the child does not declare untouched. Withholding the props from the
			 * child is what lets a render prop reach the element that calls it, and the
			 * render-prop tests pin that contract against a Radix upgrade.
			 */}
			{createElement(children.type, {
				...childProps,
				// Why only when set: a component child spreads its props after its own
				// `data-slot`, so an explicit `undefined` here erases that slot.
				...(joinedDataSlot != null && { "data-slot": joinedDataSlot }),
				// `cloneElement` preserved the child's key; the rebuild carries it
				// explicitly. `?? undefined` because `createElement` stringifies any
				// non-`undefined` key, which would turn `null` into the key `"null"`.
				key: children.key ?? undefined,
			})}
		</SlotPrimitive>
	);
};

export {
	//,
	Slot,
};
