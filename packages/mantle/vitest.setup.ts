import "@testing-library/jest-dom/vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Why: `@testing-library/jest-dom/vitest` extends `expect` at runtime, but it types its matchers
// onto `Assertion<T>`, and Vitest 5 declares `Assertion<R, T>`, so that declaration no longer
// merges and every DOM matcher vanishes from `expect` (testing-library/jest-dom#738). `Matchers`
// is the interface Vitest 5 reserves for custom matchers, and `Assertion`, `expect.extend`, and
// the asymmetric matchers all extend it. Delete this block once jest-dom ships v5 types.
declare module "vitest" {
	interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}

afterEach(() => {
	cleanup();
});
