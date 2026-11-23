// Why: the reference types `cdp()` with the Playwright provider's session, so
// a browser test can send trusted touch input.
/// <reference types="@vitest/browser-playwright" />
import "@testing-library/jest-dom/vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import { installPopoverApi } from "./src/test-utils/install-popover-api.js";
import { createIntersectionObserverStub } from "./src/test-utils/mock-intersection-observer.js";
import { canUseDOM } from "./src/components/browser-only/can-use-dom.js";

// Why: `@testing-library/jest-dom/vitest` extends `expect` at runtime, but it types its matchers
// onto `Assertion<T>`, and Vitest 5 declares `Assertion<R, T>`, so that declaration no longer
// merges and every DOM matcher vanishes from `expect` (testing-library/jest-dom#738). `Matchers`
// is the interface Vitest 5 reserves for custom matchers, and `Assertion`, `expect.extend`, and
// the asymmetric matchers all extend it. Delete this block once jest-dom ships v5 types.
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
		}) => Promise<void>;
		/**
		 * Compiles the Tailwind utilities that a source file uses, with the path
		 * relative to the test file. Browser project only; the config registers
		 * the command.
		 */
		tailwindCss: (sourceFile: string) => Promise<string>;
	}
}

// Why a direct assignment: `unstubGlobals` runs before each test and undoes a `vi.stubGlobal`
// here. happy-dom's observer never calls back, so this stub reports every observed element in
// view inside `observe()`, and the guard keeps Chromium's observer in the browser project.
if (canUseDOM() && "happyDOM" in window) {
	globalThis.IntersectionObserver = createIntersectionObserverStub({ intersecting: true }).Observer;
	installPopoverApi();
}

// Why: Chromium computes `::before` and `::after` content, which can name an element
// (`ThemeSwitcher`). Testing Library reads it only when told; happy-dom computes none.
if (canUseDOM() && !("happyDOM" in window)) {
	configure({ computedStyleSupportsPseudoElements: true });
}

afterEach(() => {
	cleanup();
});
