import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The view transition is load-bearing: without it, the page and the panel swap
 * in one frame, and the reader loses where the conversation went. Apps copy
 * this recipe, so this asserts the recipe keeps every part of the contract.
 * If this fails, restore the transition; do not delete the assertion.
 */
const source = readFileSync(
	fileURLToPath(new URL("./assistant-across-routes.tsx", import.meta.url)),
	"utf8",
);
const stylesheet = readFileSync(
	fileURLToPath(new URL("./assistant-view-transition.css", import.meta.url)),
	"utf8",
);

describe("assistant across routes transition contract", () => {
	it.each([
		// The page card and the open panel share one name, so they morph.
		['const assistantViewTransitionName = "assistant"'],
		["name={onAssistantPage ? assistantViewTransitionName : undefined}"],
		["name={assistantViewTransitionName}"],
		// The card remounts on a crossing, and a product page holds still under it.
		['key={onAssistantPage ? "assistant" : "page"}'],
		['"app-layout-card-under"'],
		// The header and the composer move on their own.
		['share="assistant-part"'],
		['share="assistant-part assistant-composer"'],
		['"assistant-close"'],
	])("the recipe keeps %s", (fragment) => {
		expect(source).toContain(fragment);
	});

	it("the stylesheet keeps the parts above the card and a reduced-motion cut", () => {
		expect(stylesheet).toContain("::view-transition-group(assistant)");
		expect(stylesheet).toContain("view-transition-name: assistant-close");
		expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
	});
});
