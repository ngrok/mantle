import type { ComponentProps } from "react";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type Props = Exclude<ComponentProps<"div">, "children"> & SelfClosingWithAsChild;

/**
 * A skeleton is a placeholder for content that is loading. By rendering a
 * neutral block where real content will eventually appear, you give the
 * user an early sense of layout and reduce both perceived loading time
 * and Cumulative Layout Shift (CLS).
 *
 * **When to use**
 * - Async-loaded content where the eventual shape is predictable (lists,
 *   cards, tables, avatars).
 * - On initial page load, before data has resolved.
 *
 * **When not to use**
 * - For very short fetches (< 200 ms) — a flash of skeleton is more
 *   distracting than helpful.
 * - To convey error or empty states. Use {@link https://mantle.ngrok.com/components/feedback/empty Empty} instead.
 * - As a permanent decorative shape.
 *
 * **Sizing.** Default height is `1rem`. Override `className` with `h-*`,
 * `w-*`, and `rounded-*` utilities to match the real content's dimensions
 * — the more closely the skeleton matches, the less layout shift on swap.
 *
 * **Accessibility.** Skeletons are decorative and convey no semantic
 * meaning to assistive tech. If the underlying region is loading, also
 * announce it to screen readers — e.g. wrap in an element with
 * `role="status"` and a visually-hidden "Loading…" label.
 *
 * @see https://mantle.ngrok.com/components/feedback/skeleton
 *
 * @example
 * ```tsx
 * import { Skeleton } from "@ngrok/mantle/skeleton";
 *
 * // Text-line placeholder.
 * <Skeleton className="w-1/2" />
 *
 * // Avatar placeholder.
 * <Skeleton className="h-12 w-12 rounded-full" />
 *
 * // Announce loading state to assistive tech.
 * <div role="status" aria-live="polite">
 *   <span className="sr-only">Loading profile…</span>
 *   <Skeleton className="h-12 w-12 rounded-full" />
 * </div>
 * ```
 */
const Skeleton = ({ asChild = false, className, ref, ...props }: Props) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot="skeleton"
			className={cx(
				"dark-high-contrast:bg-black/30 high-contrast:bg-black/30 h-4 animate-pulse rounded-md bg-gray-300/25 dark:bg-gray-950/10",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
};

export {
	//,
	Skeleton,
};
