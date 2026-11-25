import type { href } from "react-router";
import migrationGuides from "virtual:migration-guides";

type Route = Parameters<typeof href>[0];

/**
 * The component categories, alphabetical (the sidebar display order). Each
 * category is a subheading in the docs sidebar and a URL segment (see
 * {@link componentCategorySlugs}). Component docs live at
 * `/components/<category-slug>/<component-slug>`.
 *
 * Categories describe what a component *is* in the UI (an action, a form
 * control, an overlay, …). AI is the one domain category: it holds the parts
 * of an AI chat, so an app builds its assistant from one section. Page/viewport structure primitives graduate to
 * the top-level Layouts section instead. Membership tests (and their
 * precedence order for ambiguous components) live in
 * `decisions/2026-07-08-docs-information-architecture.md`.
 */
export const componentCategories = [
	"Actions",
	"AI",
	"Charts",
	"Data Display",
	"Feedback",
	"Forms",
	"Navigation",
	"Overlays",
	"Primitives",
	"Structure",
] as const;

/** One of the docs sidebar component categories. */
export type ComponentCategory = (typeof componentCategories)[number];

/** URL segment for each component category. */
export const componentCategorySlugs = {
	Actions: "actions",
	AI: "ai",
	Charts: "charts",
	"Data Display": "data-display",
	Feedback: "feedback",
	Forms: "forms",
	Navigation: "navigation",
	Overlays: "overlays",
	Primitives: "primitives",
	Structure: "structure",
} as const satisfies Record<ComponentCategory, string>;

/**
 * Production-ready components grouped by category, alphabetical within each
 * group. This is the source of truth for the docs sidebar, the command
 * palette, and the component manifest: a component missing here is
 * invisible to humans and agents alike.
 */
export const componentsByCategory = {
	Actions: ["Button", "Icon Button", "Split Button"],
	AI: [
		"Attachment",
		"Conversation",
		"Conversation Outline",
		"Message",
		"Prompt Input",
		"Reasoning",
		"Tool Call",
		"Work",
	],
	Charts: ["Area Chart", "Bar Chart", "Line Chart", "Scatter Plot"],
	"Data Display": [
		"Accordion",
		"Avatar",
		"Badge",
		"Code",
		"Code Block",
		"Data Table",
		"Description List",
		"Flag",
		"Icon",
		"Icons",
		"Kbd",
		"List",
		"Markdown",
		"QR Code",
		"Selectable List",
		"Table",
		"Truncated Text",
		"Typography",
	],
	Feedback: [
		"Alert",
		"Alert Center",
		"Empty",
		"Progress Bar",
		"Progress Donut",
		"Sandbar",
		"Skeleton",
		"Toast",
	],
	Forms: [
		"Checkbox",
		"Chip",
		"Choice",
		"Combobox",
		"Field",
		"Input",
		"Label",
		"Multi Select",
		"OTP Input",
		"Password Input",
		"Query",
		"Radio Group",
		"Segmented Control",
		"Select",
		"Slider",
		"Switch",
		"Text Area",
		"Theme Switcher",
	],
	Navigation: ["Anchor", "Breadcrumb", "Command", "Pagination", "Sidebar", "Tabs"],
	Overlays: [
		"Alert Dialog",
		"Dialog",
		"Dropdown Menu",
		"Hover Card",
		"Popover",
		"Sheet",
		"Tooltip",
	],
	Primitives: [
		"Browser Only",
		"Live Region",
		"Main",
		"Overlay Prompt",
		"SandboxedOnClick",
		"Skip to Main Link",
		"Slot",
		"Theme",
		"Visually Hidden",
	],
	// Structure: contains, divides, or arranges arbitrary content, unlike Data
	// Display, which presents specific content. Page/viewport structure
	// belongs to the top-level Layouts section, not here.
	Structure: ["Card", "Media Object", "Panel", "Separator", "Strata", "Well"],
} as const satisfies Record<ComponentCategory, readonly string[]>;

/** Display name of a production-ready component. */
export type ProdReadyComponent = (typeof componentsByCategory)[ComponentCategory][number];

/**
 * Components that are ready for production use cases, flattened from
 * {@link componentsByCategory} and sorted by display name.
 */
export const prodReadyComponents: readonly ProdReadyComponent[] = componentCategories
	.flatMap((category) => componentsByCategory[category])
	.toSorted((a, b) => a.localeCompare(b));

/**
 * Components that are still in "preview" and not recommended for production use cases yet.
 * These components are still in active development and may not be fully functional or have a complete and stable API.
 * They are exported for early feedback and testing purposes!
 */
export const previewComponents = [
	//,
	"Calendar",
	"Time Zone",
	"World Map",
] as const;

/** Route lookup for production-ready component pages. */
export const prodReadyComponentRouteLookup = {
	Accordion: "/components/data-display/accordion",
	Alert: "/components/feedback/alert",
	"Alert Center": "/components/feedback/alert-center",
	"Alert Dialog": "/components/overlays/alert-dialog",
	Anchor: "/components/navigation/anchor",
	"Area Chart": "/components/charts/area-chart",
	Attachment: "/components/ai/attachment",
	Avatar: "/components/data-display/avatar",
	Badge: "/components/data-display/badge",
	"Bar Chart": "/components/charts/bar-chart",
	Breadcrumb: "/components/navigation/breadcrumb",
	"Browser Only": "/components/primitives/browser-only",
	Button: "/components/actions/button",
	Card: "/components/structure/card",
	Checkbox: "/components/forms/checkbox",
	Chip: "/components/forms/chip",
	Choice: "/components/forms/choice",
	Code: "/components/data-display/code",
	"Code Block": "/components/data-display/code-block",
	Combobox: "/components/forms/combobox",
	Command: "/components/navigation/command",
	Conversation: "/components/ai/conversation",
	"Conversation Outline": "/components/ai/conversation-outline",
	"Data Table": "/components/data-display/data-table",
	"Description List": "/components/data-display/description-list",
	Dialog: "/components/overlays/dialog",
	"Dropdown Menu": "/components/overlays/dropdown-menu",
	Empty: "/components/feedback/empty",
	Field: "/components/forms/field",
	Flag: "/components/data-display/flag",
	"Hover Card": "/components/overlays/hover-card",
	Icon: "/components/data-display/icon",
	"Icon Button": "/components/actions/icon-button",
	Icons: "/components/data-display/icons",
	Input: "/components/forms/input",
	Kbd: "/components/data-display/kbd",
	Label: "/components/forms/label",
	"Line Chart": "/components/charts/line-chart",
	List: "/components/data-display/list",
	"Live Region": "/components/primitives/live-region",
	Main: "/components/primitives/main",
	Markdown: "/components/data-display/markdown",
	"Media Object": "/components/structure/media-object",
	Message: "/components/ai/message",
	"Multi Select": "/components/forms/multi-select",
	"OTP Input": "/components/forms/otp-input",
	"Overlay Prompt": "/components/primitives/overlay-prompt",
	Pagination: "/components/navigation/pagination",
	Panel: "/components/structure/panel",
	"Password Input": "/components/forms/password-input",
	Popover: "/components/overlays/popover",
	"Progress Bar": "/components/feedback/progress-bar",
	"Progress Donut": "/components/feedback/progress-donut",
	"Prompt Input": "/components/ai/prompt-input",
	"QR Code": "/components/data-display/qr-code",
	Query: "/components/forms/query",
	"Radio Group": "/components/forms/radio-group",
	Reasoning: "/components/ai/reasoning",
	Sandbar: "/components/feedback/sandbar",
	SandboxedOnClick: "/components/primitives/sandboxed-on-click",
	"Scatter Plot": "/components/charts/scatter-plot",
	"Segmented Control": "/components/forms/segmented-control",
	Select: "/components/forms/select",
	"Selectable List": "/components/data-display/selectable-list",
	Separator: "/components/structure/separator",
	Sheet: "/components/overlays/sheet",
	Sidebar: "/components/navigation/sidebar",
	Skeleton: "/components/feedback/skeleton",
	"Skip to Main Link": "/components/primitives/skip-to-main-link",
	Slider: "/components/forms/slider",
	Slot: "/components/primitives/slot",
	"Split Button": "/components/actions/split-button",
	Strata: "/components/structure/strata",
	Switch: "/components/forms/switch",
	Table: "/components/data-display/table",
	Tabs: "/components/navigation/tabs",
	"Text Area": "/components/forms/text-area",
	Theme: "/components/primitives/theme",
	"Theme Switcher": "/components/forms/theme-switcher",
	Toast: "/components/feedback/toast",
	"Tool Call": "/components/ai/tool-call",
	Tooltip: "/components/overlays/tooltip",
	"Truncated Text": "/components/data-display/truncated-text",
	Typography: "/components/data-display/typography",
	"Visually Hidden": "/components/primitives/visually-hidden",
	Well: "/components/structure/well",
	Work: "/components/ai/work",
} as const satisfies Record<ProdReadyComponent, Route>;

/** Route lookup for preview component pages. */
export const previewComponentsRouteLookup = {
	Calendar: "/components/preview/calendar",
	"Time Zone": "/components/preview/time-zone",
	"World Map": "/components/preview/world-map",
} as const satisfies Record<(typeof previewComponents)[number], Route>;

/**
 * Category lookup for preview components. Preview pages live under the
 * `/components/preview/` URL namespace (lifecycle, not category), but each
 * still belongs to a category in the manifest so agents can group them.
 */
export const previewComponentCategoryLookup = {
	Calendar: "Forms",
	"Time Zone": "Primitives",
	"World Map": "Charts",
} as const satisfies Record<(typeof previewComponents)[number], ComponentCategory>;

/** Welcome section pages. */
export const welcomePages = [
	"Overview & Setup",
	"Philosophy",
	"Accessibility",
	"Browser Translation",
	"Vite Plugins",
	"For AI Agents",
	"Changelog",
] as const;

/** Route lookup for welcome pages. */
export const welcomeRoutes = {
	"Overview & Setup": "/",
	Philosophy: "/philosophy",
	Accessibility: "/accessibility",
	"Browser Translation": "/browser-translation",
	"Vite Plugins": "/vite-plugins",
	"For AI Agents": "/for-ai-agents",
	Changelog: "/changelog",
} as const satisfies Record<(typeof welcomePages)[number], Route>;

/** Base/design token pages. */
export const basePages = [
	//,
	"Breakpoints",
	"Colors",
	"Design Principles",
	"Focus Ring",
	"Hit Area",
	"Scroll Fade",
	"Shadows",
	"Stacking Layers",
	"Tailwind Variants",
	"Typography",
] as const;

/** Route lookup for base pages. */
export const baseRoutes = {
	Breakpoints: "/base/breakpoints",
	Colors: "/base/colors",
	"Design Principles": "/base/design-principles",
	"Focus Ring": "/base/focus-ring",
	"Hit Area": "/base/hit-area",
	"Scroll Fade": "/base/scroll-fade",
	Shadows: "/base/shadows",
	"Stacking Layers": "/base/stacking-layers",
	"Tailwind Variants": "/base/tailwind-variants",
	Typography: "/base/typography",
} as const satisfies Record<(typeof basePages)[number], Route>;

/** Hooks page route. */
export const hooksRoute = "/hooks" as const satisfies Route;

/** Utility pages. */
export const utilsPages = [
	//,
	"cx",
	"color",
	"composeRefs",
	"highlight-utils",
	"inView",
	"query-filter",
	"sorting",
] as const;

/** Route lookup for utility pages. */
export const utilsRoutes = {
	cx: "/utils/cx",
	color: "/utils/color",
	composeRefs: "/utils/compose-refs",
	"highlight-utils": "/utils/highlight-utils",
	inView: "/utils/in-view",
	"query-filter": "/utils/query-filter",
	sorting: "/utils/sorting",
} as const satisfies Record<(typeof utilsPages)[number], Route>;

/**
 * Layout pages: published primitives that own page/viewport structure and
 * regions (app shells, centered flows, …). Residents land here as they
 * graduate from app-side incubation (see
 * decisions/2026-07-08-docs-information-architecture.md).
 */
export const layoutPages = [
	//,
	"App Layout",
	"Centered Layout",
] as const;

/** Route lookup for layout pages. */
export const layoutRoutes = {
	"App Layout": "/layouts/app-layout",
	"Centered Layout": "/layouts/centered-layout",
} as const satisfies Record<(typeof layoutPages)[number], Route>;

/** Short descriptions for the layouts index page. */
export const layoutDescriptions = {
	"App Layout":
		"A viewport-locked application shell: a full-width notice strip, a toolbar header, and a rounded content card whose page region is the only scroll container. It composes with the Sidebar but stays decoupled from it.",
	"Centered Layout":
		"A viewport-filling centered page flow (brand mark, centered content, and a pinned utility footer) for sign-in, onboarding, 404, and other focused full-page states.",
} as const satisfies Record<(typeof layoutPages)[number], string>;

/**
 * Recipe pages: compositional how-tos that wire multiple mantle primitives
 * together with state, data, or routing (e.g. a floating overlay driven by
 * async data with loading and error states). Recipes are documentation, not
 * published API: they transcend any single component or layout.
 */
export const recipePages = [
	//,
	"Assistant Across Routes",
	"Breadcrumbs from Routes",
	"Cancel and Submit Actions",
	"Chat",
	"Filter from a Value",
	"Header Actions from Routes",
	"List Page Loading States",
	"Overlays + Async Data",
	"Query from the URL",
	"Route Announcer",
	"Sparklines in a List",
] as const;

/**
 * Recipe proposals: recipes with an open design question. They are not yet a
 * recommended pattern; each page states what is still open.
 */
export const proposalRecipePages = [
	//,
	"Natural Language Query",
] as const;

type RecipePage = (typeof recipePages)[number] | (typeof proposalRecipePages)[number];

/** Route lookup for recipe pages. */
export const recipeRoutes = {
	"Assistant Across Routes": "/recipes/assistant-across-routes",
	"Breadcrumbs from Routes": "/recipes/breadcrumbs-from-routes",
	"Cancel and Submit Actions": "/recipes/cancel-and-submit",
	Chat: "/recipes/chat",
	"Filter from a Value": "/recipes/filter-from-a-value",
	"Header Actions from Routes": "/recipes/header-actions-from-routes",
	"List Page Loading States": "/recipes/list-page-loading-states",
	"Natural Language Query": "/recipes/natural-language-query",
	"Overlays + Async Data": "/recipes/overlay-async",
	"Query from the URL": "/recipes/query-from-the-url",
	"Route Announcer": "/recipes/route-announcer",
	"Sparklines in a List": "/recipes/sparklines-in-a-list",
} as const satisfies Record<RecipePage, Route>;

/** Short descriptions for recipe index pages. */
export const recipeDescriptions = {
	"Assistant Across Routes":
		"Render an assistant in main on its own route and in the AppLayout side panel on every other route, with one conversation above both and a 300ms View Transition that morphs the page into the panel.",
	"Breadcrumbs from Routes":
		"Derive a breadcrumb trail from the matched route chain with React Router route handles \u2014 derived state, so it is correct on the server and on the first frame, with no context and no effects.",
	"Cancel and Submit Actions":
		"Where a form's Cancel and submit buttons go: one actions row below its Strata sections of Field rows. Switch to a Sandbar when the form edits saved settings.",
	Chat: "Compose the AI chat parts into a full assistant: a composer with files, a model picker, and dictation, a transcript that follows a streaming Markdown answer with its reasoning and tool calls, and stop, retry, an empty state, and a failure notice.",
	"Filter from a Value":
		"Turn a value in a table row into a Query filter with one click, and take it out with a second click. One pure function, toggleFacet, does the edit.",
	"Header Actions from Routes":
		"Put each route's actions in the app header's actions slot from a React Router route handle. The deepest route wins, the server renders them, and below the mobile breakpoint they collapse into one menu.",
	"List Page Loading States":
		"Render a list page's header, filters, and column headers on the first frame, then fill the table with skeleton rows that match the loaded rows, so nothing shifts when the data lands.",
	"Natural Language Query":
		"Let people describe a filter in plain words, and turn the words into a Query filter on Enter through ngrok.ai gateway inference, with a mock translator, a refusal check, and Revert.",
	"Overlays + Async Data":
		"Open a Sheet, Dialog, or Alert Dialog immediately, then swap the body between pending, loaded, 404, and 500 states with TanStack Query.",
	"Query from the URL":
		"Keep the text of a Query field in the ?q= URL param, so a filtered list is shareable by its URL. One small hook for React Router, and the same hook with nuqs.",
	"Route Announcer":
		"Announce completed client-side navigations to screen readers by pairing a persistent LiveRegion with React Router's location, with page-name fallbacks and repeat-message handling.",
	"Sparklines in a List":
		"Put two BarChart sparklines in every row of a DataTable: sized for a row, named for the row, with a compact total beside each one, and dormant until a reader scrolls to it.",
} as const satisfies Record<RecipePage, string>;

/**
 * A migration guide. The index page, the sidebar, and the legacy redirects
 * all read from this record.
 */
export type Migration = {
	/**
	 * The guide's publish-order number, or `null` before the guide ships. The
	 * release stamps it into the guide's frontmatter, and a guide keeps it forever.
	 */
	number: number | null;
	/**
	 * The URL slug without a number prefix. Guides 1 to 35 also shipped at
	 * `/migrations/<slug>` before they carried a number, so this is the source
	 * of each one's legacy redirect.
	 */
	slug: string;
	/** The short name the index page and the sidebar show. */
	title: string;
	/** The one-sentence summary the index page shows under the title. */
	description: string;
	/** The canonical docs route: `/migrations/<file name>`. */
	route: `/migrations/${string}`;
};

/**
 * Format a migration number as the four-digit badge text, or `Unreleased`
 * before the guide ships.
 *
 * @example
 * formatMigrationNumber(6); // "0006"
 * formatMigrationNumber(null); // "Unreleased"
 */
export function formatMigrationNumber(number: number | null): string {
	return number == null ? "Unreleased" : String(number).padStart(4, "0");
}

/**
 * Migration guides, one for each `app/docs/migrations/<name>.mdx`, read from
 * its frontmatter. A new guide needs no entry here.
 */
export const migrations: readonly Migration[] = migrationGuides.map((guide) => ({
	number: guide.number,
	slug: guide.name.replace(/^\d{4}-/, ""),
	title: guide.title.replace(/ Migration$/, ""),
	description: guide.description,
	route: `/migrations/${guide.name}`,
}));

/**
 * Migration guides, newest first: the order the index page and the sidebar
 * show. Unreleased guides come first, in file-name order.
 */
export const migrationsNewestFirst: readonly Migration[] = migrations.toSorted(
	(a, b) => (b.number ?? Number.MAX_SAFE_INTEGER) - (a.number ?? Number.MAX_SAFE_INTEGER),
);
