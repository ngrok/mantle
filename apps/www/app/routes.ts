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

// Helper to create recipe routes under /recipes (handles both /recipes/path and /recipes/path.md URLs)
function recipeRoute(path: string) {
	return markdownRoute(`recipes/${path}`, "recipes", path);
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

		// component docs — /components/<category>/<component>, alphabetical by
		// full slug (category blocks and entries within each block)
		// actions
		...docRoute("components/actions/button"),
		...docRoute("components/actions/icon-button"),
		...docRoute("components/actions/split-button"),
		// data display
		...docRoute("components/data-display/accordion"),
		...docRoute("components/data-display/badge"),
		...docRoute("components/data-display/code"),
		...docRoute("components/data-display/code-block"),
		// Sub-page linked from the Code Block doc; intentionally excluded from
		// the sidebar nav.
		...docRoute("components/data-display/code-block/folding-by-language"),
		...docRoute("components/data-display/data-table"),
		...docRoute("components/data-display/description-list"),
		...docRoute("components/data-display/flag"),
		...docRoute("components/data-display/icon"),
		...docRoute("components/data-display/icons"),
		...docRoute("components/data-display/kbd"),
		...docRoute("components/data-display/list"),
		...docRoute("components/data-display/qr-code"),
		...docRoute("components/data-display/selectable-list"),
		...docRoute("components/data-display/table"),
		// feedback
		...docRoute("components/feedback/alert"),
		...docRoute("components/feedback/empty"),
		...docRoute("components/feedback/progress-bar"),
		...docRoute("components/feedback/progress-donut"),
		...docRoute("components/feedback/skeleton"),
		...docRoute("components/feedback/toast"),
		// forms
		...docRoute("components/forms/checkbox"),
		...docRoute("components/forms/choice"),
		...docRoute("components/forms/combobox"),
		...docRoute("components/forms/field"),
		...docRoute("components/forms/input"),
		...docRoute("components/forms/label"),
		...docRoute("components/forms/multi-select"),
		...docRoute("components/forms/otp-input"),
		...docRoute("components/forms/password-input"),
		...docRoute("components/forms/radio-group"),
		...docRoute("components/forms/select"),
		...docRoute("components/forms/slider"),
		...docRoute("components/forms/switch"),
		...docRoute("components/forms/text-area"),
		...docRoute("components/forms/theme-switcher"),
		// navigation
		...docRoute("components/navigation/anchor"),
		...docRoute("components/navigation/breadcrumb"),
		...docRoute("components/navigation/command"),
		...docRoute("components/navigation/pagination"),
		...docRoute("components/navigation/tabs"),
		// overlays
		...docRoute("components/overlays/alert-dialog"),
		...docRoute("components/overlays/dialog"),
		...docRoute("components/overlays/dropdown-menu"),
		...docRoute("components/overlays/hover-card"),
		...docRoute("components/overlays/popover"),
		...docRoute("components/overlays/sheet"),
		...docRoute("components/overlays/tooltip"),
		// preview (lifecycle namespace, not a category)
		...docRoute("components/preview/calendar"),
		// primitives
		...docRoute("components/primitives/browser-only"),
		...docRoute("components/primitives/main"),
		...docRoute("components/primitives/sandboxed-on-click"),
		...docRoute("components/primitives/skip-to-main-link"),
		...docRoute("components/primitives/slot"),
		...docRoute("components/primitives/theme"),
		// structure
		...docRoute("components/structure/card"),
		...docRoute("components/structure/media-object"),
		...docRoute("components/structure/separator"),
		...docRoute("components/structure/well"),

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

	// layouts layout — published page/viewport structure primitives. Add
	// `...markdownRoute("layouts/<slug>", "layouts", "<slug>")` entries here as
	// they graduate (see decisions/2026-07-08-docs-information-architecture.md).
	layout("./routes/layouts-layout.tsx", [
		// The explicit id is load-bearing: layouts-layout.tsx matches on it to
		// keep the section index on the standard centered container.
		route("layouts", "./routes/layouts.tsx", { id: "layouts-index" }),
		...markdownRoute("layouts/centered-layout", "layouts", "centered-layout"),
	]),

	// recipes layout — compositional how-tos spanning multiple primitives
	layout("./routes/recipes-layout.tsx", [
		route("recipes", "./routes/recipes.tsx"),
		...recipeRoute("overlay-async"),
	]),

	// migrations layout
	layout("./routes/migrations-layout.tsx", [
		route("migrations", "./routes/migrations.tsx"),
		...migrationRoute("code-block-migration"),
		...migrationRoute("data-table-action-header-migration"),
		...migrationRoute("dialog-footer-dom-order-migration"),
		...migrationRoute("priority-to-intent-migration"),
	]),

	// 404 + legacy redirects — splat catch-all for any unmatched URL. Matches
	// (so ancestor loaders run) and 301s known pre-IA-reorg paths (e.g.
	// /components/button, /blocks/*) to their new homes, returning a 404
	// status for everything else, mirroring the dot-com www 404 route.
	route("*", "./routes/catch-all.tsx", { id: "catch-all" }),
] satisfies RouteConfig;
