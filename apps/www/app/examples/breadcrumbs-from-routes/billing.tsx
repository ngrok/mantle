import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { PageHeader } from "./page-parts";

export const handle = { breadcrumb: "Billing" } satisfies BreadcrumbHandle;

export default function Billing() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Billing"
				description="A top-level URL in the Account section. The route tree, not the URL, decides the trail."
			/>
		</div>
	);
}
