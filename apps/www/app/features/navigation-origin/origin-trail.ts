import type { BreadcrumbMatch, ResolvedCrumb } from "@ngrok/mantle/breadcrumb";
import { buildCrumbs } from "@ngrok/mantle/breadcrumb";
import { z } from "zod";

/**
 * The resource kinds a route can identify itself as. Add a kind here and give
 * it a crumb component in `origin-labels.tsx`; the `satisfies` there turns a
 * missing one into a type error.
 */
const originKinds = ["endpoint", "domain"] as const;

type OriginKind = (typeof originKinds)[number];

/** What a route says it is. {@link findSelfOrigin} adds the location. */
type OriginIdentity = {
	kind: OriginKind;
	id: string;
};

/**
 * A static crumb above an origin page: a section name and, for a link crumb,
 * where it goes. Only the oldest entry's ancestors render, as the root of the
 * stack.
 */
type OriginAncestor = {
	label: string;
	to?: string | undefined;
};

/**
 * One step of the origin trail: a resource reference, never a label. The
 * label resolves at render time from the reference, the way a content crumb
 * does, so a renamed resource never shows a stale name. The ancestors are the
 * static crumbs above the page when it was pushed, so the root of the stack
 * keeps its section; a content crumb or a non-string label is not
 * serializable, so it is left out.
 */
type OriginEntry = OriginIdentity & {
	/** The resource root, which is where the crumb links back to. */
	to: string;
	ancestors: ReadonlyArray<OriginAncestor>;
};

const originAncestorSchema = z.object({
	label: z.string(),
	to: z.string().startsWith("/").optional(),
});

const originEntrySchema = z.object({
	kind: z.enum(originKinds),
	id: z.string().min(1),
	to: z.string().startsWith("/"),
	// Why default: an entry a previous build wrote without ancestors still renders
	ancestors: z.array(originAncestorSchema).default([]),
});

/**
 * How many resources the trail keeps. Three covers every pair of resources
 * that link each other today, with one hop of room between them.
 */
const MAX_ORIGIN_DEPTH = 3;

/**
 * Reads the origin trail out of `location.state`. Anything that is not a
 * well-formed entry is dropped: a stale tab, a hand-written state object, or
 * a kind this build no longer knows must not crash the header.
 *
 * @example
 * ```ts
 * readOriginTrail(useLocation().state);
 * // [{ kind: "endpoint", id: "ep_1", to: "/endpoints/ep_1", ancestors: [{ label: "Endpoints", to: "/endpoints" }] }]
 * ```
 */
function readOriginTrail(state: unknown): ReadonlyArray<OriginEntry> {
	if (state == null || typeof state !== "object" || !("origin" in state)) {
		return [];
	}
	if (!Array.isArray(state.origin)) {
		return [];
	}
	const candidates: ReadonlyArray<unknown> = state.origin;
	return candidates.flatMap((candidate) => {
		const result = originEntrySchema.safeParse(candidate);
		return result.success ? [result.data] : [];
	});
}

/**
 * The trail the target page receives when the reader follows a link from the
 * current page. A target already in the trail pops the trail back to before
 * it, so going back and forth between two pages never grows it. A page with
 * no identity passes the trail through unchanged.
 *
 * @example
 * ```ts
 * pushOrigin([], endpoint, "/domains/rd_1"); // [endpoint]
 * pushOrigin([endpoint], domain, "/endpoints/ep_1"); // []: back to where the trail started
 * ```
 */
function pushOrigin(
	trail: ReadonlyArray<OriginEntry>,
	self: OriginEntry | null,
	targetTo: string,
): ReadonlyArray<OriginEntry> {
	const index = trail.findIndex((entry) => entry.to === targetTo);
	if (index !== -1) {
		return trail.slice(0, index);
	}
	if (self == null || self.to === targetTo) {
		return trail;
	}
	return [...trail, self].slice(-MAX_ORIGIN_DEPTH);
}

/**
 * The `handle` shape a resource route exports to identify itself. Return
 * `null` when the match cannot name a resource. Links inside the resource
 * (its tabs) must forward `location.state`, or the trail drops on the first
 * tab click; keep those links in one component per resource.
 *
 * @example
 * ```ts
 * export const handle = {
 * 	origin: (match) => (match.params.endpointId == null ? null : { kind: "endpoint", id: match.params.endpointId }),
 * } satisfies OriginHandle<UIMatch>;
 * ```
 */
type OriginHandle<TMatch = unknown> = {
	origin: (match: TMatch) => OriginIdentity | null;
};

/**
 * The fields {@link findSelfOrigin} reads off a route match: the same three
 * `buildCrumbs` reads, because the ancestors come from the route trail.
 */
type OriginMatch = BreadcrumbMatch;

/**
 * The route trail above its leaf, kept to what `location.state` can hold: a
 * string label and, for a link, its `to`. A content crumb has no
 * serializable label, so it is skipped.
 */
function serializableAncestors(
	crumbs: ReadonlyArray<ResolvedCrumb>,
): ReadonlyArray<OriginAncestor> {
	return crumbs.slice(0, -1).flatMap((crumb): ReadonlyArray<OriginAncestor> => {
		if (crumb.kind === "content" || typeof crumb.label !== "string") {
			return [];
		}
		if (crumb.kind === "link") {
			return [{ label: crumb.label, to: crumb.to }];
		}
		return [{ label: crumb.label }];
	});
}

/**
 * Whether a route match identifies itself as a resource. A real type guard,
 * so {@link findSelfOrigin} reads `match.handle` without an assertion.
 *
 * @example
 * ```ts
 * useMatches().findLast(hasOrigin);
 * ```
 */
function hasOrigin<TMatch extends OriginMatch>(
	match: TMatch,
): match is TMatch & { handle: OriginHandle<TMatch> } {
	const { handle } = match;
	if (handle == null || typeof handle !== "object" || !("origin" in handle)) {
		return false;
	}
	return typeof handle.origin === "function";
}

/**
 * The current page's identity, stamped with its resource root and the static
 * crumbs above it. The deepest match with an `origin` handle wins. Its
 * cumulative `pathname` stops at that route, so a tab under a detail route
 * still resolves to the resource root, not to the tab.
 *
 * @example
 * ```ts
 * findSelfOrigin(useMatches());
 * // on /endpoints/ep_1/traffic-policy:
 * // { kind: "endpoint", id: "ep_1", to: "/endpoints/ep_1", ancestors: [{ label: "Endpoints", to: "/endpoints" }] }
 * ```
 */
function findSelfOrigin<TMatch extends OriginMatch>(
	matches: ReadonlyArray<TMatch>,
): OriginEntry | null {
	const match = matches.findLast(hasOrigin);
	if (match == null) {
		return null;
	}
	const identity = match.handle.origin(match);
	if (identity == null) {
		return null;
	}
	// the chain up to the resource: a crumb a deeper child contributes is below
	// the resource, not above it
	const chainToSelf = matches.slice(0, matches.indexOf(match) + 1);
	return {
		...identity,
		to: match.pathname,
		ancestors: serializableAncestors(buildCrumbs(chainToSelf)),
	};
}

export {
	//,
	findSelfOrigin,
	hasOrigin,
	MAX_ORIGIN_DEPTH,
	originKinds,
	pushOrigin,
	readOriginTrail,
};

export type {
	//,
	OriginAncestor,
	OriginEntry,
	OriginHandle,
	OriginIdentity,
	OriginKind,
	OriginMatch,
};
