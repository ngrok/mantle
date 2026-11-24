import type { href } from "react-router";

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
	AI: ["Attachment", "Conversation", "Message", "Prompt Input", "Reasoning", "Tool Call"],
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
	Structure: ["Card", "Media Object", "Separator", "Strata", "Well"],
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
	Choice: "/components/forms/choice",
	Code: "/components/data-display/code",
	"Code Block": "/components/data-display/code-block",
	Combobox: "/components/forms/combobox",
	Command: "/components/navigation/command",
	Conversation: "/components/ai/conversation",
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
	 * The guide's publish-order number. A guide keeps its number forever, and no
	 * later guide takes it. It is the four-digit prefix of `route` and of the
	 * MDX file name.
	 */
	number: number;
	/**
	 * The URL slug without the number prefix. The guides shipped at
	 * `/migrations/<slug>` before they carried a number, so this is the source
	 * of each guide's legacy redirect.
	 */
	slug: string;
	/** The short name the index page and the sidebar show. */
	title: string;
	/** The one-sentence summary the index page shows under the title. */
	description: string;
	/** The canonical docs route: `/migrations/<number>-<slug>`. */
	route: Route;
};

/**
 * Zero-pad a migration number to the four digits its URL slug carries.
 *
 * @example
 * formatMigrationNumber(6); // "0006"
 */
export function formatMigrationNumber(number: number): string {
	return String(number).padStart(4, "0");
}

/**
 * Migration guides in publish order, oldest first. Add a new guide at the end
 * with the next number. Its MDX file lives at
 * `app/docs/migrations/<number>-<slug>.mdx` and its slug is also listed in
 * `app/routes.ts`.
 */
export const migrations = [
	{
		number: 1,
		slug: "code-block-migration",
		title: "CodeBlock",
		description: "Migrate from PrismJS-powered code blocks to mantle's Shiki-powered CodeBlock.",
		route: "/migrations/0001-code-block-migration",
	},
	{
		number: 2,
		slug: "data-table-action-header-migration",
		title: "DataTable Action Column",
		description:
			"Switch a pinned action column's header to DataTable.ActionHeader so it stays aligned on horizontal scroll.",
		route: "/migrations/0002-data-table-action-header-migration",
	},
	{
		number: 3,
		slug: "dialog-footer-dom-order-migration",
		title: "Dialog.Footer DOM Order",
		description:
			"Dialog.Footer now renders children in DOM order. Reverse footer children to preserve their layout.",
		route: "/migrations/0003-dialog-footer-dom-order-migration",
	},
	{
		number: 4,
		slug: "priority-to-intent-migration",
		title: "Priority → Intent",
		description:
			"priority is now intent across Button, Alert, AlertDialog, and Toast. Button and IconButton also require explicit appearance and intent.",
		route: "/migrations/0004-priority-to-intent-migration",
	},
	{
		number: 5,
		slug: "field-item-owns-control-id-migration",
		title: "Field.Item Control Id",
		description:
			"Field.Item owns the control id: move a child id to Field.Item, drop htmlFor from Field.Label, and update PasswordInput toggle selectors.",
		route: "/migrations/0005-field-item-owns-control-id-migration",
	},
	{
		number: 6,
		slug: "data-table-tanstack-v9-migration",
		title: "DataTable TanStack Table v9",
		description:
			"Move a DataTable from TanStack Table v8 to v9: useTable with a features object, columnHelper.columns, sortFn, and table.state.",
		route: "/migrations/0006-data-table-tanstack-v9-migration",
	},
	{
		number: 7,
		slug: "app-layout-header-slots-migration",
		title: "App Layout Header Slots",
		description:
			"Compose AppLayout.Header from its three slots, let AppLayout.Body be the main landmark, and render the header in every route instead of the shell.",
		route: "/migrations/0007-app-layout-header-slots-migration",
	},
	{
		number: 8,
		slug: "tabs-separator-migration",
		title: "Tabs Separator",
		description:
			"Tabs.List no longer draws a border: compose Tabs.Separator after the list, delete hideBorder, and set --tabs-gap instead of a gap-* class on Tabs.Root.",
		route: "/migrations/0008-tabs-separator-migration",
	},
	{
		number: 9,
		slug: "chart-root-mode-migration",
		title: "Chart Root Mode",
		description:
			'The chart Roots take mode in place of the decorative boolean: rewrite decorative to mode="decorative", and move sparklines to mode="static".',
		route: "/migrations/0009-chart-root-mode-migration",
	},
	{
		number: 10,
		slug: "button-icon-swap-migration",
		title: "Button Icon Swap",
		description:
			"The Button and IconButton icon now sits inside a span. Replace a [&>svg] selector on the button with [&_svg], or size the icon element itself.",
		route: "/migrations/0010-button-icon-swap-migration",
	},
	{
		number: 11,
		slug: "eliminate-high-contrast-migration",
		title: "Eliminate High Contrast",
		description:
			"The high-contrast themes, stylesheets, and variants are gone, MantleStyleSheets takes only darkCssUrl, and ThemeSwitcher is one light/dark toggle.",
		route: "/migrations/0011-eliminate-high-contrast-migration",
	},
	{
		number: 12,
		slug: "single-stylesheet-migration",
		title: "Single Stylesheet",
		description:
			"mantle.css holds both themes, so mantle-dark.css, MantleStyleSheets, and mantleStyleSheetUrls are gone.",
		route: "/migrations/0012-single-stylesheet-migration",
	},
	{
		number: 13,
		slug: "chart-svg-renderer-migration",
		title: "Chart SVG Renderer",
		description:
			"Bar, Line, and Area charts paint an svg instead of a canvas. Update selectors and tests that read the canvas.",
		route: "/migrations/0013-chart-svg-renderer-migration",
	},
	{
		number: 14,
		slug: "chart-named-colors-migration",
		title: "Chart Named Colors",
		description:
			"Every chart series names its color with a mantle color name, the same names Badge takes. The chart-1 to chart-8 tokens, chart-other, and seriesSlot are gone, and color is required.",
		route: "/migrations/0014-chart-named-colors-migration",
	},
	{
		number: 15,
		slug: "segmented-control-migration",
		title: "Segmented Control",
		description:
			"RadioGroup.ButtonGroup and RadioGroup.Button are gone. Use SegmentedControl.Root and SegmentedControl.Item from @ngrok/mantle/segmented-control.",
		route: "/migrations/0015-segmented-control-migration",
	},
	{
		number: 16,
		slug: "side-panel-lane-collapsed-migration",
		title: "Side Panel Lane Collapsed",
		description:
			"The theme token --container-side-panel-lane-icon-rail is now --container-side-panel-lane-collapsed. Rename it where you set it or read it.",
		route: "/migrations/0016-side-panel-lane-collapsed-migration",
	},
	{
		number: 17,
		slug: "select-owned-behavior-migration",
		title: "Select Owned Behavior",
		description:
			"Select no longer uses Radix Select. Select.Content drops its positioning props and Radix handlers, and the --radix-select-* CSS variables are gone.",
		route: "/migrations/0017-select-owned-behavior-migration",
	},
	{
		number: 18,
		slug: "combobox-owned-behavior-migration",
		title: "Combobox Owned Behavior",
		description:
			"Combobox no longer uses Ariakit. Its parts take a fixed set of props, Combobox.Content portals, and the highlighted item carries data-highlighted.",
		route: "/migrations/0018-combobox-owned-behavior-migration",
	},
	{
		number: 19,
		slug: "multi-select-owned-behavior-migration",
		title: "MultiSelect Owned Behavior",
		description:
			"MultiSelect no longer uses Ariakit. Its parts take a fixed set of props, the list portals into the layer container, and the highlighted item carries data-highlighted.",
		route: "/migrations/0019-multi-select-owned-behavior-migration",
	},
	{
		number: 20,
		slug: "native-floats-migration",
		title: "Native Floats",
		description:
			"Popover, Tooltip, and HoverCard are native popovers in the top layer. The Radix positioning props, Popover.Root modal, and HoverCard.Portal are gone, and --anchor-width and --available-height replace the Radix CSS variables.",
		route: "/migrations/0020-native-floats-migration",
	},
	{
		number: 21,
		slug: "native-radio-group-migration",
		title: "Native Radio Group",
		description:
			"RadioGroup and SegmentedControl items are now a label around a native radio. Style item state with has-[>input:checked], has-[>input:disabled], and has-[>input:focus-visible] in place of aria-checked, aria-disabled, and focus-visible.",
		route: "/migrations/0021-native-radio-group-migration",
	},
	{
		number: 22,
		slug: "alert-center-server-render-migration",
		title: "Alert Center Server Render",
		description:
			"AlertCenter items now render their children on the server, and the top item shows in the server HTML. Gate items and children that only the browser can decide with useIsHydrated, and prefetch the alert data in the root loader.",
		route: "/migrations/0022-alert-center-server-render-migration",
	},
	{
		number: 23,
		slug: "tabs-owned-behavior-migration",
		title: "Tabs Owned Behavior",
		description:
			"Tabs and the CodeBlock tabs no longer use Radix. A Radix Tabs part inside a mantle Tabs.Root has no context and throws. Use Tabs.Trigger instead.",
		route: "/migrations/0023-tabs-owned-behavior-migration",
	},
	{
		number: 24,
		slug: "command-owned-behavior-migration",
		title: "Command Owned Behavior",
		description:
			"Command no longer uses cmdk. Its parts drop the cmdk-* attributes for data-slot, a filtered item stays mounted with hidden, and groups sort by their best match.",
		route: "/migrations/0024-command-owned-behavior-migration",
	},
	{
		number: 25,
		slug: "stone-palette-migration",
		title: "Stone Palette",
		description:
			"mantle.css no longer has the stone palette, so stone classes make no CSS. Use gray, or set the stone stops you need in your own @theme block.",
		route: "/migrations/0025-stone-palette-migration",
	},
	{
		number: 26,
		slug: "native-dropdown-menu-migration",
		title: "Native Dropdown Menu",
		description:
			"DropdownMenu is built on native popovers in the top layer. The Radix positioning props are gone, --anchor-width and --available-height replace the Radix CSS variables, and a menu is not modal by default.",
		route: "/migrations/0026-native-dropdown-menu-migration",
	},
	{
		number: 27,
		slug: "native-dialog-migration",
		title: "Native Dialog",
		description:
			"Dialog, AlertDialog, and Sheet render the browser's modal <dialog> in place of Radix Dialog. Set modal={false} on an overlay that holds a third-party frame, and read the backdrop and the panel from their new elements.",
		route: "/migrations/0027-native-dialog-migration",
	},
	{
		number: 28,
		slug: "native-slider-migration",
		title: "Native Slider",
		description:
			"Each Slider thumb is now a native range input inside the thumb span. Target the input for focus, keys, ids, and test queries, and expect a disabled slider to submit no value.",
		route: "/migrations/0028-native-slider-migration",
	},
	{
		number: 29,
		slug: "data-attribute-contract-migration",
		title: "Data Attribute Contract",
		description:
			"Mantle's data attributes follow one small contract. Triggers, tabs, options, and checkable items use ARIA state, a boolean state is a presence attribute such as data-open, and mantle.css registers no data-* variants, so style with Tailwind's built-in forms.",
		route: "/migrations/0029-data-attribute-contract-migration",
	},
	{
		number: 30,
		slug: "between-variant-migration",
		title: "Between Variant",
		description:
			"Mantle's parts space and divide their children with the new between: variant, not space-* or divide-*. Write an override on those parts with between: too, such as between:border-b-0 on Accordion.Root.",
		route: "/migrations/0030-between-variant-migration",
	},
	{
		number: 31,
		slug: "anchored-child-variant-migration",
		title: "Anchored Child Variant",
		description:
			"Mantle's parts style their children with arbitrary variants such as [&>*]:, not *: or **:. Write an override of those styles with the same arbitrary variant, such as [&>:first-child]:size-9 on Sidebar.SwitcherTrigger.",
		route: "/migrations/0031-anchored-child-variant-migration",
	},
	{
		number: 32,
		slug: "query-filter-operators-migration",
		title: "Query Filter Operators",
		description:
			"The query-filter language now reads NOT, !, parentheses, and typed comparisons. Handle the new token kinds, and narrow a key before you call its matches.",
		route: "/migrations/0032-query-filter-operators-migration",
	},
] as const satisfies readonly Migration[];

/** Migration guides, newest first: the order the index page and the sidebar show. */
export const migrationsNewestFirst: readonly Migration[] = migrations.toSorted(
	(a, b) => b.number - a.number,
);
