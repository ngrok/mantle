import { Button } from "@ngrok/mantle/button";
import { useState } from "react";
import { Breadcrumbs } from "~/features/breadcrumbs/breadcrumbs";
import type { ResolvedCrumb } from "~/features/breadcrumbs/route-breadcrumb";

/** One simulated URL and the trail it produces. */
type Trail = { url: string; crumbs: ReadonlyArray<ResolvedCrumb> };

/**
 * The shortest trail, and the fallback for an out-of-range index — named so
 * TypeScript knows it is defined (`trails[i]` is `Trail | undefined` under
 * `noUncheckedIndexedAccess`).
 */
const endpointsTrail = {
	url: "/endpoints",
	crumbs: [{ key: "endpoints:0", label: "Endpoints", to: "#" }],
} satisfies Trail;

/**
 * The trails this demo switches between, one per URL a reader can pick.
 *
 * In an app these come from `buildCrumbs(useMatches())`. Here they are fixtures,
 * because a demo embedded in this page cannot mount a second router — but the
 * component rendering them is the real `Breadcrumbs`, unmodified, so what you see
 * is what the recipe ships.
 *
 * Every linked `to` is `"#"` so clicking an ancestor stays on this page. In an
 * app they are real paths and the router handles the navigation.
 */
const trails = [
	endpointsTrail,
	{
		url: "/endpoints/cloud/ep_3Exgo",
		crumbs: [
			{ key: "endpoints:0", label: "Endpoints", to: "#" },
			// derived from loader data, with the URL param as the fallback
			{ key: "endpoint:0", label: "https://forward-labels.test", to: "#" },
		],
	},
	{
		url: "/endpoints/cloud/ep_3Exgo/traffic-policy",
		crumbs: [
			{ key: "endpoints:0", label: "Endpoints", to: "#" },
			{ key: "endpoint:0", label: "https://forward-labels.test", to: "#" },
			{ key: "traffic-policy:0", label: "Traffic Policy", to: "#" },
		],
	},
	{
		url: "/settings/general",
		crumbs: [
			// a prefix crumb: `/settings` only redirects, so `to: null` renders it
			// as a non-link Breadcrumb.Label
			{ key: "settings:0", label: "Settings", to: null },
			{ key: "general:0", label: "General", to: "#" },
		],
	},
] satisfies ReadonlyArray<Trail>;

/**
 * Switches between four trails so a reader can watch it grow — and watch the leaf
 * become `aria-current="page"` while its ancestors become links — without leaving
 * the docs page. The last trail carries a prefix crumb, rendered as a non-link
 * `Breadcrumb.Label`.
 *
 * @example
 * ```tsx
 * <Example>
 *   <RouteBreadcrumbsDemo />
 * </Example>
 * ```
 */
export function RouteBreadcrumbsDemo() {
	const [urlIndex, setUrlIndex] = useState(0);
	const trail = trails[urlIndex] ?? endpointsTrail;

	return (
		<div className="flex w-full max-w-2xl flex-col gap-4">
			<div className="flex flex-wrap gap-2">
				{trails.map((candidate, index) => (
					<Button
						key={candidate.url}
						type="button"
						size="sm"
						appearance={index === urlIndex ? "filled" : "outlined"}
						intent={index === urlIndex ? "accent" : "neutral"}
						onClick={() => setUrlIndex(index)}
					>
						{candidate.url}
					</Button>
				))}
			</div>
			<div className="border-card-muted bg-card rounded-lg border px-4 py-3">
				<Breadcrumbs crumbs={trail.crumbs} />
			</div>
		</div>
	);
}
