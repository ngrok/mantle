import type { ReactNode } from "react";
import type { UIMatch } from "react-router";

/**
 * One crumb a route contributes.
 *
 * @example
 * ```ts
 * const crumb: Crumb = { label: "Endpoints", to: "/endpoints" };
 * ```
 */
type Crumb = {
	/** What the crumb says. */
	label: ReactNode;
	/**
	 * Where it links. When omitted, defaults to the contributing route's own
	 * `pathname`, which is right whenever the crumb *is* that route. Pass `null`
	 * for a crumb that is not a destination — a section prefix whose index URL
	 * only redirects — and the renderer draws it as a non-link `Breadcrumb.Label`
	 * (see the recipe's "The prefix crumb").
	 */
	to?: string | null;
};

/**
 * What a route names itself in the trail: a static string, or a function of the
 * match returning every crumb this route contributes.
 *
 * The function form covers four cases with one shape — a label derived from
 * `params`, a label derived from `loaderData`, a route that has to name an
 * ancestor it is not nested under (see the recipe's "The trail follows nesting"),
 * and a section prefix that is not a destination (see "The prefix crumb").
 *
 * It must resolve **synchronously**: it runs during render, on the server too, so
 * the trail is correct in the initial HTML and never changes after the first
 * paint. Do not reach for a query cache here.
 *
 * @example
 * ```ts
 * const staticLabel: RouteBreadcrumb = "Endpoints";
 * const fromParams: RouteBreadcrumb = (match) => [{ label: match.params.endpointId }];
 * const withAncestor: RouteBreadcrumb = (match) => [
 *   { label: "Endpoints", to: "/endpoints" },
 *   { label: match.params.endpointId },
 * ];
 * const sectionPrefix: RouteBreadcrumb = () => [{ label: "Settings", to: null }];
 * ```
 */
type RouteBreadcrumb = string | ((match: UIMatch) => ReadonlyArray<Crumb>);

/**
 * The `handle` shape a route exports to appear in the trail. Omitting `handle`
 * entirely is the opt-out — no filter list to maintain.
 *
 * @example
 * ```ts
 * // app/routes/endpoints.tsx
 * export const handle = { breadcrumb: "Endpoints" } satisfies BreadcrumbHandle;
 * ```
 */
type BreadcrumbHandle = {
	breadcrumb: RouteBreadcrumb;
};

/**
 * A crumb with its link resolved — what the renderer consumes.
 *
 * @example
 * ```ts
 * const resolved: ResolvedCrumb = { key: "endpoints:0", label: "Endpoints", to: "/endpoints" };
 * ```
 */
type ResolvedCrumb = {
	/** Stable React key. One route may contribute several crumbs, so the match id alone is not unique. */
	key: string;
	label: ReactNode;
	/** Where it links, or `null` for a prefix crumb that is not a destination. */
	to: string | null;
};

/**
 * Whether a route match named itself in the trail.
 *
 * `useMatches()` types `handle` as `unknown`, so this is a real type guard rather
 * than a cast — the narrowing is what lets `buildCrumbs` read `match.handle`
 * without an assertion.
 *
 * @example
 * ```ts
 * useMatches().filter(hasBreadcrumb);
 * ```
 */
function hasBreadcrumb(match: UIMatch): match is UIMatch<unknown, BreadcrumbHandle> {
	const { handle } = match;
	if (handle == null || typeof handle !== "object" || !("breadcrumb" in handle)) {
		return false;
	}
	const { breadcrumb } = handle;
	return typeof breadcrumb === "string" || typeof breadcrumb === "function";
}

/**
 * Derives the breadcrumb trail from a matched route chain.
 *
 * Pure: no hooks, no browser APIs, no clock. It runs identically on the server
 * and the client, which is the whole reason the trail needs no state and no
 * effects — and it means you can assert the trail as a plain value.
 *
 * @example
 * ```ts
 * buildCrumbs(useMatches());
 * // [{ key: "endpoints:0", label: "Endpoints", to: "/endpoints" }, …]
 * ```
 */
function buildCrumbs(matches: ReadonlyArray<UIMatch>): ReadonlyArray<ResolvedCrumb> {
	return matches.filter(hasBreadcrumb).flatMap((match) => {
		const { breadcrumb } = match.handle;
		const crumbs = typeof breadcrumb === "string" ? [{ label: breadcrumb }] : breadcrumb(match);
		return crumbs.map((crumb, index) => ({
			key: `${match.id}:${index}`,
			label: crumb.label,
			// Why `=== undefined` and not `??`: `null` means "not a destination" and
			// must survive resolution; only an omitted `to` defaults to the pathname.
			to: crumb.to === undefined ? match.pathname : crumb.to,
		}));
	});
}

export {
	//,
	buildCrumbs,
	hasBreadcrumb,
};

export type {
	//,
	BreadcrumbHandle,
	Crumb,
	ResolvedCrumb,
	RouteBreadcrumb,
};
