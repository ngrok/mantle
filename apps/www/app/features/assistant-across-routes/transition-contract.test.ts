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
		['enter={onAssistantPage ? "app-layout-card-alone" : "app-layout-card-under"}'],
		['exit={onAssistantPage ? "app-layout-card-alone" : "app-layout-card-under"}'],
		['share={onAssistantPage && !open ? "app-layout-card-alone" : undefined}'],
		// The header and the composer move on their own.
		['share="assistant-part"'],
		// Each part has its name in both homes; the panel's only while it is open.
		['name="assistant-title"'],
		['name={open ? "assistant-title" : undefined}'],
		['name="assistant-composer"'],
		['name={open ? "assistant-composer" : undefined}'],
		['name={open ? "assistant-new-conversation" : undefined}'],
		['share="assistant-part assistant-composer"'],
		['"assistant-close"'],
	])("the recipe keeps %s", (fragment) => {
		expect(source).toContain(fragment);
	});

	it("the app loads the stylesheet after mantle.css", () => {
		const globalCss = readFileSync(
			fileURLToPath(new URL("../../global.css", import.meta.url)),
			"utf8",
		);
		const mantle = globalCss.indexOf('@import "@ngrok/mantle/mantle.css"');
		const recipe = globalCss.indexOf(
			'@import "./features/assistant-across-routes/assistant-view-transition.css"',
		);

		expect(mantle).toBeGreaterThanOrEqual(0);
		expect(recipe).toBeGreaterThan(mantle);
	});

	it("the stylesheet keeps the parts above the card and a reduced-motion cut", () => {
		expect(stylesheet).toContain("::view-transition-group(assistant)");
		// The header and the composer paint above the moving card, which mantle puts at 1.
		expect(stylesheet).toMatch(
			/::view-transition-group\(\.assistant-part\),\s*::view-transition-group\(assistant-close\) \{\s*z-index: 2;/,
		);
		expect(stylesheet).toContain("view-transition-name: assistant-close");
		expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
	});
});
