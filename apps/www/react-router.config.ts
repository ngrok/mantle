import type { Config } from "@react-router/dev/config";

export default {
	// The v8_* future flags this app opted into under React Router 7 are now the
	// default behavior in v8 and were removed from the config type, so there is
	// nothing left to enable here.
	ssr: true,
	splitRouteModules: true,
	prerender: ({ getStaticPaths }) => {
		// `.mdx` paths exist only to 301-redirect stale source URLs to the canonical
		// doc page; they are not pages to snapshot. Visiting them during prerender
		// fails because the framework treats the 301 as an unexpected status.
		// The benchmark page renders on the client only; a snapshot of it holds nothing.
		// `robots.txt` depends on the `x-ngrok-edge` request header, so it must answer each request.
		return getStaticPaths().filter(
			(path) => !path.endsWith(".mdx") && !path.startsWith("/bench/") && path !== "/robots.txt",
		);
	},
} satisfies Config;
