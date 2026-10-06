import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Link, useParams } from "react-router";
import { demoPaths } from "./paths";
import { useVault } from "./queries";

/**
 * The vault's trail segment. It calls the same query hook as the vault's
 * shell, so the crumb and the heading share one cache entry and the crumb
 * adds no request. The segment owns link vs current page, because the trail
 * builder cannot see inside a content crumb: on the vault's own page it is
 * the leaf, and on a secret's page it links back to the vault.
 */
function VaultCrumb({ vaultId }: { vaultId: string | undefined }) {
	const vaultQuery = useVault(vaultId ?? "");
	// a secret's page is the only route below the vault, so its param says
	// whether the vault is the current page or an ancestor
	const { secretId } = useParams();

	if (vaultQuery.isPending) {
		// a stable best-guess width for the name the segment resolves to
		return <Breadcrumb.Skeleton className="w-24" />;
	}

	const label = vaultQuery.data?.name ?? vaultId;

	if (secretId == null || vaultId == null) {
		return (
			<Breadcrumb.Item>
				<Breadcrumb.Page>{label}</Breadcrumb.Page>
			</Breadcrumb.Item>
		);
	}

	return (
		<Breadcrumb.Item>
			<Breadcrumb.Link asChild>
				<Link to={demoPaths.vault(vaultId)}>{label}</Link>
			</Breadcrumb.Link>
		</Breadcrumb.Item>
	);
}

export {
	//,
	VaultCrumb,
};
