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
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	type ShouldRevalidateFunctionArgs,
	useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { SkipToMainLink } from "@ngrok/mantle/skip-to-main-link";
import { Header } from "./components/header";
import { NavigationProvider } from "./components/navigation-context";
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
		className: "h-full scroll-pt-16",
	});
	const scrollBehavior = useScrollBehavior();
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
				<meta name="commit-sha" content={loaderData?.commitSha} />
				<meta name="deployment-id" content={loaderData?.deploymentId} />
				<Meta />
				<Links nonce={nonce} />
			</head>
			<body
				className={cx(
					"bg-card h-full min-h-full overflow-y-scroll scrollbar isolate relative",
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
 * own sidebar / main / TOC grid inside the `<Outlet />`.
 */
export default function App() {
	return (
		<div className="flex min-h-full flex-col">
			<SkipToMainLink />
			<Header />
			<div className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 md:pt-20">
				<Outlet />
			</div>
		</div>
	);
}
