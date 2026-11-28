import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { tlsCerts } from "./fixtures";
import { ResourceList, ResourceRow } from "./page-parts";

export const handle = { breadcrumb: "TLS Certificates" } satisfies BreadcrumbHandle;

/** The hub's second member, at its own top-level URL. */
export default function TlsCertsList() {
	return (
		<ResourceList label="TLS certificates">
			{tlsCerts.map((cert) => (
				<ResourceRow
					key={cert.id}
					meta={cert.id}
					title={`${cert.description} · expires ${cert.expiresOn}`}
				/>
			))}
		</ResourceList>
	);
}
