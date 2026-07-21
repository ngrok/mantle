import type { href } from "react-router";

type Route = Parameters<typeof href>[0];

/**
 * The component categories, alphabetical (the sidebar display order). Each
 * category is a subheading in the docs sidebar and a URL segment (see
 * {@link componentCategorySlugs}) — component docs live at
 * `/components/<category-slug>/<component-slug>`.
 *
 * Categories describe what a component *is* in the UI (an action, a form
 * control, an overlay, …). Page/viewport structure primitives graduate to
 * the top-level Layouts section instead. Membership tests (and their
 * precedence order for ambiguous components) live in
 * `decisions/2026-07-08-docs-information-architecture.md`.
 */
export const componentCategories = [
	"Actions",
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
 * palette, and the component manifest — a component missing here is
 * invisible to humans and agents alike.
 */
export const componentsByCategory = {
	Actions: ["Button", "Icon Button", "Split Button"],
	"Data Display": [
		"Accordion",
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
		"QR Code",
		"Selectable List",
		"Table",
	],
	Feedback: ["Alert", "Empty", "Power Bar", "Progress Bar", "Progress Donut", "Skeleton", "Toast"],
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
		"Radio Group",
		"Select",
		"Slider",
		"Switch",
		"Text Area",
		"Theme Switcher",
	],
	Navigation: ["Anchor", "Breadcrumb", "Command", "Pagination", "Tabs"],
	Overlays: [
		"Alert Dialog",
		"Dialog",
		"Dropdown Menu",
		"Hover Card",
		"Popover",
		"Sheet",
		"Tooltip",
	],
	Primitives: ["Browser Only", "Main", "SandboxedOnClick", "Skip to Main Link", "Slot", "Theme"],
	// Structure: contains, divides, or arranges arbitrary content — vs Data
	// Display, which presents specific content. Page/viewport structure
	// belongs to the top-level Layouts section, not here.
	Structure: ["Card", "Media Object", "Separator", "Well"],
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
] as const;

/** Route lookup for production-ready component pages. */
export const prodReadyComponentRouteLookup = {
	Accordion: "/components/data-display/accordion",
	Alert: "/components/feedback/alert",
	"Alert Dialog": "/components/overlays/alert-dialog",
	Anchor: "/components/navigation/anchor",
	Badge: "/components/data-display/badge",
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
	"Data Table": "/components/data-display/data-table",
	"Description List": "/components/data-display/description-list",
	Dialog: "/components/overlays/dialog",
	"Dropdown Menu": "/components/overlays/dropdown-menu",
	Empty: "/components/feedback/empty",
	Field: "/components/forms/field",
	Flag: "/components/data-display/flag",
	"Hover Card": "/components/overlays/hover-card",
	Icon: "/components/data-display/icon",
	Icons: "/components/data-display/icons",
	"Icon Button": "/components/actions/icon-button",
	Input: "/components/forms/input",
	Kbd: "/components/data-display/kbd",
	Label: "/components/forms/label",
	List: "/components/data-display/list",
	Main: "/components/primitives/main",
	"Media Object": "/components/structure/media-object",
	"Multi Select": "/components/forms/multi-select",
	"OTP Input": "/components/forms/otp-input",
	Pagination: "/components/navigation/pagination",
	"Password Input": "/components/forms/password-input",
	Popover: "/components/overlays/popover",
	"Power Bar": "/components/feedback/power-bar",
	"Progress Donut": "/components/feedback/progress-donut",
	"Progress Bar": "/components/feedback/progress-bar",
	"QR Code": "/components/data-display/qr-code",
	"Radio Group": "/components/forms/radio-group",
	SandboxedOnClick: "/components/primitives/sandboxed-on-click",
	Select: "/components/forms/select",
	"Selectable List": "/components/data-display/selectable-list",
	Separator: "/components/structure/separator",
	Sheet: "/components/overlays/sheet",
	Skeleton: "/components/feedback/skeleton",
	"Skip to Main Link": "/components/primitives/skip-to-main-link",
	Slider: "/components/forms/slider",
	Slot: "/components/primitives/slot",
	"Split Button": "/components/actions/split-button",
	Switch: "/components/forms/switch",
	Table: "/components/data-display/table",
	Tabs: "/components/navigation/tabs",
	"Text Area": "/components/forms/text-area",
	Theme: "/components/primitives/theme",
	"Theme Switcher": "/components/forms/theme-switcher",
	Toast: "/components/feedback/toast",
	Tooltip: "/components/overlays/tooltip",
	Well: "/components/structure/well",
} as const satisfies Record<ProdReadyComponent, Route>;

/** Route lookup for preview component pages. */
export const previewComponentsRouteLookup = {
	Calendar: "/components/preview/calendar",
} as const satisfies Record<(typeof previewComponents)[number], Route>;

/**
 * Category lookup for preview components. Preview pages live under the
 * `/components/preview/` URL namespace (lifecycle, not category), but each
 * still belongs to a category in the manifest so agents can group them.
 */
export const previewComponentCategoryLookup = {
	Calendar: "Forms",
} as const satisfies Record<(typeof previewComponents)[number], ComponentCategory>;

/** Welcome section pages. */
export const welcomePages = [
	"Overview & Setup",
	"Philosophy",
	"Accessibility",
	"For AI Agents",
	"Changelog",
] as const;

/** Route lookup for welcome pages. */
export const welcomeRoutes = {
	"Overview & Setup": "/",
	Philosophy: "/philosophy",
	Accessibility: "/accessibility",
	"For AI Agents": "/for-ai-agents",
	Changelog: "/changelog",
} as const satisfies Record<(typeof welcomePages)[number], Route>;

/** Base/design token pages. */
export const basePages = [
	//,
	"Breakpoints",
	"Colors",
	"Scroll Fade",
	"Shadows",
	"Tailwind Variants",
	"Typography",
] as const;

/** Route lookup for base pages. */
export const baseRoutes = {
	Breakpoints: "/base/breakpoints",
	Colors: "/base/colors",
	"Scroll Fade": "/base/scroll-fade",
	Shadows: "/base/shadows",
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
	"sorting",
] as const;

/** Route lookup for utility pages. */
export const utilsRoutes = {
	cx: "/utils/cx",
	color: "/utils/color",
	composeRefs: "/utils/compose-refs",
	"highlight-utils": "/utils/highlight-utils",
	inView: "/utils/in-view",
	sorting: "/utils/sorting",
} as const satisfies Record<(typeof utilsPages)[number], Route>;

/**
 * Layout pages — published primitives that own page/viewport structure and
 * regions (app shells, centered flows, …). Residents land here as they
 * graduate from app-side incubation (see
 * decisions/2026-07-08-docs-information-architecture.md).
 */
export const layoutPages = [
	//,
	"Centered Layout",
] as const;

/** Route lookup for layout pages. */
export const layoutRoutes = {
	"Centered Layout": "/layouts/centered-layout",
} as const satisfies Record<(typeof layoutPages)[number], Route>;

/** Short descriptions for the layouts index page. */
export const layoutDescriptions = {
	"Centered Layout":
		"A viewport-filling centered page flow — brand mark, centered content, and a pinned utility footer — for sign-in, onboarding, 404, and other focused full-page states.",
} as const satisfies Record<(typeof layoutPages)[number], string>;

/**
 * Recipe pages — compositional how-tos that wire multiple mantle primitives
 * together with state, data, or routing (e.g. a floating overlay driven by
 * async data with loading and error states). Recipes are documentation, not
 * published API: they transcend any single component or layout.
 */
export const recipePages = [
	//,
	"Overlays + Async Data",
] as const;

/** Route lookup for recipe pages. */
export const recipeRoutes = {
	"Overlays + Async Data": "/recipes/overlay-async",
} as const satisfies Record<(typeof recipePages)[number], Route>;

/** Short descriptions for recipe index pages. */
export const recipeDescriptions = {
	"Overlays + Async Data":
		"Open a Sheet, Dialog, or Alert Dialog immediately, then swap the body between pending, loaded, 404, and 500 states with TanStack Query.",
} as const satisfies Record<(typeof recipePages)[number], string>;

/** Migration guide pages. */
export const migrationPages = [
	//,
	"CodeBlock",
	"DataTable Action Column",
	"Dialog.Footer DOM Order",
	"Priority → Intent",
] as const;

/** Route lookup for migration guide pages. */
export const migrationRoutes = {
	CodeBlock: "/migrations/code-block-migration",
	"DataTable Action Column": "/migrations/data-table-action-header-migration",
	"Dialog.Footer DOM Order": "/migrations/dialog-footer-dom-order-migration",
	"Priority → Intent": "/migrations/priority-to-intent-migration",
} as const satisfies Record<(typeof migrationPages)[number], Route>;

/** Short descriptions for the migration guide index page. */
export const migrationDescriptions = {
	CodeBlock: "Migrate from PrismJS-powered code blocks to mantle's Shiki-powered CodeBlock.",
	"DataTable Action Column":
		"Switch a pinned action column's header to DataTable.ActionHeader so it stays aligned on horizontal scroll.",
	"Dialog.Footer DOM Order":
		"Dialog.Footer now renders children in DOM order — reverse footer children to preserve their layout.",
	"Priority → Intent":
		"priority is now intent across Button, Alert, AlertDialog, and Toast — and Button and IconButton require explicit appearance and intent.",
} as const satisfies Record<(typeof migrationPages)[number], string>;

/**
 * Override map for components whose docs URL slug does not match their
 * package import subpath. For example, "Icon Button" is documented at
 * /components/actions/icon-button but is exported from `@ngrok/mantle/button`
 * (alongside `Button`). Used by the manifest builder to emit correct
 * `importPath` values in /api/components.json.
 *
 * Keys are docs routes (with leading slash). Values are the canonical
 * `@ngrok/mantle/*` import subpath where the component is actually exported.
 */
export const componentImportPathOverrides = {
	"/components/actions/icon-button": "@ngrok/mantle/button",
	"/components/forms/password-input": "@ngrok/mantle/input",
	"/components/feedback/progress-bar": "@ngrok/mantle/progress",
	"/components/feedback/progress-donut": "@ngrok/mantle/progress",
} as const satisfies Record<string, string>;
