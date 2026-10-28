import { cx } from "@ngrok/mantle/cx";
import type { ComponentProps } from "react";
import { PreviewBadge, ProposalBadge, UnreleasedBadge } from "./badges";
import { HashLinkHeading } from "./hash-link-heading";

type PageHeaderProps = Omit<ComponentProps<"h1">, "id"> & {
	/**
	 * The unique identifier for the heading, used as the anchor target.
	 */
	id: string;
	/**
	 * Whether the component is in preview.
	 */
	isPreview?: boolean;
	/**
	 * Whether the recipe is a proposal, not yet a recommended pattern.
	 */
	isProposal?: boolean;
	/**
	 * Whether the component is unreleased.
	 */
	isUnreleased?: boolean;
};

/**
 * Page header component that renders an h1 with copy-to-clipboard anchor link,
 * optional preview/proposal/unreleased badges.
 *
 * @param props - {@link PageHeaderProps}
 * @param props.id - The unique identifier for the heading, used as the anchor target.
 * @param props.isPreview - Whether the component is in preview. Shows a preview badge.
 * @param props.isProposal - Whether the recipe is a proposal. Shows a proposal badge.
 * @param props.isUnreleased - Whether the component is unreleased. Shows an unreleased badge.
 * @param props.children - The heading text content.
 * @param props.className - Additional CSS classes for the `h1` element.
 */
export function PageHeader({
	children,
	className,
	isPreview,
	isProposal,
	isUnreleased,
	id,
	...props
}: PageHeaderProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 mb-6">
			<HashLinkHeading id={id}>
				<h1 className={cx("text-4xl font-medium sm:text-5xl", className)} {...props}>
					{children}
				</h1>
			</HashLinkHeading>
			{isPreview && <PreviewBadge />}
			{isProposal && <ProposalBadge />}
			{isUnreleased && <UnreleasedBadge />}
		</div>
	);
}
