import type { BreadcrumbHandle } from "@ngrok/mantle/breadcrumb";
import { routeBreadcrumb } from "@ngrok/mantle/breadcrumb";
import { Skeleton } from "@ngrok/mantle/skeleton";
import type { UIMatch } from "react-router";
import type { Route } from "./+types/app";
import { AppCrumb } from "./app-crumb";
import { demoPaths } from "./paths";
import { useApp } from "./queries";

export const handle = {
	breadcrumb: (match) => [
		routeBreadcrumb("Apps", { to: demoPaths.apps }),
		// the name is not in the URL and no loader fetched it, so the segment
		// renders itself from the query, with a skeleton while pending
		routeBreadcrumb.content(<AppCrumb appId={match.params.appId} />),
	],
} satisfies BreadcrumbHandle<UIMatch>;

/** An app's page. Reload it to see the crumb's skeleton on a cold cache. */
export default function AppDetail({ params }: Route.ComponentProps) {
	const appQuery = useApp(params.appId);

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex flex-col gap-1">
				{appQuery.data ? (
					<h1 className="text-strong text-2xl font-medium">{appQuery.data.name}</h1>
				) : (
					<Skeleton className="h-8 w-48" />
				)}
				<code translate="no" className="text-muted text-xs">
					{params.appId}
				</code>
			</div>
			<p className="text-muted text-sm">
				The crumb and this heading read one cache entry. Neither adds a request.
			</p>
		</div>
	);
}
