import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";
const isVercelDeploy = process.env.VERCEL === "1";

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
		return getStaticPaths().filter((path) => !path.endsWith(".mdx"));
	},
} satisfies Config;
