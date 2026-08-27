import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

/**
 * Content for assistive technology only. Renders a native `<span>` clipped to
 * a one-pixel box (the `sr-only` technique, never `display: none`), so screen
 * readers read the content and sighted users never see it.
 *
 * **When to use**
 * - State context the visual design already carries: "(opens in a new tab)" on an external link, a caption on a layout table.
 * - Give a screen reader a text alternative for content it cannot read, such as a decorative chart.
 * - Style the message of a {@link https://mantle.ngrok.com/components/primitives/live-region LiveRegion}, which builds on the same technique.
 *
 * **When not to use**
 * - To name an icon-only control. Voice-control software skips a control whose only label is hidden DOM text, so use `aria-label`, as {@link https://mantle.ngrok.com/components/actions/icon-button IconButton}'s required `label` prop does.
 * - To hide content from assistive technology too. Use the `hidden` attribute or `aria-hidden`.
 * - For a link that appears on focus. Use {@link https://mantle.ngrok.com/components/primitives/skip-to-main-link SkipToMainLink}.
 *
 * **Polymorphism.** Pass `asChild` to hide a more semantic element instead of
 * the default `<span>` (a `<caption>`, a `<legend>`, a heading).
 *
 * @see https://mantle.ngrok.com/components/primitives/visually-hidden
 * @see https://webaim.org/techniques/css/invisiblecontent/
 *
 * @example
 * ```tsx
 * import { VisuallyHidden } from "@ngrok/mantle/visually-hidden";
 *
 * <a href="https://status.ngrok.com" target="_blank" rel="noreferrer">
 *   ngrok status
 *   <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
 * </a>
 * ```
 */
const VisuallyHidden = ({
	asChild,
	className,
	ref,
	...props
}: ComponentProps<"span"> & WithAsChild) => {
	const Comp = asChild ? Slot : "span";
	return (
		<Comp ref={ref} data-slot="visually-hidden" className={cx("sr-only", className)} {...props} />
	);
};

export {
	//,
	VisuallyHidden,
};
