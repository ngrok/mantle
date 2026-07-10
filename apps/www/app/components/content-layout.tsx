import type { ReactNode } from "react";
import { Suspense } from "react";
import { DocActions } from "~/components/doc-actions";
import { MdxProvider } from "~/components/mdx-provider";

type ContentLayoutProps = {
	/**
	 * The MDX content to render inside the layout. Wrapped in MdxProvider
	 * and Suspense automatically.
	 */
	children: ReactNode;
	/**
	 * Override the markdown URL derived from the current pathname.
	 * Passed directly to DocActions.
	 */
	markdownPath?: string;
};

/**
 * Shared layout for doc pages. Provides the doc actions button,
 * MdxProvider context, and Suspense boundary.
 */
export function ContentLayout({ children, markdownPath }: ContentLayoutProps) {
	return (
		<div className="relative">
			<div className="mb-4 sm:absolute sm:right-0 sm:top-0 sm:z-10 sm:mb-0">
				<DocActions markdownPath={markdownPath} />
			</div>
			<MdxProvider>
				<Suspense fallback={null}>
					{/* don't overlap the doc actions */}
					<div className="sm:[&>h1:first-child]:pr-40">{children}</div>
				</Suspense>
			</MdxProvider>
		</div>
	);
}
