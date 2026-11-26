import { Anchor } from "@ngrok/mantle/anchor";
import { Link } from "react-router";
import type { Route } from "./+types/vault-secrets";
import { secrets } from "./fixtures";
import { ResourceList, ResourceRow } from "./page-parts";
import { demoPaths } from "./paths";

// No `handle` on purpose: the vault's shell already contributes the vault's
// crumb, and its index is the vault's own page.

/** The vault's index: its secrets, each a link to the secret's page. */
export default function VaultSecrets({ params }: Route.ComponentProps) {
	const vaultSecrets = secrets.filter((secret) => secret.vaultId === params.vaultId);

	return (
		<ResourceList label="Secrets">
			{vaultSecrets.map((secret) => (
				<ResourceRow
					key={secret.id}
					meta={secret.id}
					title={
						<Anchor asChild>
							<Link to={demoPaths.secret(secret.vaultId, secret.id)}>{secret.name}</Link>
						</Anchor>
					}
				/>
			))}
		</ResourceList>
	);
}
