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

type NamedSvgProps = SvgAttributes & {
	/**
	 * Phosphor's `alt` prop. `IconBase` renders it as a `<title>` child, so it
	 * names the svg the same way an authored `<title>` does.
	 */
	alt?: string;
};

/**
 * Whether the children include a `<title>`, the SVG's own naming element.
 */
const hasTitleChild = (children: ReactNode) =>
	children != null &&
	Children.toArray(children).some((child) => isValidElement(child) && child.type === "title");

/**
 * Names that make an SVG meaningful to assistive technology. When the props or
 * the svg element carry one, the icon is not decorative.
 */
const hasAccessibleNaming = (props: NamedSvgProps) =>
	props["aria-label"] != null ||
	props["aria-labelledby"] != null ||
	props["aria-hidden"] != null ||
	props.role != null ||
	props.alt != null ||
	hasTitleChild(props.children);

/**
 * Accepts a single SVG icon element and decorates it with `shrink-0` class.
 * You probably want to use the `Icon` component instead.
 *
 * The icon is decorative by default: it renders `aria-hidden="true"` unless
 * the props or the svg element carry a name (`aria-label`, `aria-labelledby`,
 * a `<title>` child, or Phosphor's `alt`), a `role`, or an explicit
 * `aria-hidden`. A bare Phosphor icon sets none of these, so it is hidden from
 * assistive technology.
 *
 * @see https://mantle.ngrok.com/components/data-display/icon
 *
 * @example
 * ```tsx
 * import { ShrimpIcon } from "@phosphor-icons/react/Shrimp";
 *
 * // Decorative: renders aria-hidden="true".
 * <SvgOnly svg={<ShrimpIcon />} />
 *
 * // Meaningful: the name keeps it exposed.
 * <SvgOnly svg={<ShrimpIcon />} role="img" aria-label="Shrimp" />
 * ```
 */
const SvgOnly = ({ className, style, svg, ref, ...props }: SvgOnlyProps) => {
	invariant(
		isValidElement<NamedSvgProps>(svg) && Children.only(svg),
		"SvgOnly must be passed a single SVG icon as a JSX tag.",
	);

	const decorative = !hasAccessibleNaming(props) && !hasAccessibleNaming(svg.props);

	return cloneElement(svg, {
		"data-slot": "svg-only",
		// Why before the spread: an explicit `aria-hidden` in props wins, and a
		// named svg keeps its own attributes because `cloneElement` merges over them.
		...(decorative && { "aria-hidden": true }),
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
