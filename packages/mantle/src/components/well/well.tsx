import type { ComponentProps, ComponentRef } from "react";
import { forwardRef } from "react";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type WellProps = ComponentProps<"div"> & WithAsChild;

/**
 * A recessed, inset container used to visually group and de-emphasize content
 * relative to the surrounding surface, such as code samples, supplementary
 * notes, or read-only summaries.
 *
 * Renders a `<div>` by default. Pass `asChild` to render as a different element
 * or your own component, forwarding all class names, `data-*` attributes, and
 * the ref onto that child.
 *
 * @see https://mantle.ngrok.com/components/structure/well
 *
 * @example
 * ```tsx
 * <Well>
 *   <p>Eu ad sint laborum nostrud ullamco esse.</p>
 * </Well>
 * ```
 *
 * @example
 * ```tsx
 * <Well asChild>
 *   <section aria-label="Summary">…</section>
 * </Well>
 * ```
 */
const Well = forwardRef<ComponentRef<"div">, WellProps>(
	({ asChild = false, className, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";

		return (
			<Comp
				ref={ref}
				data-slot="well"
				className={cx(
					"border-card-muted bg-base relative rounded-md border shadow-inner",
					className,
				)}
				{...props}
			/>
		);
	},
);
Well.displayName = "Well";

export {
	//,
	Well,
};
