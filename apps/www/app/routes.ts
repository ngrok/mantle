import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

// Helper to create doc routes (handles both /path and /path.md URLs)
function docRoute(path: string) {
	const id = `docs-${path.replace(/\//g, "-")}`;
	return [
		route(path, "./routes/$.tsx", { id }),
		route(`${path}.md`, "./routes/$.md.tsx", { id: `${id}-md` }),
	];
}

export default [
	route("robots.txt", "./routes/robots[.]txt.tsx", { id: "robots-txt" }),
	route("sitemap.xml", "./routes/sitemap[.]xml.tsx", { id: "sitemap-xml" }),
	route("api/shiki-highlight", "./routes/api.shiki-highlight.tsx"),
	route("prototype/sidebar", "./routes/prototype.sidebar.tsx"),

	// docs layout
	layout("./routes/docs-layout.tsx", [
		index("./routes/_index.tsx"),
		route("index.md", "./routes/$.md.tsx", { id: "docs-index-md" }),

		// MDX docs: auto-discovers docs from app/docs/**/*.mdx
		// Handles both /path and /path.md URLs (returns HTML or raw markdown respectively)

		// core/base top-level pages
		...docRoute("philosophy"),
		...docRoute("base/breakpoints"),
		...docRoute("base/colors"),
		...docRoute("base/shadows"),
		...docRoute("base/tailwind-variants"),
		...docRoute("base/typography"),

		// component docs
		...docRoute("components/alert-dialog"),
		...docRoute("components/alert"),
		...docRoute("components/anchor"),
		...docRoute("components/badge"),
		...docRoute("components/browser-only"),
		...docRoute("components/button"),
		...docRoute("components/card"),
		...docRoute("components/checkbox"),
		...docRoute("components/code-block"),
		...docRoute("components/code"),
		...docRoute("components/combobox"),
		...docRoute("components/command"),
		...docRoute("components/data-table"),
		...docRoute("components/description-list"),
		...docRoute("components/dialog"),
		...docRoute("components/dropdown-menu"),
		...docRoute("components/empty"),
		...docRoute("components/flag"),
		...docRoute("components/hover-card"),
		...docRoute("components/icon-button"),
		...docRoute("components/icon"),
		...docRoute("components/icons"),
		...docRoute("components/input"),
		...docRoute("components/kbd"),
		...docRoute("components/label"),
		...docRoute("components/main"),
		...docRoute("components/media-object"),
		...docRoute("components/multi-select"),
		...docRoute("components/pagination"),
		...docRoute("components/password-input"),
		...docRoute("components/popover"),
		...docRoute("components/preview/accordion"),
		...docRoute("components/preview/calendar"),
		...docRoute("components/preview/sidebar"),
		...docRoute("components/progress-bar"),
		...docRoute("components/progress-donut"),
		...docRoute("components/radio-group"),
		...docRoute("components/sandboxed-on-click"),
		...docRoute("components/select"),
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

		// hooks 🪝
		...docRoute("hooks"),

		// utilities
		...docRoute("utils/color"),
		...docRoute("utils/compose-refs"),
		...docRoute("utils/cx"),
		...docRoute("utils/in-view"),
		...docRoute("utils/sorting"),
	]),

	// blocks layout
	layout("./routes/blocks-layout.tsx", [route("blocks", "./routes/blocks.tsx")]),
] satisfies RouteConfig;
