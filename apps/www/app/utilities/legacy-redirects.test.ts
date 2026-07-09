import { describe, expect, it } from "vitest";

import { legacyRedirectFor } from "./legacy-redirects";

describe("legacyRedirectFor", () => {
	it("redirects legacy component paths to their categorized homes", () => {
		expect(legacyRedirectFor("/components/button")).toBe("/components/actions/button");
		expect(legacyRedirectFor("/components/alert-dialog")).toBe("/components/overlays/alert-dialog");
		expect(legacyRedirectFor("/components/theme")).toBe("/components/primitives/theme");
		expect(legacyRedirectFor("/components/data-table")).toBe("/components/data-display/data-table");
	});

	it("covers every categorized component, including multi-segment leaves", () => {
		expect(legacyRedirectFor("/components/skip-to-main-link")).toBe(
			"/components/primitives/skip-to-main-link",
		);
		expect(legacyRedirectFor("/components/otp-input")).toBe("/components/forms/otp-input");
		expect(legacyRedirectFor("/components/qr-code")).toBe("/components/data-display/qr-code");
	});

	it("preserves the .md suffix so raw-markdown URLs keep serving markdown", () => {
		expect(legacyRedirectFor("/components/button.md")).toBe("/components/actions/button.md");
		expect(legacyRedirectFor("/blocks/sheet-async.md")).toBe("/recipes/overlay-async.md");
	});

	it("drops the .mdx suffix, matching the sitewide .mdx → canonical redirect", () => {
		expect(legacyRedirectFor("/components/button.mdx")).toBe("/components/actions/button");
		expect(legacyRedirectFor("/blocks/sheet-async.mdx")).toBe("/recipes/overlay-async");
	});

	it("redirects the code-block sub-page", () => {
		expect(legacyRedirectFor("/components/code-block/folding-by-language")).toBe(
			"/components/data-display/code-block/folding-by-language",
		);
	});

	it("redirects the renamed blocks section to recipes", () => {
		expect(legacyRedirectFor("/blocks")).toBe("/recipes");
		expect(legacyRedirectFor("/blocks/sheet-async")).toBe("/recipes/overlay-async");
	});

	it("redirects the generalized sheet-async recipe to overlay-async", () => {
		expect(legacyRedirectFor("/recipes/sheet-async")).toBe("/recipes/overlay-async");
		expect(legacyRedirectFor("/recipes/sheet-async.md")).toBe("/recipes/overlay-async.md");
	});

	it("returns null for canonical, unknown, and preview paths", () => {
		expect(legacyRedirectFor("/components/actions/button")).toBeNull();
		expect(legacyRedirectFor("/components/preview/calendar")).toBeNull();
		expect(legacyRedirectFor("/components/does-not-exist")).toBeNull();
		expect(legacyRedirectFor("/definitely/not/a/page")).toBeNull();
		expect(legacyRedirectFor("/")).toBeNull();
	});
});
