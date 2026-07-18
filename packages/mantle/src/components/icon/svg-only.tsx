import type { ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import type { SvgAttributes } from "./types.js";

type SvgOnlyProps = Omit<SvgAttributes, "children"> & {
	/**
	 * A single SVG icon element.
	 */
	svg: ReactNode;
};

/**
 * Accepts a single SVG icon element and decorates it with `shrink-0` class.
 * You probably want to use the `Icon` component instead.
 *
 * @see https://mantle.ngrok.com/components/data-display/icon
 *
 * @example
 * ```tsx
 * import { ShrimpIcon } from "@phosphor-icons/react/Shrimp";
 *
 * <SvgOnly svg={<ShrimpIcon />} />
 * ```
 */
const SvgOnly = ({ className, style, svg, ref, ...props }: SvgOnlyProps) => {
	invariant(
		isValidElement<SvgAttributes>(svg) && Children.only(svg),
		"SvgOnly must be passed a single SVG icon as a JSX tag.",
	);

	return cloneElement(svg, {
		"data-slot": "svg-only",
		...props,
		className: cx(
			"shrink-0", // the SvgOnly base classes
			className, // the SvgOnly className
			svg.props.className, // the svg className
		),
		style: { ...style, ...svg.props.style },
		ref,
	});
};

export {
	//,
	SvgOnly,
};

export type {
	//,
	SvgOnlyProps,
};
