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
		return <p className="text-muted text-sm">No secret in this vault has this id.</p>;
	}

	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-strong text-lg font-medium">
				<code translate="no">{secret.name}</code>
			</h2>
			<dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
				<dt className="text-muted">Value</dt>
				<dd className="text-strong">••••••••</dd>
				<dt className="text-muted">Updated</dt>
				<dd className="text-strong">{secret.updatedOn}</dd>
			</dl>
		</div>
	);
}
