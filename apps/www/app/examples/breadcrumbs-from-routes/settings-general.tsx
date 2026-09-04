import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { PageHeader } from "./page-parts";

export const handle = { breadcrumb: "General" } satisfies BreadcrumbHandle;

export default function SettingsGeneral() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="General"
				description="The section crumb comes from a pathless layout, so this page's URL did not change."
			/>
		</div>
	);
}
