import type { ComponentType } from "react";

type PreviewExample = {
	/**
	 * Human-readable name for the example — becomes the preview document's
	 * title and the accessible label of the docs page's preview frame.
	 */
	title: string;
	/**
	 * Loads the demo component. A preview document loads only its own demo,
	 * not every module in the registry. The demo renders as the entire preview
	 * document (no site chrome), so it must size itself to the viewport —
	 * full-page layout demos fill it (`min-h-full`) or pin themselves with
	 * `fixed inset-0` — and should own the document's landmarks (a real `Main`,
	 * optionally a `SkipToMainLink`).
	 */
	load: () => Promise<ComponentType>;
	/**
	 * The demo's module, named relative to `app/features/`. `/llms-full.txt`
	 * publishes that file verbatim, so an agent reading the offline docs builds
	 * against the code the preview runs rather than a docs-page excerpt of it.
	 * Several examples may name one module.
	 */
	sourceFile: string;
};

/**
 * Every shell-scale demo that renders as a framed preview. The key is the path
 * after `/preview/` on the chrome-less `/preview/*` route,
 * and the docs pages point `<Example name="…">` at the
 * same key. Because the preview is its own document, examples get a real
 * `Main` landmark, their own `window` (document-level keyboard shortcuts and
 * listeners never leak onto the docs page), and media queries that track the
 * frame's viewport instead of the reader's browser window.
 *
 * @example
 * ```tsx
 * const Component = await previewExamples["centered-layout"].load();
 * <Component />; // renders the whole preview document
 * ```
 */
export const previewExamples = {
	"alert-center-shell": {
		title: "Alert Center app shell demo",
		load: () => import("./alert-center-demos").then((module) => module.AlertCenterShellDemo),
		sourceFile: "alert-center-demos.tsx",
	},
	"app-shell": {
		title: "App shell demo",
		load: () => import("./app-shell-demo").then((module) => module.AppShellDemo),
		sourceFile: "app-shell-demo.tsx",
	},
	"command-search-shell": {
		title: "Sidebar search trigger demo",
		load: () => import("./command-demos").then((module) => module.CommandSearchShellDemo),
		sourceFile: "command-demos.tsx",
	},
	"app-layout-standalone": {
		title: "Standalone app layout demo",
		load: () => import("./app-layout-demos").then((module) => module.AppLayoutDemo),
		sourceFile: "app-layout-demos.tsx",
	},
	"app-layout-editor": {
		title: "Editor page demo",
		load: () => import("./app-layout-editor-demo").then((module) => module.AppLayoutEditorDemo),
		sourceFile: "app-layout-editor-demo.tsx",
	},
	"app-layout-pinned-footer": {
		title: "Pinned footer demo",
		load: () =>
			import("./app-layout-editor-demo").then((module) => module.AppLayoutPinnedFooterDemo),
		sourceFile: "app-layout-editor-demo.tsx",
	},
	"app-layout-side-panel": {
		title: "Side panel demo",
		load: () => import("./app-layout-demos").then((module) => module.AppLayoutSidePanelDemo),
		sourceFile: "app-layout-demos.tsx",
	},
	"assistant-across-routes": {
		title: "Assistant across routes demo",
		load: () =>
			import("./assistant-across-routes-demo").then((module) => module.AssistantAcrossRoutesDemo),
		sourceFile: "assistant-across-routes-demo.tsx",
	},
	"centered-layout": {
		title: "Centered layout demo",
		load: () => import("./centered-layout-demos").then((module) => module.CenteredLayoutDemo),
		sourceFile: "centered-layout-demos.tsx",
	},
	"centered-layout-header": {
		title: "Centered layout header demo",
		load: () => import("./centered-layout-demos").then((module) => module.CenteredLayoutHeaderDemo),
		sourceFile: "centered-layout-demos.tsx",
	},
	"centered-layout-notice": {
		title: "Centered layout notice demo",
		load: () => import("./centered-layout-demos").then((module) => module.CenteredLayoutNoticeDemo),
		sourceFile: "centered-layout-demos.tsx",
	},
	"list-page-loading": {
		title: "List page loading demo",
		load: () => import("./list-page-loading-demo").then((module) => module.ListPageLoadingDemo),
		sourceFile: "list-page-loading-demo.tsx",
	},
	sandbar: {
		title: "Sandbar demo",
		load: () => import("./sandbar-demos").then((module) => module.SandbarDemo),
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-failed-save": {
		title: "Sandbar failed save demo",
		load: () => import("./sandbar-demos").then((module) => module.SandbarFailedSaveDemo),
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-over-sheet": {
		title: "Sandbar over sheet demo",
		load: () => import("./sandbar-demos").then((module) => module.SandbarOverSheetDemo),
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-pending-publish": {
		title: "Sandbar pending publish demo",
		load: () => import("./sandbar-demos").then((module) => module.SandbarPendingPublishDemo),
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-reduced-motion": {
		title: "Sandbar reduced motion demo",
		load: () => import("./sandbar-demos").then((module) => module.SandbarReducedMotionDemo),
		sourceFile: "sandbar-demos.tsx",
	},
	"sidebar-persistence": {
		title: "Sidebar persistence demo",
		load: () => import("./sidebar-demos").then((module) => module.SidebarPersistenceDemo),
		sourceFile: "sidebar-demos.tsx",
	},
	"sparklines-in-a-list": {
		title: "Sparklines in a list demo",
		load: () =>
			import("./sparklines-in-a-list-demo").then((module) => module.SparklinesInAListDemo),
		sourceFile: "sparklines-in-a-list-demo.tsx",
	},
	strata: {
		title: "Strata demo",
		load: () => import("./strata-demos").then((module) => module.StrataExample),
		sourceFile: "strata-demos.tsx",
	},
	"strata-columns": {
		title: "Strata column split demo",
		load: () => import("./strata-demos").then((module) => module.StrataColumnsExample),
		sourceFile: "strata-demos.tsx",
	},
	"strata-polymorphism": {
		title: "Strata polymorphism demo",
		load: () => import("./strata-demos").then((module) => module.StrataPolymorphismExample),
		sourceFile: "strata-demos.tsx",
	},
} as const satisfies Record<string, PreviewExample>;

/**
 * The names of all registered preview examples — the valid values for the
 * path after `/preview/` and `Example`'s
 * `example` prop.
 */
export type PreviewExampleName = keyof typeof previewExamples;

/**
 * Type guard narrowing an arbitrary URL segment to a registered preview
 * example name.
 *
 * @example
 * ```ts
 * isPreviewExampleName("centered-layout"); // true
 * isPreviewExampleName("nope"); // false
 * ```
 */
export function isPreviewExampleName(value: string): value is PreviewExampleName {
	// own-property check: `in` also matches prototype-chain names ("toString",
	// "constructor", …), which would pass the guard and crash the route
	return Object.hasOwn(previewExamples, value);
}
