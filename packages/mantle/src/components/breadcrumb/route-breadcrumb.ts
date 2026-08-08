import type { ReactNode } from "react";

/**
 * One crumb a route contributes — a discriminated union on `kind`. Create
 * these with {@link routeBreadcrumb}; the factory stamps the discriminant, so
 * no call site hand-writes one.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#routebreadcrumb
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
			 * whose index URL only redirects — so the renderer draws it as a
			 * non-link `Breadcrumb.Label`.
			 */
			kind: "label";
			/** What the crumb says. */
			label: ReactNode;
	  }
	| {
			/**
			 * A content crumb: a complete rendered trail segment, for labels and
			 * links that only exist in fetched data. The node renders its own
			 * `Breadcrumb.Item`s and `Breadcrumb.Separator`s, and falls back to
			 * `Breadcrumb.Skeleton` while its data loads.
			 */
			kind: "content";
			content: ReactNode;
	  };

/**
 * Creates the crumb a route contributes: a link crumb, whose omitted `to`
 * resolves to the contributing route's own `pathname`. Two members cover the
 * crumbs that are not plain links — `routeBreadcrumb.label` for a section
 * prefix that never links, and `routeBreadcrumb.content` for a trail segment
 * that renders itself from fetched data.
 *
 * There is no page variant on purpose. Page-ness is positional, not declared:
 * the deepest crumb renders as `Breadcrumb.Page`, because the same route's
 * crumb is the current page at its own URL and a link when the trail goes
 * deeper.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#routebreadcrumb
 *
 * @example
 * ```tsx
 * routeBreadcrumb("Endpoints");                       // links to the contributing route's pathname
 * routeBreadcrumb("Endpoints", { to: "/endpoints" }); // links to an explicit path
 * routeBreadcrumb.label("Settings");                  // never links — renders as Breadcrumb.Label
 * routeBreadcrumb.content(<AppTrail appId="app_123" />); // renders its own items from query data
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
		/**
		 * Creates a content crumb — a complete rendered trail segment, for labels
		 * and links that only exist in fetched data. The node decides link vs
		 * current page itself, because the trail builder cannot see inside it.
		 *
		 * @example
		 * ```tsx
		 * const handle = { breadcrumb: () => [routeBreadcrumb.content(<AppTrail appId="app_123" />)] };
		 * ```
		 */
		content: (content: ReactNode): Crumb => ({ kind: "content", content }),
	},
);

/**
 * What a route names itself in the trail: a static string, or a function of
 * the router's match returning every crumb this route contributes.
 *
 * The function form covers the label derived from the match (its params or
 * loader data), the route that names an ancestor it is not nested under, the
 * section prefix that is not a destination, and the query-backed segment that
 * renders its own content.
 *
 * A string or crumb label must resolve **synchronously**: it runs during
 * render, on the server too, so the trail is correct in the initial HTML. A
 * name that only exists in fetched data goes in a content crumb instead.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#routebreadcrumb
 *
 * @example
 * ```ts
 * // TMatch is your router's match type, e.g. react-router's UIMatch.
 * const staticLabel: RouteBreadcrumb<UIMatch> = "Endpoints";
 * const fromParams: RouteBreadcrumb<UIMatch> = (match) => [routeBreadcrumb(match.params.endpointId)];
 * const sectionPrefix: RouteBreadcrumb<UIMatch> = () => [routeBreadcrumb.label("Settings")];
 * ```
 */
type RouteBreadcrumb<TMatch = unknown> = string | ((match: TMatch) => ReadonlyArray<Crumb>);

/**
 * The `handle` shape a route exports to appear in the trail. Omitting `handle`
 * entirely is the opt-out — no filter list to maintain.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#routebreadcrumb
 *
 * @example
 * ```ts
 * // app/routes/endpoints.tsx
 * export const handle = { breadcrumb: "Endpoints" } satisfies BreadcrumbHandle<UIMatch>;
 * ```
 */
type BreadcrumbHandle<TMatch = unknown> = {
	breadcrumb: RouteBreadcrumb<TMatch>;
};

/**
 * The fields {@link buildCrumbs} reads off a route match. Router-agnostic on
 * purpose: react-router's `UIMatch` satisfies it structurally, and so does any
 * object carrying these three fields.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#buildcrumbs
 *
 * @example
 * ```ts
 * const match: BreadcrumbMatch = { id: "endpoints", pathname: "/endpoints", handle: { breadcrumb: "Endpoints" } };
 * ```
 */
type BreadcrumbMatch = {
	/** The route's stable id in the matched chain. */
	id: string;
	/** The URL portion this route matched. */
	pathname: string;
	/** The route module's `handle` export — `unknown` until narrowed. */
	handle: unknown;
};

/**
 * A crumb with its link and React key resolved — what a trail renderer
 * consumes. Link crumbs carry a definite `to`; label crumbs carry none, which
 * is what makes an unlinked link crumb unrepresentable.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#buildcrumbs
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
	  }
	| {
			kind: "content";
			/** Stable React key. One route may contribute several crumbs, so the match id alone is not unique. */
			key: string;
			content: ReactNode;
	  };

/**
 * Whether a route match named itself in the trail. A real type guard, not a
 * cast: routers type `handle` as `unknown`, and the narrowing is what lets
 * {@link buildCrumbs} read `match.handle` without an assertion.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#hasbreadcrumb
 *
 * @example
 * ```ts
 * useMatches().filter(hasBreadcrumb);
 * ```
 */
function hasBreadcrumb<TMatch extends BreadcrumbMatch>(
	match: TMatch,
): match is TMatch & { handle: BreadcrumbHandle<TMatch> } {
	const { handle } = match;
	if (handle == null || typeof handle !== "object" || !("breadcrumb" in handle)) {
		return false;
	}
	const { breadcrumb } = handle;
	return typeof breadcrumb === "string" || typeof breadcrumb === "function";
}

/**
 * Derives the breadcrumb trail from a matched route chain. Matches without a
 * `breadcrumb` handle contribute nothing, so pathless layouts and gate routes
 * stay out of the trail.
 *
 * Pure: no hooks, no browser APIs, no clock. It runs identically on the
 * server and the client, which is the whole reason the trail needs no state
 * and no effects — and it means you can assert the trail as a plain value.
 * Router-agnostic: it reads only {@link BreadcrumbMatch}'s three fields, which
 * react-router's `UIMatch` satisfies structurally.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#buildcrumbs
 *
 * @example
 * ```ts
 * buildCrumbs(useMatches());
 * // [{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "/endpoints" }, …]
 * ```
 */
function buildCrumbs<TMatch extends BreadcrumbMatch>(
	matches: ReadonlyArray<TMatch>,
): ReadonlyArray<ResolvedCrumb> {
	return matches.filter(hasBreadcrumb).flatMap((match) => {
		const { breadcrumb } = match.handle;
		const crumbs =
			typeof breadcrumb === "string" ? [routeBreadcrumb(breadcrumb)] : breadcrumb(match);
		return crumbs.map((crumb, index): ResolvedCrumb => {
			const key = `${match.id}:${index}`;
			if (crumb.kind === "content") {
				return { kind: "content", key, content: crumb.content };
			}
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
	BreadcrumbMatch,
	Crumb,
	ResolvedCrumb,
	RouteBreadcrumb,
};
