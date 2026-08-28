import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type LiveRegionProps = ComponentProps<"span"> &
	WithAsChild & {
		/**
		 * How urgently a screen reader announces a changed message: `"polite"`
		 * waits for the current utterance to finish, `"assertive"` interrupts it.
		 * `"polite"` renders `role="status"`; `"assertive"` renders `role="alert"`.
		 *
		 * @default "polite"
		 */
		politeness?: "polite" | "assertive";
	};

/**
 * Announces its text to screen readers when the text changes. Renders a
 * persistent, visually hidden `<span>` live region with `role="status"` and
 * `aria-live="polite"`. When `politeness` is `"assertive"`, it renders
 * `role="alert"` and `aria-live="assertive"`.
 *
 * A live region announces reliably only when it already exists in the
 * accessibility tree before its text changes. Keep `LiveRegion` mounted from
 * first paint and swap only its children. A screen reader does not
 * re-announce a message identical to the previous one; when the same message
 * must repeat, clear the children first. The derived `role` and `aria-live`
 * read as defaults: a `role` or `aria-live` prop wins.
 *
 * **When to use**
 * - Announce a completed client-side navigation: the new page name, after a route change.
 * - Announce an async result that moves focus nowhere: "3 results found", "Draft saved".
 *
 * **When not to use**
 * - For status the user must see. Use {@link https://mantle.ngrok.com/components/feedback/alert Alert} or {@link https://mantle.ngrok.com/components/feedback/toast Toast}, which pair visible UI with their own announcements.
 * - For hidden text that never changes. Use {@link https://mantle.ngrok.com/components/primitives/visually-hidden VisuallyHidden}.
 *
 * **Polymorphism.** Pass `asChild` to render the live region as a different
 * element instead of the default `<span>`.
 *
 * | Data Attribute | Value           | Description                                                               |
 * | -------------- | --------------- | ------------------------------------------------------------------------- |
 * | `data-slot`    | `"live-region"` | Stamped on the rendered element, and joined onto the child via `asChild`. |
 *
 * @see https://mantle.ngrok.com/components/primitives/live-region
 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions
 *
 * @example
 * ```tsx
 * import { LiveRegion } from "@ngrok/mantle/live-region";
 *
 * // Mount the region before the first message, then swap the message.
 * function SearchResults({ results }: { results: string[] }) {
 *   return (
 *     <>
 *       <LiveRegion>{`${results.length} results found`}</LiveRegion>
 *       <ul>
 *         {results.map((result) => (
 *           <li key={result}>{result}</li>
 *         ))}
 *       </ul>
 *     </>
 *   );
 * }
 * ```
 */
const LiveRegion = ({
	asChild,
	className,
	politeness = "polite",
	ref,
	...props
}: LiveRegionProps) => {
	const Comp = asChild ? Slot : "span";
	return (
		<Comp
			ref={ref}
			data-slot="live-region"
			// Why both role and aria-live: some screen reader and browser pairs
			// honor only one of the two, so the region stamps the pair.
			role={politeness === "assertive" ? "alert" : "status"}
			aria-live={politeness}
			aria-atomic="true"
			className={cx("sr-only", className)}
			{...props}
		/>
	);
};

export {
	//,
	LiveRegion,
};
