import { data, redirect } from "react-router";
import { ErrorPage } from "~/components/error-page";
import { PageContainer } from "~/components/page-container";
import { canonicalHref } from "~/utilities/canonical-origin";
import { legacyRedirectFor } from "~/utilities/legacy-redirects";
import type { Route } from "./+types/catch-all";

/** Meta for the 404 page — `noindex` so crawlers don't index broken URLs. */
export function meta({ location }: Route.MetaArgs) {
	return [
		{ title: "Page not found - @ngrok/mantle" },
		{ name: "robots", content: "noindex, nofollow" },
		{ tagName: "link" as const, rel: "canonical", href: canonicalHref(location.pathname) },
	];
}

/**
 * Loader for the splat route. Permanently redirects known pre-IA-reorg URLs
 * (flat `/components/<name>` paths, the old `/blocks` section) to their new
 * homes, and returns a 404 status for everything else so SSR responses for
 * unknown URLs are correctly marked as not found for crawlers and clients.
 * Because this route *matches*, ancestor loaders (including root) run normally
 * — unlike an unmatched URL, which would render the root error boundary with
 * no root loader data.
 */
export function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const legacyTarget = legacyRedirectFor(url.pathname);
	if (legacyTarget != null) {
		return redirect(`${legacyTarget}${url.search}`, 301);
	}
	return data(null, { status: 404 });
}

/** The 404 page. Catches any URL that doesn't match a known route. */
export default function CatchAll() {
	return (
		<PageContainer>
			<ErrorPage status={404} />
		</PageContainer>
	);
}
