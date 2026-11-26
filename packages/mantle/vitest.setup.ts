// Why: the reference types `cdp()` with the Playwright provider's session, so
// a browser test can send trusted touch input.
/// <reference types="@vitest/browser-playwright" />
import "@testing-library/jest-dom/vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import { installDialogCloseRequest } from "./src/test-utils/install-dialog-close-request.js";
import { installPopoverApi } from "./src/test-utils/install-popover-api.js";
import { createIntersectionObserverStub } from "./src/test-utils/mock-intersection-observer.js";
import { canUseDOM } from "./src/components/browser-only/can-use-dom.js";

// Why: `@vitest/browser` declares its own `toHaveTextContent(text?: string | number)` on
// `Assertion`, and that declaration hides the jest-dom 8 overload that takes a `RegExp`.
// `Matchers` is the interface Vitest 5 reserves for custom matchers, and `Assertion`,
// `expect.extend`, and the asymmetric matchers all extend it, so the `RegExp` form type-checks
// again. Delete this block when `typecheck` passes without it.
declare module "vitest" {
	interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}

declare module "vitest/browser" {
	interface BrowserCommands {
		/**
		 * Sets the page's emulated media features through Playwright. A feature
		 * left out keeps its current emulation. Browser project only; the config
		 * registers the command.
		 */
		emulateMedia: (options: {
			colorScheme?: "light" | "dark";
			reducedMotion?: "reduce" | "no-preference";
			forcedColors?: "active" | "none";
			/** Chromium only. `"none"` turns on touch emulation, which also sets `pointer: coarse`. */
			hover?: "hover" | "none";
		}) => Promise<void>;
		/**
		 * Compiles the Tailwind utilities that one or more source files use, with
		 * paths relative to the test file. Browser project only; the config
		 * registers the command. `theme` adds the first `@theme` block of
		 * `mantle.css`. `mantleCss` compiles against all of `mantle.css`, with
		 * the light and dark tokens. `css` adds CSS after `mantle.css`, such as an
		 * app's `@theme` block.
		 */
		tailwindCss: (
			sourceFiles: string | readonly string[],
			options?: { theme?: boolean; mantleCss?: boolean; css?: string },
		) => Promise<string>;
	}
}

// Why a direct assignment: `unstubGlobals` runs before each test and undoes a `vi.stubGlobal`
// here. happy-dom's observer never calls back, so this stub reports every observed element in
// view inside `observe()`, and the guard keeps Chromium's observer in the browser project.
if (canUseDOM() && "happyDOM" in window) {
	globalThis.IntersectionObserver = createIntersectionObserverStub({ intersecting: true }).Observer;
	installPopoverApi();
	installDialogCloseRequest();
}

// Why: Chromium computes `::before` and `::after` content, which can name an element
// (`ThemeSwitcher`). Testing Library reads it only when told; happy-dom and jsdom compute none.
if (canUseDOM() && !("happyDOM" in window) && !navigator.userAgent.includes("jsdom")) {
	configure({ computedStyleSupportsPseudoElements: true });
}

afterEach(() => {
	cleanup();
});
