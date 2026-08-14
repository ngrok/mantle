import type { Config, Preset } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";
const isVercelDeploy = process.env.VERCEL === "1";

/**
 * Wrap `vercelPreset()` so its per-route config scan never parses MDX.
 *
 * The preset's `serverBundles` hook reads an optional `export const config`
 * from every leaf route file with ts-morph to pick a Vercel runtime. Docs
 * pages register their MDX files as route modules, ts-morph can only parse
 * TypeScript, and the scan crashes the production build. Point each MDX leaf
 * at its nearest non-MDX ancestor instead: docs pages inherit the doc-page
 * layout's runtime config, which the preset's prototype chain does for every
 * route anyway.
 */
function mdxSafeVercelPreset(): Preset {
	const preset = vercelPreset();
	const configureVercel = preset.reactRouterConfig;
	if (!configureVercel) {
		return preset;
	}

	return {
		...preset,
		reactRouterConfig: async (args) => {
			const config = await configureVercel(args);
			const { serverBundles } = config;
			if (typeof serverBundles !== "function") {
				return config;
			}

			return {
				...config,
				serverBundles: (bundlesArgs) => {
					const branch = bundlesArgs.branch.map((routeEntry, index) => {
						if (!routeEntry.file.endsWith(".mdx")) {
							return routeEntry;
						}
						const ancestor = bundlesArgs.branch
							.slice(0, index)
							.findLast((candidate) => !candidate.file.endsWith(".mdx"));
						return ancestor ? { ...routeEntry, file: ancestor.file } : routeEntry;
					});
					return serverBundles({ ...bundlesArgs, branch });
				},
			};
		},
	};
}

export default {
	// The v8_* future flags this app opted into under React Router 7 are now the
	// default behavior in v8 and were removed from the config type, so there is
	// nothing left to enable here.
	ssr: true,
	splitRouteModules: true,
	presets: [
		//,
		isVercelDeploy && mdxSafeVercelPreset(),
	].filter(Boolean),
	prerender: ({ getStaticPaths }) => {
		// `.mdx` paths exist only to 301-redirect stale source URLs to the canonical
		// doc page; they are not pages to snapshot. Visiting them during prerender
		// fails because the framework treats the 301 as an unexpected status.
		return getStaticPaths().filter((path) => !path.endsWith(".mdx"));
	},
} satisfies Config;
