import { DescriptionList } from "@ngrok/mantle/description-list";
import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import type { UIMatch } from "react-router";
import type { Route } from "./+types/secret";
import { secrets } from "./fixtures";

export const handle = {
	// the id from the URL, in the HTML on the first byte; the name is the page's heading
	breadcrumb: (match) => [routeBreadcrumb(match.params.secretId)],
} satisfies BreadcrumbHandle<UIMatch>;

/**
 * A secret's page, under the vault's shell. The vault's crumb above it is the
 * query-backed segment: the vault's name is not in this URL, and no loader
 * fetched it.
 */
export default function SecretDetail({ params }: Route.ComponentProps) {
	const secret = secrets.find((candidate) => candidate.id === params.secretId);

	if (secret == null || secret.vaultId !== params.vaultId) {
		return (
			<p className="text-muted text-sm">
				No secret in this vault has this id. Pick one from the vault&apos;s list.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-strong text-lg font-medium">
				<code translate="no">{secret.name}</code>
			</h2>
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Value</DescriptionList.Label>
					<DescriptionList.Value>••••••••</DescriptionList.Value>
				</DescriptionList.Item>
				<DescriptionList.Item>
					<DescriptionList.Label>Updated</DescriptionList.Label>
					<DescriptionList.Value>{secret.updatedOn}</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>
		</div>
	);
}
