import type { ComponentType } from "react";
import { AppLayoutDemo } from "./app-layout-demos";
import { AppShellDemo, BridgeShellDemo } from "./app-shell-demo";
import {
	CenteredLayoutDemo,
	CenteredLayoutHeaderDemo,
	CenteredLayoutNoticeDemo,
} from "./centered-layout-demos";
import { SidebarPersistenceDemo } from "./sidebar-demos";

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
	"app-shell": {
		title: "App shell demo",
		Component: AppShellDemo,
	},
	"bridge-shell": {
		title: "Bridge shell demo",
		Component: BridgeShellDemo,
	},
	"app-layout-standalone": {
		title: "Standalone app layout demo",
		Component: AppLayoutDemo,
	},
	"centered-layout": {
		title: "Centered layout demo",
		Component: CenteredLayoutDemo,
	},
	"centered-layout-header": {
		title: "Centered layout header demo",
		Component: CenteredLayoutHeaderDemo,
	},
	"centered-layout-notice": {
		title: "Centered layout notice demo",
		Component: CenteredLayoutNoticeDemo,
	},
	"sidebar-persistence": {
		title: "Sidebar persistence demo",
		Component: SidebarPersistenceDemo,
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
