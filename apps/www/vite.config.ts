import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";
import path from "node:path";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import { remarkMdxGithubAlerts } from "@ngrok/remark-mdx-github-alerts";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

import { remarkMdxNoParagraphWrap } from "@ngrok/remark-mdx-no-paragraph-wrap";
import { mantleChangelogMdx } from "./vite-plugins/mantle-changelog-mdx";
import { mdxDocComponentImports } from "./vite-plugins/mdx-doc-component-imports";
import { rawMdxDocs } from "./vite-plugins/raw-mdx-docs";
import { rehypeMdxDocHandle } from "./vite-plugins/rehype-mdx-doc-handle";
import { remarkMdxDemoteLowercaseExports } from "./vite-plugins/remark-mdx-demote-lowercase-exports";
import { remarkMdxFrontmatterData } from "./vite-plugins/remark-mdx-frontmatter-data";

const codeBlockPlugins = mantleCodeBlockPlugins();

export default defineConfig(({ command }) => ({
	optimizeDeps: {
		exclude: ["@ngrok/mantle"],
	},
	plugins: [
		//
		...codeBlockPlugins.vitePlugins,
		rawMdxDocs(path.resolve(import.meta.dirname, "app/docs")),
		mdxDocComponentImports(path.resolve(import.meta.dirname, "app/docs")),
		mantleChangelogMdx(path.resolve(import.meta.dirname, "../../packages/mantle/CHANGELOG.md")),
		devtoolsJson(),
		tailwindcss(),
		mdx({
			// Only treat `.mdx` files as MDX. `.md` is left alone so `?raw`
			// imports of plain markdown stay raw — `@mdx-js/rollup`'s filter
			// strips the `?raw` query before checking the include pattern,
			// so widening this would clobber raw imports. The one exception
			// is the synthetic CHANGELOG module exposed by
			// `mantleChangelogMdx`, which intentionally ends in `.md` so MDX
			// runs in CommonMark-only mode.
			include: [/\.mdx$/, /__virtual__\/@ngrok\/mantle\/changelog\.md$/],
			// Docs MDX files are route modules, so their exports must stay
			// compatible with React Fast Refresh: component exports plus the
			// route exports React Router accept-lists (`handle`). Frontmatter
			// and toc ship in the `handle` export that `rehypeMdxDocHandle`
			// emits, and author-written lowercase exports (demo data, a schema)
			// compile as plain module-local declarations.
			remarkPlugins: [
				remarkFrontmatter,
				// Parses the YAML block into `file.data` for `rehypeMdxDocHandle`.
				remarkMdxFrontmatterData,
				remarkMdxDemoteLowercaseExports,
				remarkGfm,
				remarkMdxGithubAlerts,
				remarkMdxNoParagraphWrap,
			],
			rehypePlugins: [rehypeSlug, rehypeMdxDocHandle, ...codeBlockPlugins.rehypePlugins],
			providerImportSource: "@mdx-js/react",
		}),
		// The React Router plugin's Fast Refresh transform injects a preamble
		// check that throws when .tsx modules load under Vitest, and tests
		// don't need the framework plugin — component tests render directly.
		...(process.env.VITEST ? [] : [reactRouter()]),
	],
	// A spy or global stub a test installs and then fails to tear down leaks into every test that
	// runs after it, turning an unrelated failure into a cascade and making results order-dependent.
	// Restoring centrally means an inline `mockRestore()` is never load-bearing — a test that throws
	// before reaching its cleanup line still leaves the environment pristine. Mirrors
	// `packages/mantle/vitest.config.ts`, which CONVENTIONS.md § Testing documents repo-wide.
	test: {
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
	},
	resolve: {
		// Ensure Mantle components resolve to source in dev mode (not dist)
		// so client HMR picks up changes immediately
		conditions: ["@ngrok/src-live-types"],
		tsconfigPaths: true,
		alias: {
			// CSS @import doesn't go through Vite's resolve.conditions,
			// so we alias the CSS entry point to the source file directly
			"@ngrok/mantle/mantle.css": path.resolve(
				import.meta.dirname,
				"../../packages/mantle/src/mantle.css",
			),
		},
	},
	server: {
		port: 3333,
		allowedHosts: true,
		warmup: {
			clientFiles: [
				"./app/**/!(*.server|*.test)*.tsx", // Include all .tsx files except server and test files (add more patterns if required)
			],
		},
		watch: {
			// Explicitly watch mantle source files for HMR
			ignored: ["!**/node_modules/@ngrok/mantle/src/**"],
		},
	},
	preview: {
		// React Router prerenders by booting a Vite *preview* server and issuing
		// HTTP requests to `resolvedUrls.local[0]` (always IPv4 `127.0.0.1`).
		// Without pinning the host, Vite binds loopback as `localhost`, which
		// inside Linux build containers (e.g. the Docker image) resolves to IPv6
		// `::1` only — so the prerender request to 127.0.0.1 is refused and the
		// build dies with `ECONNREFUSED` on the first route. macOS aligns both
		// stacks, which is why it only fails in containers. Pinning IPv4 makes
		// the bind interface match the request target.
		host: "127.0.0.1",
	},
	ssr: {
		noExternal:
			command === "build"
				? // Bundle every dependency into the server build so the production
					// image can run without an app `node_modules` (the Docker runner
					// stage ships only `@react-router/serve` and its runtime deps).
					true
				: [
						// https://github.com/phosphor-icons/react/issues/45#issuecomment-2721119452
						"@phosphor-icons/react",
					],
		resolve: {
			// Same as above, but for the SSR renderer.
			// Without this, the server falls back to dist and causes hydration mismatches
			// (className warnings, missing styles, etc.) on hard refresh.
			conditions: ["@ngrok/src-live-types"],
		},
	},
}));
