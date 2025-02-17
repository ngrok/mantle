import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { Flags } from "./types.js";

const cdnOrigin = "https://assets.ngrok.com";

const sizes = ["s", "m", "l"] as const;
type Size = (typeof sizes)[number];

type Props = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * The country code for the flag to display
	 * @example "US"
	 */
	code: Flags;
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

/**
 * A flag component that displays a flag based on the provided country code.
 * Inspired by [react-flagpack](https://flagpack.xyz/docs/development/react).
 */
function Flag({
	//,
	className,
	code,
	size = "l",
	loading = "lazy",
	...props
}: Props) {
	return (
		<div
			className={cx(
				"flag",
				size === "s" && "w-4 h-3",
				size === "m" && "w-5 h-[0.9375rem]",
				size === "l" && "w-8 h-6",
				className,
			)}
			{...props}
		>
			{/* Depend on the build configs to make the assets available at this location */}
			<img
				className="h-full w-full block object-cover"
				src={`${cdnOrigin}/flags/${size}/${code}.svg`}
				alt={`flag for ${code}`}
				loading={loading}
			/>
		</div>
	);
}

export {
	//,
	Flag,
};

export type {
	//,
	Props as FlagProps,
};
