import { cx } from "@ngrok/mantle/cx";
import type { ComponentProps } from "react";

/**
 * The standard centered page frame under the sticky header: 96rem (`--breakpoint-2xl`) wide at most,
 * horizontal padding, top offset, and `flex-1` growth. Shared by
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
			className={cx("mx-auto w-full max-w-(--breakpoint-2xl) flex-1 px-4 pt-4 md:pt-20", className)}
			{...props}
		/>
	);
}
