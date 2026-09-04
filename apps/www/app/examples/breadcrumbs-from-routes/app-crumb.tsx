import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { useApp } from "./queries";

/**
 * The app's trail segment. It calls the same query hook as the app's page,
 * so the crumb and the page share one cache entry and the crumb adds no
 * request. It is the leaf, so it renders `Breadcrumb.Page` itself: the trail
 * builder cannot see inside a content crumb.
 */
function AppCrumb({ appId }: { appId: string | undefined }) {
	const appQuery = useApp(appId ?? "");

	if (appQuery.isPending) {
		// a stable best-guess width for the name the segment resolves to
		return <Breadcrumb.Skeleton className="w-24" />;
	}

	return (
		<Breadcrumb.Item>
			<Breadcrumb.Page>{appQuery.data?.name ?? appId}</Breadcrumb.Page>
		</Breadcrumb.Item>
	);
}

export {
	//,
	AppCrumb,
};
