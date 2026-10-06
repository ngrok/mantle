import { Anchor } from "@ngrok/mantle/anchor";
import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { Link } from "react-router";
import { vaults } from "./fixtures";
import { PageHeader, ResourceList, ResourceRow } from "./page-parts";
import { demoPaths } from "./paths";

export const handle = { breadcrumb: "Vaults & Secrets" } satisfies BreadcrumbHandle;

export default function VaultsList() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Vaults & Secrets"
				description="A vault's name exists only in fetched data, so its crumb is query-backed and shows a skeleton first."
			/>
			<ResourceList label="Vaults">
				{vaults.map((vault) => (
					<ResourceRow
						key={vault.id}
						meta={vault.id}
						title={
							<Anchor asChild>
								<Link to={demoPaths.vault(vault.id)}>{vault.name}</Link>
							</Anchor>
						}
					/>
				))}
			</ResourceList>
		</div>
	);
}
