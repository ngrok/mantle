import type { ResolvedCrumb } from "@ngrok/mantle/breadcrumb";
import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Button } from "@ngrok/mantle/button";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "~/features/breadcrumbs/breadcrumbs";

/** One simulated URL and the trail it produces. */
type Trail = { url: string; crumbs: ReadonlyArray<ResolvedCrumb> };

/**
 * Simulates a query-backed content crumb: the app's name only exists in
 * fetched data, so the segment shows `Breadcrumb.Skeleton` until the "query"
 * resolves. In an app this is the same TanStack Query hook the page calls, so
 * the crumb and the page share one cache entry.
 */
function DemoAppTrail() {
	const [appName, setAppName] = useState<string | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => setAppName("my-app"), 1200);
		return () => {
			clearTimeout(timer);
		};
	}, []);

	if (appName == null) {
		return <Breadcrumb.Skeleton itemCount={2} />;
	}

	return (
		<>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="#">{appName}</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>Settings</Breadcrumb.Page>
			</Breadcrumb.Item>
		</>
	);
}

/**
 * The shortest trail, and the fallback for an out-of-range index — named so
 * TypeScript knows it is defined (`trails[i]` is `Trail | undefined` under
 * `noUncheckedIndexedAccess`).
 */
const endpointsTrail = {
	url: "/endpoints",
	crumbs: [{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "#" }],
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
			{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "#" },
			// derived from loader data, with the URL param as the fallback
			{ kind: "link", key: "endpoint:0", label: "https://forward-labels.test", to: "#" },
		],
	},
	{
		url: "/endpoints/cloud/ep_3Exgo/traffic-policy",
		crumbs: [
			{ kind: "link", key: "endpoints:0", label: "Endpoints", to: "#" },
			{ kind: "link", key: "endpoint:0", label: "https://forward-labels.test", to: "#" },
			{ kind: "link", key: "traffic-policy:0", label: "Traffic Policy", to: "#" },
		],
	},
	{
		url: "/settings/general",
		crumbs: [
			// a prefix crumb: `/settings` only redirects, so `routeBreadcrumb.label`
			// makes it a label crumb, rendered as a non-link Breadcrumb.Label
			{ kind: "label", key: "settings:0", label: "Settings" },
			{ kind: "link", key: "general:0", label: "General", to: "#" },
		],
	},
	{
		url: "/apps/app_123/settings",
		crumbs: [
			{ kind: "link", key: "apps:0", label: "Apps", to: "#" },
			// a content crumb: the segment renders itself from query data, with a
			// skeleton fallback while the query is pending
			{ kind: "content", key: "app:0", content: <DemoAppTrail /> },
		],
	},
] satisfies ReadonlyArray<Trail>;

/**
 * Switches between five trails so a reader can watch it grow — and watch the leaf
 * become `aria-current="page"` while its ancestors become links — without leaving
 * the docs page. The fourth trail carries a prefix crumb, rendered as a non-link
 * `Breadcrumb.Label`; the fifth carries a query-backed content crumb that shows
 * `Breadcrumb.Skeleton` until its simulated query resolves.
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
