import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { CountryCode } from "./country-code.js";

const cdnOrigin = "https://assets.ngrok.com";

const sizes = ["s", "m", "l"] as const;
type Size = (typeof sizes)[number];

type Props = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * The country code for the flag to display
	 * @example "US"
	 */
	code: CountryCode;
	/**
	 * The size of flag to render, "s", "m", or "l"
	 * @default "l"
	 */
	size?: Size;
	/**
	 * A string providing a hint to the user agent as to how to best schedule the loading of the image to optimize page performance.
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading
	 * @default "lazy"
	 */
	loading?: ComponentProps<"img">["loading"];
};

const borderRadiusVariants = cva("", {
	variants: {
		size: {
			s: "rounded-[0.0625rem]",
			m: "rounded-[0.09375rem]",
			l: "rounded-xs",
		} as const satisfies Record<Size, string>,
	},
});

const sizingVariants = cva("", {
	variants: {
		size: {
			s: "w-4 h-3",
			m: "w-5 h-3.75",
			l: "w-8 h-6",
		} as const satisfies Record<Size, string>,
	},
});

/**
 * A flag component that displays a flag based on the provided country code.
 * Inspired by [react-flagpack](https://flagpack.xyz/docs/development/react).
 *
 * @see https://mantle.ngrok.com/components/flag#flag
 *
 * @example
 * ```tsx
 * <Flag code="US" />
 * <Flag code="JP" size="m" loading="eager" />
 * <Flag code="CA" size="s" loading="lazy" />
 * <Flag code="GB" size="l" />
 * ```
 */
function Flag({
	//,
	className,
	code,
	size = "l",
	loading = "lazy",
	...props
}: Props) {
	const borderRadius = borderRadiusVariants({ size });
	const sizing = sizingVariants({ size });

	return (
		<div
			data-slot="flag"
			className={cx("flag relative overflow-hidden", borderRadius, sizing, className)}
			{...props}
		>
			<div aria-hidden className={cx("absolute inset-0 border border-[#000]/10", borderRadius)} />
			<img
				className="h-full w-full block object-cover"
				src={`${cdnOrigin}/flags/${size}/${code}.svg`}
				alt={`flag for ${code}`}
				loading={loading}
			/>
		</div>
	);
}
Flag.displayName = "Flag";

export {
	//,
	Flag,
};

export type {
	//,
	Props as FlagProps,
};
