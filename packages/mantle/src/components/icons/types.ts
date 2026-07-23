import type { ComponentProps } from "react";

/**
 * Props for an inline svg icon.
 *
 * @see https://mantle.ngrok.com/components/data-display/icons
 *
 * @example
 * ```tsx
 * function BrandIcon(props: InlineIconProps) {
 * 	return <svg {...props} />;
 * }
 * ```
 */
export type InlineIconProps = Omit<
	ComponentProps<"svg">,
	"xmlns" | "fill" | "viewBox" | "color" | "children"
> & {
	/**
	 * The fill color mode of the svg icon.
	 * If set to `"inherit"`, the icon will inherit the color of its parent using `currentColor`
	 * If set to `"auto"`, the icon will use "branded" fill color(s) that are not inherited.
	 * @default "auto"
	 */
	color?: "inherit" | "auto";
};
