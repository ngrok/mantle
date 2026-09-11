import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { PageHeader } from "./page-parts";

export const handle = { breadcrumb: "Team Members" } satisfies BreadcrumbHandle;

export default function TeamMembers() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Team Members"
				description="Another section, another pathless layout: Identity & Access."
			/>
		</div>
	);
}
