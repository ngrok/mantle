import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Outlet } from "react-router";
import { PageHeader } from "./page-parts";
import { demoPaths } from "./paths";
import { RouteTabs } from "./route-tabs";

export const handle = {
	// Why the explicit `to`: a pathless layout's own `match.pathname` is its
	// parent's, so a link crumb here has to say where the hub lives.
	breadcrumb: () => [routeBreadcrumb("Domains", { to: demoPaths.domains })],
} satisfies BreadcrumbHandle;

/**
 * The Domains hub: shared chrome over two URL siblings, `/domains` and
 * `/tls-certs`. React Router rejects an absolute child path outside its
 * parent's, so the siblings cannot nest; a pathless layout is the only way
 * they share a header. It stays mounted across a tab switch, which is what
 * keeps focus on the clicked tab.
 *
 * A full-page detail under a member must not inherit this header. Register
 * it as a sibling of the hub (`domain.tsx` is), not as a child of a member.
 */
export default function DomainsHub() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Domains"
				description="One header over two top-level URLs. The trail on the second tab reads Domains › TLS Certificates."
			/>
			<RouteTabs
				aria-label="Domains sections"
				tabs={[
					{ value: "domains", label: "Domains", to: demoPaths.domains },
					{ value: "tls-certs", label: "TLS Certificates", to: demoPaths.tlsCerts },
				]}
			/>
			<Outlet />
		</div>
	);
}
