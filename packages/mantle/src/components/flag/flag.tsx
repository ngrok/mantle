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
 * Renders a country flag from an [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
 * country code, served as an SVG from ngrok's CDN. Inspired by
 * [react-flagpack](https://flagpack.xyz/docs/development/react).
 *
 * **When to use**
 * - Showing the country associated with a region, IP, billing address, or locale.
 * - Inside a select option, list row, or status pill that needs a quick visual cue.
 *
 * **When not to use**
 * - As a stand-in for language. Flags ≠ languages — Brazilian Portuguese is
 *   not "Portugal", Spanish is not just "Spain". Use a language label instead.
 * - As decoration where the country isn't meaningful to the user.
 *
 * **Sizing.** `"s"` (16×12), `"m"` (20×15), and `"l"` (32×24, default) match
 * common inline, list, and table contexts. Pick the size that matches its
 * neighbors so the flag doesn't dominate or disappear.
 *
 * **Accessibility.** The underlying `<img>` is given `alt="flag for {code}"`.
 * If the country is decorative or already labeled in adjacent text, consider
 * passing `aria-hidden` via the wrapper `<div>` to avoid duplicate
 * announcements.
 *
 * **Loading.** Defaults to `loading="lazy"`. Use `loading="eager"` for flags
 * above the fold or in critical content.
 *
 * @see https://mantle.ngrok.com/components/data-display/flag
 *
 * @example
 * ```tsx
 * import { Flag } from "@ngrok/mantle/flag";
 *
 * <Flag code="US" />
 * <Flag code="JP" size="m" loading="eager" />
 * <Flag code="CA" size="s" />
 *
 * // Inline next to a country label.
 * <span className="inline-flex items-center gap-2">
 *   <Flag code="GB" size="s" aria-hidden />
 *   <span>United Kingdom</span>
 * </span>
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

export {
	//,
	Flag,
};

export type {
	//,
	Props as FlagProps,
};
