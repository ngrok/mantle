import { type ComponentProps, type ComponentRef, forwardRef } from "react";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type Props = Exclude<ComponentProps<"div">, "children"> & SelfClosingWithAsChild;

/**
 * A skeleton is a placeholder for content that is loading.
 * By using a skeleton, you can give the user an idea of what the content will
 * look like and reduce the perceived loading time and CLS (Cumulative Layout Shift).
 *
 * @note Default height is 1rem.
 *
 * @see https://mantle.ngrok.com/components/skeleton
 *
 * @example
 * ```tsx
 * <Skeleton className="w-1/2" />
 *
 * <Skeleton className="w-1/2" />
 *
 * <Skeleton className="h-12 w-12 rounded-full" />
 * ```
 */
const Skeleton = forwardRef<ComponentRef<"div">, Props>(
	({ asChild = false, className, ...props }, ref) => {
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
	},
);
Skeleton.displayName = "Skeleton";

export {
	//,
	Skeleton,
};
