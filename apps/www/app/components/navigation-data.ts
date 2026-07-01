import type { href } from "react-router";

type Route = Parameters<typeof href>[0];

/**
 * Components that are ready for production use cases.
 */
export const prodReadyComponents = [
	"Accordion",
	"Alert Dialog",
	"Alert",
	"Anchor",
	"Badge",
	"Browser Only",
	"Button",
	"Card",
	"Checkbox",
	"Choice",
	"Code Block",
	"Code",
	"Combobox",
	"Command",
	"Data Table",
	"Description List",
	"Dialog",
	"Dropdown Menu",
	"Empty",
	"Field",
	"Flag",
	"Hover Card",
	"Icon Button",
	"Icon",
	"Icons",
	"Input",
	"Label",
	"Main",
	"Media Object",
	"Multi Select",
	"OTP Input",
	"Pagination",
	"Password Input",
	"Popover",
	"Progress Bar",
	"Progress Donut",
	"QR Code",
	"Radio Group",
	"SandboxedOnClick",
	"Scrollable List",
	"Select",
	"Selectable List",
	"Separator",
	"Sheet",
	"Skeleton",
	"Skip to Main Link",
	"Slider",
	"Slot",
	"Split Button",
	"Switch",
	"Table",
	"Tabs",
	"Text Area",
	"Theme",
	"Toast",
	"Tooltip",
	"Well",
] as const;

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
	Accordion: "/components/accordion",
	Alert: "/components/alert",
	"Alert Dialog": "/components/alert-dialog",
	Anchor: "/components/anchor",
	Badge: "/components/badge",
	"Browser Only": "/components/browser-only",
	Button: "/components/button",
	Card: "/components/card",
	Checkbox: "/components/checkbox",
	Choice: "/components/choice",
	Code: "/components/code",
	"Code Block": "/components/code-block",
	Combobox: "/components/combobox",
	Command: "/components/command",
	"Data Table": "/components/data-table",
	"Description List": "/components/description-list",
	Dialog: "/components/dialog",
	"Dropdown Menu": "/components/dropdown-menu",
	Empty: "/components/empty",
	Field: "/components/field",
	Flag: "/components/flag",
	"Hover Card": "/components/hover-card",
	Icon: "/components/icon",
	Icons: "/components/icons",
	"Icon Button": "/components/icon-button",
	Input: "/components/input",
	Label: "/components/label",
	Main: "/components/main",
	"Media Object": "/components/media-object",
	"Multi Select": "/components/multi-select",
	"OTP Input": "/components/otp-input",
	Pagination: "/components/pagination",
	"Password Input": "/components/password-input",
	Popover: "/components/popover",
	"Progress Donut": "/components/progress-donut",
	"Progress Bar": "/components/progress-bar",
	"QR Code": "/components/qr-code",
	"Radio Group": "/components/radio-group",
	SandboxedOnClick: "/components/sandboxed-on-click",
	"Scrollable List": "/components/scrollable-list",
	Select: "/components/select",
	"Selectable List": "/components/selectable-list",
	Separator: "/components/separator",
	Sheet: "/components/sheet",
	Skeleton: "/components/skeleton",
	"Skip to Main Link": "/components/skip-to-main-link",
	Slider: "/components/slider",
	Slot: "/components/slot",
	"Split Button": "/components/split-button",
	Switch: "/components/switch",
	Table: "/components/table",
	Tabs: "/components/tabs",
	"Text Area": "/components/text-area",
	Theme: "/components/theme",
	Toast: "/components/toast",
	Tooltip: "/components/tooltip",
	Well: "/components/well",
} as const satisfies Record<(typeof prodReadyComponents)[number], Route>;

/** Route lookup for preview component pages. */
export const previewComponentsRouteLookup = {
	Calendar: "/components/preview/calendar",
} as const satisfies Record<(typeof previewComponents)[number], Route>;

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

/** Block recipe pages. */
export const blockPages = [
	//,
	"Sheet + Async Data",
] as const;

/** Route lookup for block recipe pages. */
export const blockRoutes = {
	"Sheet + Async Data": "/blocks/sheet-async",
} as const satisfies Record<(typeof blockPages)[number], Route>;

/** Short descriptions for block recipe index pages. */
export const blockDescriptions = {
	"Sheet + Async Data":
		"Open a Sheet immediately, then swap the body between pending, loaded, 404, and 500 states with TanStack Query.",
} as const satisfies Record<(typeof blockPages)[number], string>;

/** Migration guide pages. */
export const migrationPages = [
	//,
	"CodeBlock",
	"DataTable Action Column",
	"Dialog.Footer DOM Order",
] as const;

/** Route lookup for migration guide pages. */
export const migrationRoutes = {
	CodeBlock: "/migrations/code-block-migration",
	"DataTable Action Column": "/migrations/data-table-action-header-migration",
	"Dialog.Footer DOM Order": "/migrations/dialog-footer-dom-order-migration",
} as const satisfies Record<(typeof migrationPages)[number], Route>;

/** Short descriptions for the migration guide index page. */
export const migrationDescriptions = {
	CodeBlock: "Migrate from PrismJS-powered code blocks to mantle's Shiki-powered CodeBlock.",
	"DataTable Action Column":
		"Switch a pinned action column's header to DataTable.ActionHeader so it stays aligned on horizontal scroll.",
	"Dialog.Footer DOM Order":
		"Dialog.Footer now renders children in DOM order — reverse footer children to preserve their layout.",
} as const satisfies Record<(typeof migrationPages)[number], string>;

/**
 * Override map for components whose docs URL slug does not match their
 * package import subpath. For example, "Icon Button" is documented at
 * /components/icon-button but is exported from `@ngrok/mantle/button`
 * (alongside `Button`). Used by the manifest builder to emit correct
 * `importPath` values in /api/components.json.
 *
 * Keys are docs routes (with leading slash). Values are the canonical
 * `@ngrok/mantle/*` import subpath where the component is actually exported.
 */
export const componentImportPathOverrides = {
	"/components/icon-button": "@ngrok/mantle/button",
	"/components/password-input": "@ngrok/mantle/input",
	"/components/progress-bar": "@ngrok/mantle/progress",
	"/components/progress-donut": "@ngrok/mantle/progress",
} as const satisfies Record<string, string>;
