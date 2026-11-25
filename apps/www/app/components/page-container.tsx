import { cx } from "@ngrok/mantle/cx";
import type { ComponentProps } from "react";

/**
 * The standard centered page frame under the sticky header: `max-w-7xl`,
 * horizontal padding, top offset, and `flex-1` growth. The max width is the
 * `--page-max-width` property, so a full-width page sets
 * `[--page-max-width:100vw]` and the table of contents knows the frame has
 * no side margin. Shared by
 * `PageLayout`, the root `ErrorBoundary`, and the catch-all 404 route so
 * every top-level page renders inside the same container instead of keeping
 * hand-copied class strings in sync.
 *
 * @example
 * ```tsx
 * <PageContainer>
 *   <ErrorPage status={404} />
 * </PageContainer>
 * ```
 */
export function PageContainer({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cx(
				"mx-auto w-full max-w-(--page-max-width) flex-1 px-4 pt-4 [--page-max-width:var(--container-7xl)] md:pt-20",
				className,
			)}
			{...props}
		/>
	);
}
