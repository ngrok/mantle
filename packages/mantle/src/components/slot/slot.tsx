import {
	Children,
	cloneElement,
	type CSSProperties,
	Fragment,
	type HTMLAttributes,
	isValidElement,
	type ReactNode,
	type Ref,
	type RefCallback,
	useCallback,
} from "react";
import type { WithStyleProps } from "../../types/with-style-props.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

/**
 * A `className` or `style` the child resolves itself, from state only the child
 * knows: react-router's `NavLink` calls it with
 * `{ isActive, isPending, isTransitioning }`, another component with something else
 * entirely. `Slot` never invents arguments for one and never inspects them; it
 * forwards the ones the child supplied, so they are typed `unknown`.
 */
type RenderProp<TValue> = (...args: unknown[]) => TValue | undefined;

/** The child props that `Slot` composes in its own way. */
type ComposedChildProps = WithDataSlot & {
	className?: string | RenderProp<string>;
	ref?: Ref<HTMLElement>;
	style?: CSSProperties | RenderProp<CSSProperties>;
	"aria-describedby"?: string;
};

/**
 * `Slot`'s own `className` and `style` stay plain values. A render prop is only
 * meaningful on the child that knows how to call it, so accepting one here would
 * admit a value nothing ever resolves.
 */
type Props = Omit<HTMLAttributes<HTMLElement>, "className" | "style"> &
	WithDataSlot &
	WithStyleProps & {
		children?: ReactNode;
		ref?: Ref<HTMLElement>;
	};

type AnyHandler = (...args: unknown[]) => unknown;

const isHandler = (key: string, value: unknown): value is AnyHandler =>
	/^on[A-Z]/.test(key) && typeof value === "function";

/** Joins two `aria-describedby` id lists, without duplicates. */
const joinIdLists = (first: string | undefined, second: string | undefined): string | undefined => {
	const ids = new Set(`${first ?? ""} ${second ?? ""}`.split(/\s+/).filter(Boolean));
	return ids.size > 0 ? [...ids].join(" ") : undefined;
};

/**
 * Sets a ref of either kind. A React 19 ref callback can return a cleanup; it
 * is returned so the composed callback can run it.
 */
const setRef = <T,>(ref: Ref<T> | undefined, node: T | null): (() => void) | undefined => {
	if (typeof ref === "function") {
		const cleanup = ref(node);
		return typeof cleanup === "function" ? cleanup : undefined;
	}
	if (ref != null) {
		ref.current = node;
	}
	return undefined;
};

/**
 * Composes the slot's ref and the child's ref into one stable callback. It
 * returns a single ref unchanged, so a child with no slot ref keeps its own.
 */
const useComposedRef = (
	slotRef: Ref<HTMLElement> | undefined,
	childRef: Ref<HTMLElement> | undefined,
): Ref<HTMLElement> | undefined => {
	const composed: RefCallback<HTMLElement> = useCallback(
		(node: HTMLElement | null) => {
			const cleanups = [setRef(slotRef, node), setRef(childRef, node)];
			return () => {
				for (const [index, cleanup] of cleanups.entries()) {
					if (cleanup == null) {
						setRef(index === 0 ? slotRef : childRef, null);
					} else {
						cleanup();
					}
				}
			};
		},
		[slotRef, childRef],
	);
	if (slotRef == null || childRef == null) {
		return slotRef ?? childRef;
	}
	return composed;
};

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
 * Composes the slot's `style` with the child's, letting the child win per property,
 * with the same precedence {@link composeClassName} uses. A lone side is returned as-is
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
 * A child that resolves its own `className` or `style` from state only it knows
 * (react-router's `NavLink`, whose `className` may be `({ isActive }) => …`) keeps
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
 * @useWhen Merge the props of a part onto its one child element, to build an `asChild` prop.
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
	// Why "use memo": for a render-prop child, `composeClassName` and `composeStyle` return new
	// functions, and the child may compare them.
	"use memo";
	const child = isValidElement<ComposedChildProps>(children) ? children : null;
	const composedRef = useComposedRef(ref, child?.props.ref);
	if (child == null) {
		return Children.only(children);
	}

	const merged: Record<string, unknown> = { ...props };
	for (const [key, childValue] of Object.entries(child.props)) {
		const slotValue = merged[key];
		// Why child first: the child's own handler sees the event before the part's,
		// and its return value wins.
		if (isHandler(key, childValue) && isHandler(key, slotValue)) {
			merged[key] = (...args: unknown[]) => {
				const result = childValue(...args);
				slotValue(...args);
				return result;
			};
		} else if (!(/^on[A-Z]/.test(key) && childValue == null)) {
			// A child prop wins, even when it is `undefined`; a missing child handler keeps the part's.
			merged[key] = childValue;
		}
	}
	const composed = {
		className: composeClassName(className, child.props.className),
		style: composeStyle(style, child.props.style),
		"aria-describedby": joinIdLists(child.props["aria-describedby"], props["aria-describedby"]),
		"data-slot": joinDataSlot(dataSlot, child.props["data-slot"]),
		ref: child.type === Fragment ? undefined : composedRef,
	};
	// Why only when set: a component child spreads its props after its own
	// defaults, so an explicit `undefined` erases one, such as its `data-slot`.
	for (const [key, value] of Object.entries(composed)) {
		if (value === undefined || value === "") {
			delete merged[key];
		} else {
			merged[key] = value;
		}
	}
	return cloneElement(child, merged);
};

export {
	//,
	Slot,
};
