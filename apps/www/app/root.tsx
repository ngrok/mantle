import { cx } from "@ngrok/mantle/cx";
import { useScrollBehavior } from "@ngrok/mantle/hooks";
import {
	extractThemeCookie,
	mantleStyleSheetUrls,
	MantleStyleSheets,
	PreventWrongThemeFlashScript,
	ThemeProvider,
	useInitialHtmlThemeProps,
} from "@ngrok/mantle/theme";
import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url";
import { Toaster } from "@ngrok/mantle/toast";
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import {
	href,
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	type ShouldRevalidateFunctionArgs,
	useMatches,
	useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { ErrorPage } from "./components/error-page";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { Header } from "./components/header";
import { NavigationProvider } from "./components/navigation-context";
import { PageContainer } from "./components/page-container";
import { useNonce } from "./components/nonce";
import "./global.css";
import { canonicalDomain, canonicalHref } from "./utilities/canonical-origin";
import { parseMantleVersion } from "./utilities/mantle-version.server";
import invariant from "tiny-invariant";
import { MantleVersionProvider } from "./components/mantle-version-provider";

const themeUrls = mantleStyleSheetUrls({
	darkCssUrl,
	lightHighContrastCssUrl,
	darkHighContrastCssUrl,
});

const title = "@ngrok/mantle";
const description = "mantle is ngrok's UI library and design system";

export const meta: Route.MetaFunction = () => {
	const canonicalUrl = canonicalHref(href("/"));

	return [
		{
			//,
			tagName: "link",
			rel: "canonical",
			href: canonicalUrl,
		},
		{
			//,
			name: "og:url",
			property: "og:url",
			content: canonicalUrl,
		},
		{
			name: "twitter:url",
			content: canonicalUrl,
		},
		{
			//,
			title,
		},
		{
			name: "og:title",
			property: "og:title",
			content: title,
		},
		{
			name: "twitter:title",
			property: "twitter:title",
			content: title,
		},
		{
			//,
			name: "description",
			content: description,
		},
		{
			name: "og:description",
			property: "og:description",
			content: description,
		},
		{
			name: "twitter:description",
			content: description,
		},
	];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
	const packageJson = await import("@ngrok/mantle/package.json");
	const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
	const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
	const nodeEnv = process.env.NODE_ENV ?? "development";

	return {
		/**
		 * The current version of mantle from the package.json
		 */
		currentMantleVersion: parseMantleVersion(packageJson.default.version),
		commitSha,
		deploymentId,
		renderReactQueryDevtools: nodeEnv !== "production",
		ssrCookie: extractThemeCookie(request.headers.get("Cookie")),
	} as const;
};

export function shouldRevalidate(_: ShouldRevalidateFunctionArgs) {
	/**
	 * never revalidate root loader
	 * env variables and meta are static per deployment
	 */
	return false;
}

/**
 * Whether the matched route is a chrome-less framed example preview
 * (`/preview/:exampleName`). Matched on route identity, not pathname —
 * mirroring the `layouts-index` pattern in layouts-layout.tsx. Preview
 * documents render inside the docs pages' iframes, so they skip the site
 * chrome and the forced scrollbar gutter.
 */
function useIsFramedPreview() {
	const matches = useMatches();
	return matches.some((match) => match.id === "preview-example");
}

const ReactQueryDevtoolsLazy = lazy(() =>
	import("@tanstack/react-query-devtools/production").then((module) => ({
		default: module.ReactQueryDevtools,
	})),
);

declare global {
	interface Window {
		toggleReactQueryDevtools: () => void;
	}
}

export function Layout({ children }: PropsWithChildren) {
	const loaderData = useRouteLoaderData<typeof loader>("root");
	const initialHtmlThemeProps = useInitialHtmlThemeProps({
		className: "h-full",
	});
	const scrollBehavior = useScrollBehavior();
	const isFramedPreview = useIsFramedPreview();
	const nonce = useNonce();
	const [showReactQueryDevtools, setShowReactQueryDevtools] = useState(
		Boolean(loaderData?.renderReactQueryDevtools),
	);
	const [queryClient] = useState(() => new QueryClient());

	useEffect(() => {
		window.toggleReactQueryDevtools = () => setShowReactQueryDevtools((previous) => !previous);
	}, []);

	const { currentMantleVersion } = loaderData ?? {};
	invariant(currentMantleVersion, "current version should be defined");

	return (
		<html {...initialHtmlThemeProps} lang="en-US" dir="ltr" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta property="og:locale" content="en_US" />
				<meta property="og:type" content="website" />
				<meta property="og:site_name" content="@ngrok/mantle" />
				<meta name="twitter:domain" content={canonicalDomain} />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="og:image" property="og:image" content="/og-image.png" />
				<meta name="twitter:image" property="twitter:image" content="/og-image.png" />
				<PreventWrongThemeFlashScript nonce={nonce} />
				<MantleStyleSheets {...themeUrls} nonce={nonce} ssrCookie={loaderData?.ssrCookie} />
				<meta name="author" content="ngrok" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<meta name="commit-sha" content={loaderData?.commitSha} />
				<meta name="deployment-id" content={loaderData?.deploymentId} />
				<Meta />
				<Links nonce={nonce} />
			</head>
			<body
				className={cx(
					"bg-card h-full min-h-full scrollbar isolate relative",
					// the docs site forces a permanent scrollbar gutter so page length
					// never shifts the layout; inside a preview iframe that gutter reads
					// as a broken demo, so preview documents scroll only when needed
					isFramedPreview ? "overflow-y-auto" : "overflow-y-scroll",
					scrollBehavior === "smooth" && "scroll-smooth",
				)}
			>
				<ThemeProvider>
					<TooltipProvider>
						<Toaster />
						<QueryClientProvider client={queryClient}>
							{showReactQueryDevtools && (
								<Suspense fallback={null}>
									<ReactQueryDevtoolsLazy />
								</Suspense>
							)}
							<MantleVersionProvider mantleVersion={currentMantleVersion}>
								<NavigationProvider>{children}</NavigationProvider>
							</MantleVersionProvider>
						</QueryClientProvider>
					</TooltipProvider>
				</ThemeProvider>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
			</body>
		</html>
	);
}

/**
 * The outermost route component. Renders only the truly page-agnostic chrome —
 * skip link, header, and the outer page wrapper. Each layout route owns its
 * own sidebar / main / TOC grid inside the `<Outlet />`. Framed example
 * previews are the exception: they render the bare outlet so the example owns
 * the entire document.
 */
export default function App() {
	const isFramedPreview = useIsFramedPreview();

	// framed example previews own their whole document: no site header or skip
	// link — the example brings its own landmarks (see routes/preview.tsx)
	if (isFramedPreview) {
		return <Outlet />;
	}

	return (
		<div className="flex min-h-full flex-col">
			<SkipToMainLink />
			<Header />
			<Outlet />
		</div>
	);
}

/**
 * Root error boundary. Renders the site chrome (header + page frame) around the
 * shared {@link ErrorPage} for errors thrown from a matched route — e.g. the
 * `404` a docs `.md` route raises for an unknown slug, or an unexpected `500`.
 * Unmatched URLs are handled by the splat `catch-all` route instead, so the
 * root loader runs there and the page renders with full chrome and data.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const isResponse = isRouteErrorResponse(error);
	const status = isResponse ? error.status : 500;
	const stack = !isResponse && import.meta.env.DEV && error instanceof Error ? error.stack : null;

	return (
		<div className="flex min-h-full flex-col">
			<SkipToMainLink />
			<Header />
			<PageContainer>
				<ErrorPage status={status} />
				{stack && (
					<pre className="mx-auto max-w-full overflow-x-auto rounded-md bg-gray-100 p-4 text-left text-xs text-body">
						{stack}
					</pre>
				)}
			</PageContainer>
		</div>
	);
}
