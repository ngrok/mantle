/**
 * The class recipes that `Accordion` and the native `Accordion` (`@ngrok/mantle/accordion/native`)
 * share, so the two look the same and a style change reaches both. Each recipe calls `cx` with
 * literal classes, so the build folds the merge (see `scripts/fold-cx.ts`).
 */

import { cx } from "../../utils/cx/cx.js";

/**
 * The root container classes, with the consumer's `className` last.
 *
 * @example
 * <div className={accordionRootClassName("max-w-xl")} />
 */
const accordionRootClassName = (className: string | undefined) =>
	// Why `divide-y` on the root: it draws one border between adjacent items and none after the
	// last. The shared `separator` token colors it, so it matches `Separator`.
	cx("w-full divide-y divide-separator", className);

/**
 * The trigger classes for a `<button>` or a `<summary>`, with the consumer's `className` last.
 *
 * @example
 * <summary className={accordionTriggerClassName(undefined)}>Shipping</summary>
 */
const accordionTriggerClassName = (className: string | undefined) =>
	cx(
		"group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left font-medium outline-none",
		// Why: `display: flex` drops the `<summary>` list marker in Chromium and Firefox, and
		// Safari draws its marker through this pseudo-element.
		"list-none [&::-webkit-details-marker]:hidden",
		// `-mx-2 px-2` gives the focus ring (and tap target) horizontal breathing room
		// without shifting the trigger's content: the negative margin cancels the padding,
		// the same trick the tabs trigger uses. `rounded-md` matches Button/IconButton.
		"-mx-2 rounded-md px-2",
		// Why the padding never changes with the open state: the trigger keeps one size,
		// so its label, its focus ring, and the gap to the content stay still while only
		// the content moves. The body's `pt-1` keeps the `ring-4` focus ring off the body's
		// first line.
		"focus-visible:focus-ring",
		className,
	);

/**
 * The trigger icon classes, with the consumer's `className` last. The icon turns 180° when its
 * section is open: under an open `Accordion.Trigger` (`data-state="open"`), or under the
 * `<summary>` of an open `<details>`.
 *
 * @example
 * <Icon svg={<CaretDownIcon />} className={accordionTriggerIconClassName(undefined)} />
 */
const accordionTriggerIconClassName = (className: string | undefined) =>
	// Why `self-start h-lh w-4`: the svg is one line tall at the top of the
	// trigger, and its default `preserveAspectRatio` centers the 16px glyph in
	// that line. When the label wraps, the icon stays on the first line. When the
	// label is one line, the row is one line tall, so the trigger's `items-center`
	// keeps the icon centered with shorter children, such as a `text-sm` label.
	// Why `[open]>summary` and not `group-open:`: a `<details>` nested in an open one
	// must not turn its own icon.
	cx(
		"h-lh w-4 shrink-0 self-start text-muted transition-transform duration-200 ease-out-strong group-data-state-open:rotate-180 [[open]>summary_&]:rotate-180 motion-reduce:transition-none",
		className,
	);

/**
 * The body classes, with the consumer's `className` last. The `pt-1` is the focus ring's
 * vertical clearance below the trigger.
 *
 * @example
 * <div className={accordionBodyClassName("pb-6")} />
 */
const accordionBodyClassName = (className: string | undefined) => cx("pt-1 pb-4", className);

export {
	//,
	accordionRootClassName,
	accordionTriggerClassName,
	accordionTriggerIconClassName,
	accordionBodyClassName,
};
