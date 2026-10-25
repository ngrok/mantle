import type { ComponentProps, PropsWithChildren } from "react";

import { cx } from "@ngrok/mantle/cx";

/**
 * Container for a row of color swatches. Renders children in a horizontal strip.
 */
function Palette({ children, className, ...rest }: ComponentProps<"div">) {
	return (
		<div
			className={cx("mt-2 flex flex-col gap-2 overflow-hidden text-xs md:flex-row", className)}
			{...rest}
		>
			{children}
		</div>
	);
}

type SwatchProps = PropsWithChildren<ComponentProps<"div">>;

/**
 * A single color swatch that renders a colored rectangle with a label beneath it.
 * Pass a Tailwind bg class via `className` and the shade label as `children`.
 *
 * @example
 * <Swatch className="bg-neutral-950">950</Swatch>
 */
function Swatch({ children, className, ...rest }: SwatchProps) {
	return (
		<div className="flex grow flex-col gap-1 font-mono" {...rest}>
			<div className={cx("h-10 w-full rounded", className)} />
			{children}
		</div>
	);
}

export {
	//,
	Palette,
	Swatch,
};
