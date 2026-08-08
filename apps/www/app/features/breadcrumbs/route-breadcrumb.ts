import type { ReactNode } from "react";
import type { UIMatch } from "react-router";

/**
 * One crumb a route contributes — a discriminated union on `kind`. Create these
 * with {@link routeBreadcrumb}; the factory stamps the discriminant, so no call
 * site hand-writes one.
 *
 * @example
 * ```ts
 * const link: Crumb = routeBreadcrumb("Endpoints", { to: "/endpoints" });
 * const prefix: Crumb = routeBreadcrumb.label("Settings");
 * ```
 */
type Crumb =
	| {
			kind: "link";
			/** What the crumb says. */
			label: ReactNode;
			/**
			 * Where it links. When omitted, resolves to the contributing route's own
			 * `pathname`, which is right whenever the crumb *is* that route.
			 */
			to?: string;
	  }
	| {
			/**
			 * A prefix crumb: it names a level with no page of its own — a section
			 * whose index URL only redirects — so the renderer draws it as a non-link
			 * `Breadcrumb.Label` (see the recipe's "The prefix crumb").
			 */
			kind: "label";
			/** What the crumb says. */
			label: ReactNode;
	  };

/**
 * Creates the crumb a route contributes: a link crumb, whose omitted `to`
 * resolves to the contributing route's own `pathname`. `routeBreadcrumb.label`
 * creates the prefix crumb instead — one that never links, for a section whose
 * index URL only redirects.
 *
 * There is no page variant on purpose. Page-ness is positional, not declared:
 * the deepest crumb renders as `Breadcrumb.Page`, because the same route's
 * crumb is the current page at its own URL and a link when the trail goes
 * deeper.
 *
 * @example
 * ```ts
 * routeBreadcrumb("Endpoints");                       // links to the contributing route's pathname
 * routeBreadcrumb("Endpoints", { to: "/endpoints" }); // links to an explicit path
 * routeBreadcrumb.label("Settings");                  // never links — renders as Breadcrumb.Label
 * ```
 */
const routeBreadcrumb = Object.assign(
	(label: ReactNode, options: { to?: string } = {}): Crumb => ({
		kind: "link",
		label,
		...options,
	}),
	{
		/**
		 * Creates a prefix crumb — one that never links. The renderer draws it as
		 * a non-link `Breadcrumb.Label`.
		 *
		 * @example
		 * ```ts
		 * const handle = { breadcrumb: () => [routeBreadcrumb.label("Settings")] };
		 * ```
		 */
		label: (label: ReactNode): Crumb => ({ kind: "label", label }),
	},
);

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
 * const fromParams: RouteBreadcrumb = (match) => [routeBreadcrumb(match.params.endpointId)];
 * const withAncestor: RouteBreadcrumb = (match) => [
 *   routeBreadcrumb("Endpoints", { to: "/endpoints" }),
 *   routeBreadcrumb(match.params.endpointId),
 * ];
 * const sectionPrefix: RouteBreadcrumb = () => [routeBreadcrumb.label("Settings")];
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
 * A crumb with its link resolved — what the renderer consumes. Link crumbs
 * carry a definite `to`; label crumbs carry none, which is what makes an
 * unlinked link crumb unrepresentable.
 *
 * @example
 * ```ts
 * const resolved: ResolvedCrumb = { kind: "link", key: "endpoints:0", label: "Endpoints", to: "/endpoints" };
 * ```
 */
type ResolvedCrumb =
	| {
			kind: "link";
			/** Stable React key. One route may contribute several crumbs, so the match id alone is not unique. */
			key: string;
			label: ReactNode;
			to: string;
	  }
	| {
			kind: "label";
			/** Stable React key. One route may contribute several crumbs, so the match id alone is not unique. */
			key: string;
			label: ReactNode;
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
 * // [{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "/endpoints" }, …]
 * ```
 */
function buildCrumbs(matches: ReadonlyArray<UIMatch>): ReadonlyArray<ResolvedCrumb> {
	return matches.filter(hasBreadcrumb).flatMap((match) => {
		const { breadcrumb } = match.handle;
		const crumbs =
			typeof breadcrumb === "string" ? [routeBreadcrumb(breadcrumb)] : breadcrumb(match);
		return crumbs.map((crumb, index): ResolvedCrumb => {
			const key = `${match.id}:${index}`;
			if (crumb.kind === "label") {
				return { kind: "label", key, label: crumb.label };
			}
			return { kind: "link", key, label: crumb.label, to: crumb.to ?? match.pathname };
		});
	});
}

export {
	//,
	buildCrumbs,
	hasBreadcrumb,
	routeBreadcrumb,
};

export type {
	//,
	BreadcrumbHandle,
	Crumb,
	ResolvedCrumb,
	RouteBreadcrumb,
};
