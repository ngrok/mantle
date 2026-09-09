import type { ComponentProps } from "react";

/**
 * Props for an inline svg icon. The icon owns its `viewBox`, `fill`, and
 * paths, and fills with `currentColor`, so the `color` CSS property sets the
 * fill.
 *
 * @see https://mantle.ngrok.com/components/data-display/icons
 *
 * @example
 * ```tsx
 * function BrandIcon(props: InlineIconProps) {
 * 	return <svg fill="currentColor" viewBox="0 0 24 24" {...props} />;
 * }
 * ```
 */
export type InlineIconProps = Omit<
	ComponentProps<"svg">,
	"xmlns" | "fill" | "viewBox" | "color" | "children"
>;
