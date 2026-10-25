import "@testing-library/jest-dom/vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { createIntersectionObserverStub } from "./src/test-utils/mock-intersection-observer.js";
import { canUseDOM } from "./src/components/browser-only/browser-only.js";

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
		 * Sets the page's emulated media features through Playwright. Browser
		 * project only; the config registers the command.
		 */
		emulateMedia: (options: { reducedMotion: "reduce" | "no-preference" }) => Promise<void>;
	}
}

// Why a direct assignment: `unstubGlobals` runs before each test and undoes a `vi.stubGlobal`
// here. happy-dom's observer never calls back, so this stub reports every observed element in
// view inside `observe()`, and the guard keeps Chromium's observer in the browser project.
if (canUseDOM() && "happyDOM" in window) {
	globalThis.IntersectionObserver = createIntersectionObserverStub({ intersecting: true }).Observer;
}

afterEach(() => {
	cleanup();
});
