import type { Config, Preset } from "@react-router/dev/config";
import { mkdirSync, writeFileSync } from "node:fs";
const isVercelDeploy = process.env.VERCEL === "1";

/**
 * The ID and Vercel function config of the one server bundle.
 */
const vercelServerBundle = {
	id: "nodejs",
	config: { runtime: "nodejs" },
} as const;

/**
 * Write the build result that Vercel's React Router builder reads to make
 * functions and routes. It replaces `vercelPreset()` from `@vercel/react-router`.
 *
 * Every route runs in one Node.js function, so this preset skips the per-route
 * `export const config` scan. The builder reads
 * `.vercel/react-router-build-result.json`. Without that file, it routes only
 * `/` to its prerendered HTML. Vercel does not document the file format, so
 * check a preview deploy when the builder changes.
 */
function vercelPreset(): Preset {
	return {
		name: "vercel",
		reactRouterConfig: () => ({
			serverBundles: () => vercelServerBundle.id,
			buildEnd: ({ buildManifest, reactRouterConfig, viteConfig }) => {
				const serverBundle = buildManifest?.serverBundles?.[vercelServerBundle.id];
				if (!buildManifest || !serverBundle) {
					throw new Error(
						`The Vercel build manifest has no server bundle ${vercelServerBundle.id}.`,
					);
				}
				const buildResult = {
					buildManifest: {
						...buildManifest,
						serverBundles: {
							[vercelServerBundle.id]: { ...serverBundle, config: vercelServerBundle.config },
						},
					},
					reactRouterConfig,
					viteConfig: { build: { assetsDir: viteConfig.build.assetsDir } },
				};
				mkdirSync(".vercel", { recursive: true });
				writeFileSync(
					".vercel/react-router-build-result.json",
					`${JSON.stringify(buildResult, null, 2)}\n`,
				);
			},
		}),
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
		isVercelDeploy && vercelPreset(),
	].filter(Boolean),
	prerender: ({ getStaticPaths }) => {
		// `.mdx` paths exist only to 301-redirect stale source URLs to the canonical
		// doc page; they are not pages to snapshot. Visiting them during prerender
		// fails because the framework treats the 301 as an unexpected status.
		// The benchmark page renders on the client only; a snapshot of it holds nothing.
		return getStaticPaths().filter((path) => !path.endsWith(".mdx") && !path.startsWith("/bench/"));
	},
} satisfies Config;
