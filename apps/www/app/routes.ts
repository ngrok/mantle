import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

function docRouteId(idPrefix: string, idPath: string) {
	return `${idPrefix}-${idPath.replace(/\//g, "-")}`;
}

// Helper to create a docs page route. The route module is the MDX file
// itself, nested under the doc-page pathless layout, so the router loads the
// compiled content before it renders: no Suspense fallback and no
// client-side MDX resolution.
function docPageRoute(path: string, idPrefix: string, idPath = path) {
	return route(path, `./docs/${path}.mdx`, { id: docRouteId(idPrefix, idPath) });
}

// Helper to create a page's markdown alias routes, registered outside the
// doc-page layout: /path.md serves raw markdown, and /path.mdx permanently
// redirects the never-served source URL to the canonical page.
function markdownAliasRoutes(path: string, idPrefix: string, idPath = path) {
	const id = docRouteId(idPrefix, idPath);
	return [
		route(`${path}.md`, "./routes/$.md.tsx", { id: `${id}-md` }),
		route(`${path}.mdx`, "./routes/$.mdx.tsx", { id: `${id}-mdx` }),
	];
}

// MDX docs from app/docs/**/*.mdx, addressed by their URL path.
const docsPages = [
	// core/base top-level pages
	"philosophy",
	"accessibility",
	"browser-translation",
	"for-ai-agents",
	"base/breakpoints",
	"base/colors",
	"base/scroll-fade",
	"base/shadows",
	"base/stacking-layers",
	"base/tailwind-variants",
	"base/typography",

	// component docs — /components/<category>/<component>, alphabetical by
	// full slug (category blocks and entries within each block)
	// actions
	"components/actions/button",
	"components/actions/icon-button",
	"components/actions/split-button",
	// charts
	"components/charts/area-chart",
	"components/charts/bar-chart",
	"components/charts/line-chart",
	"components/charts/scatter-plot",
	// data display
	"components/data-display/accordion",
	"components/data-display/avatar",
	"components/data-display/badge",
	"components/data-display/code",
	"components/data-display/code-block",
	// Sub-page linked from the Code Block doc; intentionally excluded from
	// the sidebar nav.
	"components/data-display/code-block/folding-by-language",
	"components/data-display/data-table",
	"components/data-display/description-list",
	"components/data-display/flag",
	"components/data-display/icon",
	"components/data-display/icons",
	"components/data-display/kbd",
	"components/data-display/list",
	"components/data-display/qr-code",
	"components/data-display/selectable-list",
	"components/data-display/table",
	// feedback
	"components/feedback/alert",
	"components/feedback/alert-center",
	"components/feedback/empty",
	"components/feedback/progress-bar",
	"components/feedback/progress-donut",
	"components/feedback/sandbar",
	"components/feedback/skeleton",
	"components/feedback/toast",
	// forms
	"components/forms/checkbox",
	"components/forms/choice",
	"components/forms/combobox",
	"components/forms/field",
	"components/forms/input",
	"components/forms/label",
	"components/forms/multi-select",
	"components/forms/otp-input",
	"components/forms/password-input",
	"components/forms/radio-group",
	"components/forms/select",
	"components/forms/slider",
	"components/forms/switch",
	"components/forms/text-area",
	"components/forms/theme-switcher",
	// navigation
	"components/navigation/anchor",
	"components/navigation/breadcrumb",
	"components/navigation/command",
	"components/navigation/pagination",
	"components/navigation/sidebar",
	"components/navigation/tabs",
	// overlays
	"components/overlays/alert-dialog",
	"components/overlays/dialog",
	"components/overlays/dropdown-menu",
	"components/overlays/hover-card",
	"components/overlays/popover",
	"components/overlays/sheet",
	"components/overlays/tooltip",
	// preview (lifecycle namespace, not a category)
	"components/preview/calendar",
	// primitives
	"components/primitives/browser-only",
	"components/primitives/live-region",
	"components/primitives/main",
	"components/primitives/sandboxed-on-click",
	"components/primitives/skip-to-main-link",
	"components/primitives/slot",
	"components/primitives/theme",
	"components/primitives/visually-hidden",
	// structure
	"components/structure/card",
	"components/structure/media-object",
	"components/structure/separator",
	"components/structure/well",

	// hooks 🪝
	"hooks",

	// utilities
	"utils/color",
	"utils/compose-refs",
	"utils/cx",
	"utils/highlight-utils",
	"utils/in-view",
	"utils/sorting",
];

// layouts section: published page/viewport structure primitives. Add
// slugs here as they graduate (see
// decisions/2026-07-08-docs-information-architecture.md).
const layoutsPages = ["app-layout", "centered-layout"];

// recipes section: compositional how-tos spanning multiple primitives
const recipesPages = ["breadcrumbs-from-routes", "overlay-async", "route-announcer"];

// migrations section
const migrationsPages = [
	"code-block-migration",
	"data-table-action-header-migration",
	"dialog-footer-dom-order-migration",
	"priority-to-intent-migration",
];

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
		route("index.md", "./routes/$.md.tsx", { id: "docs-index-md" }),
		// /changelog.md serves the raw package CHANGELOG bytes (not the
		// MDX-roundtripped version), so it bypasses $.md.tsx.
		route("changelog.md", "./routes/changelog[.]md.tsx", { id: "changelog-md" }),
		route("changelog.mdx", "./routes/$.mdx.tsx", { id: "changelog-mdx" }),
		...docsPages.flatMap((path) => markdownAliasRoutes(path, "docs")),

		layout("./routes/doc-page.tsx", { id: "docs-doc-page" }, [
			index("./docs/index.mdx"),
			// /changelog renders app/docs/changelog.mdx, which embeds the
			// published @ngrok/mantle CHANGELOG.md.
			route("changelog", "./docs/changelog.mdx", { id: "docs-changelog" }),
			...docsPages.map((path) => docPageRoute(path, "docs")),
		]),
	]),

	// layouts layout
	layout("./routes/layouts-layout.tsx", [
		// The explicit id is load-bearing: layouts-layout.tsx matches on it to
		// keep the section index on the standard centered container.
		route("layouts", "./routes/layouts.tsx", { id: "layouts-index" }),
		...layoutsPages.flatMap((slug) => markdownAliasRoutes(`layouts/${slug}`, "layouts", slug)),
		layout(
			"./routes/doc-page.tsx",
			{ id: "layouts-doc-page" },
			layoutsPages.map((slug) => docPageRoute(`layouts/${slug}`, "layouts", slug)),
		),
	]),

	// recipes layout
	layout("./routes/recipes-layout.tsx", [
		route("recipes", "./routes/recipes.tsx"),
		...recipesPages.flatMap((slug) => markdownAliasRoutes(`recipes/${slug}`, "recipes", slug)),
		layout(
			"./routes/doc-page.tsx",
			{ id: "recipes-doc-page" },
			recipesPages.map((slug) => docPageRoute(`recipes/${slug}`, "recipes", slug)),
		),
	]),

	// migrations layout
	layout("./routes/migrations-layout.tsx", [
		route("migrations", "./routes/migrations.tsx"),
		...migrationsPages.flatMap((slug) =>
			markdownAliasRoutes(`migrations/${slug}`, "migrations", slug),
		),
		layout(
			"./routes/doc-page.tsx",
			{ id: "migrations-doc-page" },
			migrationsPages.map((slug) => docPageRoute(`migrations/${slug}`, "migrations", slug)),
		),
	]),

	// chrome-less framed example previews — the document the docs pages' iframe
	// preview frames point at. The explicit id is load-bearing: root.tsx matches
	// on it to skip the site chrome, and entry.server.tsx path-matches /preview/
	// to allow same-origin framing. Dynamic-param routes are excluded from
	// prerendering and served by the runtime SSR function.
	route("preview/:exampleName", "./routes/preview.tsx", { id: "preview-example" }),

	// The breadcrumbs-from-routes recipe demo: real nested routes under a
	// chrome-less shell, because the recipe reads `useMatches()` and
	// `location.state`, which no fixture prop can stand in for. root.tsx
	// matches the id to skip the site chrome, and react-router.config.ts keeps
	// every /preview/ path out of prerendering so the framing headers apply.
	route(
		"preview/breadcrumbs-from-routes",
		"./examples/breadcrumbs-from-routes/shell.tsx",
		{ id: "preview-breadcrumbs-from-routes" },
		[
			index("./examples/breadcrumbs-from-routes/home.tsx"),
			route("endpoints", "./examples/breadcrumbs-from-routes/endpoints.tsx"),
			// the detail is a sibling of its list, the dashboard's real shape
			route("endpoints/:endpointId", "./examples/breadcrumbs-from-routes/endpoint.tsx", [
				index("./examples/breadcrumbs-from-routes/endpoint-overview.tsx"),
				route("traffic-policy", "./examples/breadcrumbs-from-routes/endpoint-traffic-policy.tsx"),
			]),
			// a hub: URL siblings share chrome through a pathless layout
			layout("./examples/breadcrumbs-from-routes/domains-hub.tsx", [
				route("domains", "./examples/breadcrumbs-from-routes/domains.tsx"),
				route("tls-certs", "./examples/breadcrumbs-from-routes/tls-certs.tsx"),
			]),
			// a full-page detail stays out from under the hub's tabs
			route("domains/:domainId", "./examples/breadcrumbs-from-routes/domain.tsx"),
			route("apps", "./examples/breadcrumbs-from-routes/apps.tsx"),
			route("apps/:appId", "./examples/breadcrumbs-from-routes/app.tsx"),
			// a demo-only entry that lands on a domain page with an origin trail,
			// because a frame can point at a URL but not at a history entry with state
			route(
				"from-endpoint/:endpointId",
				"./examples/breadcrumbs-from-routes/arrive-from-endpoint.tsx",
			),
			// settings: a gate layout that contributes nothing, then one pathless
			// section layout per group that contributes its label
			layout("./examples/breadcrumbs-from-routes/settings-gate.tsx", [
				layout("./examples/breadcrumbs-from-routes/settings-account.tsx", [
					route("settings/general", "./examples/breadcrumbs-from-routes/settings-general.tsx"),
					route("billing", "./examples/breadcrumbs-from-routes/billing.tsx"),
				]),
				layout("./examples/breadcrumbs-from-routes/settings-identity-access.tsx", [
					route("team-members", "./examples/breadcrumbs-from-routes/team-members.tsx"),
				]),
			]),
		],
	),

	// 404 + legacy redirects — splat catch-all for any unmatched URL. Matches
	// (so ancestor loaders run) and 301s known pre-IA-reorg paths (e.g.
	// /components/button, /blocks/*) to their new homes, returning a 404
	// status for everything else, mirroring the dot-com www 404 route.
	route("*", "./routes/catch-all.tsx", { id: "catch-all" }),
] satisfies RouteConfig;
