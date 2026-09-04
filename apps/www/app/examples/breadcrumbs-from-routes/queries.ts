import { queryOptions, useQuery } from "@tanstack/react-query";
import { apps, domains, endpoints } from "./fixtures";

/**
 * How long a demo "fetch" takes. Long enough to see a skeleton on a cold
 * cache, short enough that a warm cache is visibly instant next to it.
 */
const DEMO_LATENCY_MS = 600;

/** Resolves `value` after the demo's simulated network delay. */
function simulateFetch<T>(value: T): Promise<T> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(value), DEMO_LATENCY_MS);
	});
}

/**
 * The query for one endpoint. Exported as options, not only as a hook, so a
 * test can seed the cache (`queryClient.setQueryData(endpointQueryOptions(id).queryKey, …)`).
 */
function endpointQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["breadcrumbs-demo", "endpoint", id],
		queryFn: () => simulateFetch(endpoints.find((endpoint) => endpoint.id === id) ?? null),
		// Why Infinity: a resolved record never refetches, so a page that was
		// open a moment ago keeps its cache warm for the crumb that names it.
		staleTime: Infinity,
	});
}

/** The query for one domain; see {@link endpointQueryOptions}. */
function domainQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["breadcrumbs-demo", "domain", id],
		queryFn: () => simulateFetch(domains.find((domain) => domain.id === id) ?? null),
		staleTime: Infinity,
	});
}

/** The query for one app; see {@link endpointQueryOptions}. */
function appQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["breadcrumbs-demo", "app", id],
		queryFn: () => simulateFetch(apps.find((app) => app.id === id) ?? null),
		staleTime: Infinity,
	});
}

/**
 * One endpoint by id. The detail page and the endpoint's origin crumb both
 * call it, so they share one cache entry.
 *
 * @example
 * ```ts
 * const endpointQuery = useEndpoint("ep_3Exgo");
 * endpointQuery.data?.url; // "https://forward-labels.test" once loaded
 * ```
 */
function useEndpoint(id: string) {
	return useQuery(endpointQueryOptions(id));
}

/**
 * One domain by id; see {@link useEndpoint}.
 *
 * @example
 * ```ts
 * useDomain("rd_2Kq9a").data?.name; // "forward-labels.test" once loaded
 * ```
 */
function useDomain(id: string) {
	return useQuery(domainQueryOptions(id));
}

/**
 * One app by id; see {@link useEndpoint}.
 *
 * @example
 * ```ts
 * useApp("app_123").data?.name; // "my-app" once loaded
 * ```
 */
function useApp(id: string) {
	return useQuery(appQueryOptions(id));
}

export {
	//,
	appQueryOptions,
	DEMO_LATENCY_MS,
	domainQueryOptions,
	endpointQueryOptions,
	useApp,
	useDomain,
	useEndpoint,
};
