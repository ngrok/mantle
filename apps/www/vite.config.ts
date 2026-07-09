import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";
import path from "node:path";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import { remarkMdxGithubAlerts } from "@ngrok/remark-mdx-github-alerts";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

import { remarkMdxNoParagraphWrap } from "@ngrok/remark-mdx-no-paragraph-wrap";
import { mdxDocComponentImports } from "./vite-plugins/mdx-doc-component-imports";
import { rawMdxDocs } from "./vite-plugins/raw-mdx-docs";

const codeBlockPlugins = mantleCodeBlockPlugins();

export default defineConfig({
	optimizeDeps: {
		exclude: ["@ngrok/mantle"],
	},
	plugins: [
		//
		...codeBlockPlugins.vitePlugins,
		rawMdxDocs(path.resolve(import.meta.dirname, "app/docs")),
		mdxDocComponentImports(path.resolve(import.meta.dirname, "app/docs")),
		devtoolsJson(),
		tailwindcss(),
		mdx({
			remarkPlugins: [
				remarkFrontmatter,
				// Use `export: "namespace"` to attach frontmatter as a property on
				// the default export component (MDXContent.frontmatter) instead of a
				// separate named export. This is required for React Refresh (Fast
				// Refresh) compatibility — modules that export non-component values
				// cause React Refresh to bail out and trigger a full page reload.
				[remarkMdxFrontmatter, { export: "namespace" }],
				remarkGfm,
				remarkMdxGithubAlerts,
				remarkMdxNoParagraphWrap,
			],
			rehypePlugins: [rehypeSlug, ...codeBlockPlugins.rehypePlugins],
			providerImportSource: "@mdx-js/react",
		}),
		reactRouter(),
	],
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
	ssr: {
		noExternal: [
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
});
