import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Skeleton } from "@ngrok/mantle/skeleton";
import { Outlet, type UIMatch } from "react-router";
import type { Route } from "./+types/vault";
import { demoPaths } from "./paths";
import { useVault } from "./queries";
import { VaultCrumb } from "./vault-crumb";

export const handle = {
	breadcrumb: (match) => [
		// Why the explicit ancestor: this route is a sibling of `vaults`, not a child.
		routeBreadcrumb("Vaults & Secrets", { to: demoPaths.vaults }),
		// the name is not in the URL and no loader fetched it, so the segment
		// renders itself from the query, with a skeleton while pending
		routeBreadcrumb.content(<VaultCrumb vaultId={match.params.vaultId} />),
	],
} satisfies BreadcrumbHandle<UIMatch>;

/**
 * A vault's shell. Its index lists the secrets, and a secret's page renders
 * under the same heading, so the vault is an ancestor of that page and its
 * crumb links back. Reload either page to see the crumb's skeleton on a cold
 * cache.
 */
export default function VaultDetail({ params }: Route.ComponentProps) {
	const vaultQuery = useVault(params.vaultId);

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex flex-col gap-1">
				{vaultQuery.data ? (
					<h1 className="text-strong text-2xl font-medium">{vaultQuery.data.name}</h1>
				) : (
					<Skeleton className="h-8 w-48" />
				)}
				<code translate="no" className="text-muted text-xs">
					{params.vaultId}
				</code>
			</div>
			<Outlet />
		</div>
	);
}
