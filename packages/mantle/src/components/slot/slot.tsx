import { Slot as RadixSlot } from "@radix-ui/react-slot";
import { Children, type ComponentProps, cloneElement, isValidElement } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

type Props = ComponentProps<typeof RadixSlot> & WithDataSlot;

/**
 * Merges its props onto its immediate child. This is useful for creating
 * components that can be rendered as different elements. Automatically merges
 * className props using `cx` for proper Tailwind class handling, and
 * concatenates `data-slot` values in DOM order (the composing parent's slot
 * chain first, then the child's own) so `asChild` composition accumulates the
 * whole slot chain instead of one side clobbering the other.
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
const Slot = ({ children, className, "data-slot": dataSlot, ref, ...props }: Props) => {
	if (!isValidElement<{ className?: string } & WithDataSlot>(children)) {
		return Children.only(children);
	}

	return (
		<RadixSlot ref={ref} {...props}>
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
				/**
				 * data-slot concatenates instead: parent chain first, then the child's
				 * own slot, so the rendered attribute reads in DOM order (outermost
				 * ancestor → rendered element) all the way down an asChild chain.
				 */
				"data-slot": joinDataSlot(dataSlot, children.props["data-slot"]),
			})}
		</RadixSlot>
	);
};

export {
	//,
	Slot,
};
