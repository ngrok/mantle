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
 * Classes a full-width section layout (e.g. /layouts) passes to `PageLayout`
 * to keep MDX flow content at a readable centered measure while blocks marked
 * `data-full-bleed` (e.g. `CodeExample`) span the whole canvas. Lives here so
 * the long-distance selectors stay next to the `data-mdx-content` element
 * they target.
 *
 * @example
 * ```tsx
 * <PageLayout className={cx("max-w-full", fullWidthProseMeasure)} sidebar={…}>
 * ```
 */
export const fullWidthProseMeasure = [
	"[&_[data-mdx-content]>*]:mx-auto [&_[data-mdx-content]>*]:max-w-3xl",
	"[&_[data-mdx-content]>[data-full-bleed]]:max-w-none",
	// headings keep w-fit on hover-incapable devices (see HashLinkHeading);
	// without a width reset the forced mx-auto centers their shrink-to-fit box
	// within the measure instead of left-aligning them with the prose
	"[&_[data-mdx-content]>:is(h1,h2,h3,h4,h5,h6)]:w-auto",
];

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
					{/* don't overlap the doc actions; data-mdx-content is a stable styling
					hook so section layouts can target the MDX flow children (e.g. the
					prose measure on full-width sections) */}
					<div data-mdx-content className="sm:[&>h1:first-child]:pr-40">
						{children}
					</div>
				</Suspense>
			</MdxProvider>
		</div>
	);
}
