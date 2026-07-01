import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

// Helper to create markdown-backed routes (handles /path and /path.md URLs,
// plus a permanent redirect from the never-served /path.mdx source URL)
function markdownRoute(path: string, idPrefix: string, idPath = path) {
	const id = `${idPrefix}-${idPath.replace(/\//g, "-")}`;
	return [
		route(path, "./routes/$.tsx", { id }),
		route(`${path}.md`, "./routes/$.md.tsx", { id: `${id}-md` }),
		route(`${path}.mdx`, "./routes/$.mdx.tsx", { id: `${id}-mdx` }),
	];
}

// Helper to create doc routes (handles both /path and /path.md URLs)
function docRoute(path: string) {
	return markdownRoute(path, "docs");
}

// Helper to create block routes under /blocks (handles both /blocks/path and /blocks/path.md URLs)
function blockRoute(path: string) {
	return markdownRoute(`blocks/${path}`, "blocks", path);
}

// Helper to create migration routes under /migrations (handles both /migrations/path and /migrations/path.md URLs)
function migrationRoute(path: string) {
	return markdownRoute(`migrations/${path}`, "migrations", path);
}

export default [
	route("robots.txt", "./routes/robots[.]txt.tsx", { id: "robots-txt" }),
	route("sitemap.xml", "./routes/sitemap[.]xml.tsx", { id: "sitemap-xml" }),
	route("llms.txt", "./routes/llms[.]txt.tsx", { id: "llms-txt" }),
	route("llms-full.txt", "./routes/llms-full[.]txt.tsx", { id: "llms-full-txt" }),
	route("api/components.json", "./routes/api.components[.]json.tsx", { id: "api-components-json" }),
	route("api/hooks.json", "./routes/api.hooks[.]json.tsx", { id: "api-hooks-json" }),
	route("api/utils.json", "./routes/api.utils[.]json.tsx", { id: "api-utils-json" }),
	route("api/package.json", "./routes/api.package[.]json.tsx", { id: "api-package-json" }),
	route("api/changelog.json", "./routes/api.changelog[.]json.tsx", { id: "api-changelog-json" }),
	route("api/schema.json", "./routes/api.schema[.]json.tsx", { id: "api-schema-json" }),
	route("api/search-index.json", "./routes/api.search-index[.]json.tsx", {
		id: "api-search-index-json",
	}),
	route("api/shiki-highlight", "./routes/api.shiki-highlight.tsx"),

	// docs layout
	layout("./routes/docs-layout.tsx", [
		index("./routes/_index.tsx"),
		route("index.md", "./routes/$.md.tsx", { id: "docs-index-md" }),

		// MDX docs: auto-discovers docs from app/docs/**/*.mdx
		// Handles both /path and /path.md URLs (returns HTML or raw markdown respectively)

		// core/base top-level pages
		...docRoute("philosophy"),
		...docRoute("accessibility"),
		...docRoute("for-ai-agents"),
		// /changelog renders app/docs/changelog.mdx, which embeds the
		// published @ngrok/mantle CHANGELOG.md. /changelog.md serves the
		// raw package CHANGELOG bytes (not the MDX-roundtripped version),
		// so it bypasses $.md.tsx.
		route("changelog", "./routes/$.tsx", { id: "docs-changelog" }),
		route("changelog.md", "./routes/changelog[.]md.tsx", { id: "changelog-md" }),
		route("changelog.mdx", "./routes/$.mdx.tsx", { id: "changelog-mdx" }),
		...docRoute("base/breakpoints"),
		...docRoute("base/colors"),
		...docRoute("base/scroll-fade"),
		...docRoute("base/shadows"),
		...docRoute("base/tailwind-variants"),
		...docRoute("base/typography"),

		// component docs
		...docRoute("components/accordion"),
		...docRoute("components/alert-dialog"),
		...docRoute("components/alert"),
		...docRoute("components/anchor"),
		...docRoute("components/badge"),
		...docRoute("components/browser-only"),
		...docRoute("components/button"),
		...docRoute("components/card"),
		...docRoute("components/checkbox"),
		...docRoute("components/choice"),
		...docRoute("components/code-block"),
		// Sub-page linked from the Code Block doc; intentionally excluded from
		// the sidebar nav.
		...docRoute("components/code-block/folding-by-language"),
		...docRoute("components/code"),
		...docRoute("components/combobox"),
		...docRoute("components/command"),
		...docRoute("components/data-table"),
		...docRoute("components/description-list"),
		...docRoute("components/dialog"),
		...docRoute("components/dropdown-menu"),
		...docRoute("components/empty"),
		...docRoute("components/field"),
		...docRoute("components/flag"),
		...docRoute("components/hover-card"),
		...docRoute("components/icon-button"),
		...docRoute("components/icon"),
		...docRoute("components/icons"),
		...docRoute("components/input"),
		...docRoute("components/kbd"),
		...docRoute("components/label"),
		...docRoute("components/list"),
		...docRoute("components/main"),
		...docRoute("components/media-object"),
		...docRoute("components/multi-select"),
		...docRoute("components/otp-input"),
		...docRoute("components/pagination"),
		...docRoute("components/password-input"),
		...docRoute("components/popover"),
		...docRoute("components/preview/calendar"),
		...docRoute("components/progress-bar"),
		...docRoute("components/progress-donut"),
		...docRoute("components/qr-code"),
		...docRoute("components/radio-group"),
		...docRoute("components/sandboxed-on-click"),
		...docRoute("components/scrollable-list"),
		...docRoute("components/select"),
		...docRoute("components/selectable-list"),
		...docRoute("components/separator"),
		...docRoute("components/sheet"),
		...docRoute("components/skeleton"),
		...docRoute("components/skip-to-main-link"),
		...docRoute("components/slider"),
		...docRoute("components/slot"),
		...docRoute("components/split-button"),
		...docRoute("components/switch"),
		...docRoute("components/table"),
		...docRoute("components/tabs"),
		...docRoute("components/text-area"),
		...docRoute("components/theme"),
		...docRoute("components/toast"),
		...docRoute("components/tooltip"),
		...docRoute("components/well"),

		// hooks 🪝
		...docRoute("hooks"),

		// utilities
		...docRoute("utils/color"),
		...docRoute("utils/compose-refs"),
		...docRoute("utils/cx"),
		...docRoute("utils/highlight-utils"),
		...docRoute("utils/in-view"),
		...docRoute("utils/sorting"),
	]),

	// blocks layout
	layout("./routes/blocks-layout.tsx", [
		route("blocks", "./routes/blocks.tsx"),
		...blockRoute("sheet-async"),
	]),

	// migrations layout
	layout("./routes/migrations-layout.tsx", [
		route("migrations", "./routes/migrations.tsx"),
		...migrationRoute("code-block-migration"),
		...migrationRoute("data-table-action-header-migration"),
		...migrationRoute("dialog-footer-dom-order-migration"),
	]),

	// 404 — splat catch-all for any unmatched URL. Matches (so ancestor loaders
	// run) and returns a 404 status, mirroring the dot-com www 404 route.
	route("*", "./routes/catch-all.tsx", { id: "catch-all" }),
] satisfies RouteConfig;
