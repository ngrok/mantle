import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import type { ComponentType, ReactNode } from "react";
// In your app these are the resource query hooks the detail pages already call.
import { useDomain, useEndpoint } from "~/examples/breadcrumbs-from-routes/queries";
import { OriginLink } from "./origin-link";
import type { OriginEntry, OriginKind } from "./origin-trail";

/**
 * One origin crumb's item: a link back to the resource root. It is an
 * `OriginLink`, so stepping back along the trail pops the trail to that
 * entry instead of dropping it. Every kind renders through it, so the
 * trail's items look alike.
 */
function OriginItem({ to, children }: { to: string; children: ReactNode }) {
	return (
		<Breadcrumb.Item>
			<Breadcrumb.Link asChild>
				<OriginLink to={to}>{children}</OriginLink>
			</Breadcrumb.Link>
		</Breadcrumb.Item>
	);
}

/**
 * An endpoint's origin crumb. It calls the endpoint page's own query hook,
 * so a reader who arrives from that page finds the cache warm and sees the
 * URL on the first frame. A cold cache (a reload) shows the skeleton first.
 */
function EndpointOriginCrumb({ id, to }: OriginEntry) {
	const endpointQuery = useEndpoint(id);

	if (endpointQuery.isPending) {
		return <Breadcrumb.Skeleton className="w-40" />;
	}

	return <OriginItem to={to}>{endpointQuery.data?.url ?? id}</OriginItem>;
}

/** A domain's origin crumb: its name once loaded, its id on error. */
function DomainOriginCrumb({ id, to }: OriginEntry) {
	const domainQuery = useDomain(id);

	if (domainQuery.isPending) {
		return <Breadcrumb.Skeleton className="w-32" />;
	}

	return <OriginItem to={to}>{domainQuery.data?.name ?? id}</OriginItem>;
}

/**
 * The crumb component for each kind. The `satisfies` makes a kind without a
 * component a type error, so the trail never meets a reference it cannot
 * render.
 */
const originCrumbs = {
	endpoint: EndpointOriginCrumb,
	domain: DomainOriginCrumb,
} as const satisfies Record<OriginKind, ComponentType<OriginEntry>>;

export {
	//,
	originCrumbs,
};
