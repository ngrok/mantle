import type { ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";
import { SvgOnly } from "./svg-only.js";
import type { SvgAttributes } from "./types.js";

type IconProps = Omit<SvgAttributes, "children"> & {
	/**
	 * A single SVG icon element.
	 */
	svg: ReactNode;
};

/**
 * Decorates an svg icon with automatic sizing styles and a `shrink-0` class.
 *
 * The icon is decorative by default: it renders `aria-hidden="true"` unless
 * the props or the svg element carry `aria-label`, `aria-labelledby`, `role`,
 * or an explicit `aria-hidden`. Pass `role="img"` and `aria-label` when the
 * icon is the only thing that conveys its meaning.
 *
 * @see https://mantle.ngrok.com/components/data-display/icon
 *
 * @example
 * ```tsx
 * import { ShrimpIcon } from "@phosphor-icons/react/Shrimp";
 *
 * // Decorative: renders aria-hidden="true".
 * <Icon svg={<ShrimpIcon />} />
 *
 * // Meaningful: the name keeps it exposed.
 * <Icon svg={<ShrimpIcon />} role="img" aria-label="Shrimp" />
 * ```
 */
const Icon = ({ className, style, svg, ref, ...props }: IconProps) => (
	<SvgOnly
		ref={ref}
		data-slot="icon"
		className={cx("size-5", className)}
		style={style}
		svg={svg}
		{...props}
	/>
);

export {
	//,
	Icon,
};

export type {
	//,
	IconProps,
};
