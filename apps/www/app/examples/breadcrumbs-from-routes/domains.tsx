import { Anchor } from "@ngrok/mantle/anchor";
import { Link } from "react-router";
import { domains } from "./fixtures";
import { ResourceList, ResourceRow } from "./page-parts";
import { demoPaths } from "./paths";

// No `handle` on purpose: the hub layout already contributes `Domains`, and a
// second one here would read `Domains › Domains`.

/** The hub's first member. */
export default function DomainsList() {
	return (
		<ResourceList label="Domains">
			{domains.map((domain) => (
				<ResourceRow
					key={domain.id}
					meta={domain.id}
					title={
						<Anchor asChild>
							<Link to={demoPaths.domain(domain.id)}>{domain.name}</Link>
						</Anchor>
					}
				/>
			))}
		</ResourceList>
	);
}
