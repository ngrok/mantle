import type { ComponentType } from "react";
import { AlertCenterShellDemo } from "~/features/alert-center-demos";
import { AppLayoutDemo } from "~/features/app-layout-demos";
import { AppLayoutEditorDemo, AppLayoutPinnedFooterDemo } from "~/features/app-layout-editor-demo";
import { AppShellDemo, BridgeShellDemo } from "~/features/app-shell-demo";
import { CommandSearchShellDemo } from "~/features/command-demos";
import {
	CenteredLayoutDemo,
	CenteredLayoutHeaderDemo,
	CenteredLayoutNoticeDemo,
} from "~/features/centered-layout-demos";
import {
	SandbarDemo,
	SandbarFailedSaveDemo,
	SandbarPendingPublishDemo,
	SandbarReducedMotionDemo,
} from "~/features/sandbar-demos";
import { SidebarPersistenceDemo } from "~/features/sidebar-demos";

type PreviewExample = {
	/**
	 * Human-readable name for the example — becomes the preview document's
	 * title and the accessible label of the docs page's preview frame.
	 */
	title: string;
	/**
	 * The demo component. It renders as the entire preview document (no site
	 * chrome), so it must size itself to the viewport — full-page layout demos
	 * fill it (`min-h-full`) or pin themselves with `fixed inset-0` — and
	 * should own the document's landmarks (a real `Main`, optionally a
	 * `SkipToMainLink`).
	 */
	Component: ComponentType;
	/**
	 * `Component`'s module, named relative to `app/features/`. `/llms-full.txt`
	 * publishes that file verbatim, so an agent reading the offline docs builds
	 * against the code the preview runs rather than a docs-page excerpt of it.
	 * Several examples may name one module.
	 */
	sourceFile: string;
};

/**
 * Every example that can render as a framed preview. The key is the
 * `:exampleName` URL segment of the chrome-less `/preview/:exampleName` route,
 * and the docs pages point `<CodeExample.PreviewFrame example="…">` at the
 * same key. Because the preview is its own document, examples get a real
 * `Main` landmark, their own `window` (document-level keyboard shortcuts and
 * listeners never leak onto the docs page), and media queries that track the
 * frame's viewport instead of the reader's browser window.
 *
 * @example
 * ```tsx
 * const { title, Component } = previewExamples["centered-layout"];
 * <Component />; // renders the whole preview document
 * ```
 */
export const previewExamples = {
	"alert-center-shell": {
		title: "Alert Center app shell demo",
		Component: AlertCenterShellDemo,
		sourceFile: "alert-center-demos.tsx",
	},
	"app-shell": {
		title: "App shell demo",
		Component: AppShellDemo,
		sourceFile: "app-shell-demo.tsx",
	},
	"command-search-shell": {
		title: "Sidebar search trigger demo",
		Component: CommandSearchShellDemo,
		sourceFile: "command-demos.tsx",
	},
	"bridge-shell": {
		title: "Bridge shell demo",
		Component: BridgeShellDemo,
		sourceFile: "app-shell-demo.tsx",
	},
	"app-layout-standalone": {
		title: "Standalone app layout demo",
		Component: AppLayoutDemo,
		sourceFile: "app-layout-demos.tsx",
	},
	"app-layout-editor": {
		title: "Editor page demo",
		Component: AppLayoutEditorDemo,
		sourceFile: "app-layout-editor-demo.tsx",
	},
	"app-layout-pinned-footer": {
		title: "Pinned footer demo",
		Component: AppLayoutPinnedFooterDemo,
		sourceFile: "app-layout-editor-demo.tsx",
	},
	"centered-layout": {
		title: "Centered layout demo",
		Component: CenteredLayoutDemo,
		sourceFile: "centered-layout-demos.tsx",
	},
	"centered-layout-header": {
		title: "Centered layout header demo",
		Component: CenteredLayoutHeaderDemo,
		sourceFile: "centered-layout-demos.tsx",
	},
	"centered-layout-notice": {
		title: "Centered layout notice demo",
		Component: CenteredLayoutNoticeDemo,
		sourceFile: "centered-layout-demos.tsx",
	},
	sandbar: {
		title: "Sandbar demo",
		Component: SandbarDemo,
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-failed-save": {
		title: "Sandbar failed save demo",
		Component: SandbarFailedSaveDemo,
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-pending-publish": {
		title: "Sandbar pending publish demo",
		Component: SandbarPendingPublishDemo,
		sourceFile: "sandbar-demos.tsx",
	},
	"sandbar-reduced-motion": {
		title: "Sandbar reduced motion demo",
		Component: SandbarReducedMotionDemo,
		sourceFile: "sandbar-demos.tsx",
	},
	"sidebar-persistence": {
		title: "Sidebar persistence demo",
		Component: SidebarPersistenceDemo,
		sourceFile: "sidebar-demos.tsx",
	},
} as const satisfies Record<string, PreviewExample>;

/**
 * The names of all registered preview examples — the valid values for the
 * `/preview/:exampleName` URL segment and `CodeExample.PreviewFrame`'s
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
