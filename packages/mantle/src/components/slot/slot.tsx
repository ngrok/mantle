import { Slot as RadixSlot } from "@radix-ui/react-slot";
import { Children, type ComponentProps, cloneElement, forwardRef, isValidElement } from "react";
import { cx } from "../../utils/cx/cx.js";

type Props = ComponentProps<typeof RadixSlot>;

/**
 * Merges its props onto its immediate child. This is useful for creating
 * components that can be rendered as different elements. Automatically merges
 * className props using `cx` for proper Tailwind class handling.
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
const Slot = forwardRef<HTMLElement, Props>(function Slot(
	{ children, className, ...props },
	forwardedRef,
) {
	if (!isValidElement<{ className?: string }>(children)) {
		return Children.only(children);
	}

	return (
		<RadixSlot ref={forwardedRef} {...props}>
			{cloneElement(children, {
				...children.props,
				/**
				 * ClassName merge precedence (highest → lowest):
				 *
				 * 1. Child element’s own `className`   ← most specific / closest to the DOM
				 * 2. Slot’s `className`                ← passed from the parent component
				 * 3. Component’s internal base styles  ← applied earlier inside the component
				 *
				 * We intentionally merge in this order so the child can fully override
				 * parent + base styles when using `asChild`, preserving the “most specific wins”
				 * behavior while still letting the component define sensible defaults.
				 */
				className: cx(className, children.props.className),
			})}
		</RadixSlot>
	);
});

export {
	//,
	Slot,
};
