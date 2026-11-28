import { afterEach, describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";

/**
 * The page-to-panel morph in a real view transition. A string check can pass
 * while a selector no longer matches or a rule moved into the wrong media
 * query, so this runs the morph rules of `mantle.css` in the browser and reads
 * the computed styles of the pseudo-elements.
 */
function morphCss(): string {
	const start = mantleCss.indexOf("/*\n * The morph between `AppLayout.Content`");
	const end = mantleCss.indexOf("/*\n * The new snapshot is live");
	if (start === -1 || end === -1) {
		throw new Error("mantle.css holds no app-layout-card morph block.");
	}
	// Why the stub: the theme declares `--shadow-lg`, and this test loads only the block.
	return `:root { --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1); }\n${mantleCss.slice(start, end)}`;
}

/** A card with a view transition name and class, as an app's `<ViewTransition>` sets them. */
function card(name: string, className: string): HTMLElement {
	const element = document.createElement("div");
	element.style.cssText = `width: 200px; height: 100px; background: white; view-transition-name: ${name}; view-transition-class: ${className};`;
	return element;
}

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

/** Starts a transition that swaps `before` for `after`, and returns it once its pseudo-elements exist. */
async function transition(before: Array<HTMLElement>, after: Array<HTMLElement>) {
	const style = document.createElement("style");
	style.textContent = morphCss();
	document.head.append(style);
	const host = document.createElement("div");
	document.body.append(host);
	host.append(...before);
	cleanups.push(() => {
		style.remove();
		host.remove();
	});

	const viewTransition = document.startViewTransition(() => {
		host.replaceChildren(...after);
	});
	await viewTransition.ready;
	for (const animation of document.getAnimations()) {
		animation.pause();
	}
	cleanups.push(() => viewTransition.skipTransition());
	return viewTransition;
}

function pseudo(selector: string): CSSStyleDeclaration {
	return getComputedStyle(document.documentElement, selector);
}

/** The pseudo-elements that run an animation, such as `::view-transition-old(page)`. */
function animatedPseudos(): Array<string> {
	return document
		.getAnimations()
		.map((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "")
		.filter((name) => name !== "");
}

// Why Chromium only: it is the engine that reads computed styles of view
// transition pseudo-elements and supports `view-transition-class` in every
// version mantle tests.
describe.runIf(navigator.userAgent.includes("Chrome"))("app-layout-card morph", () => {
	test("the paired card paints above the page with a shadow, and the page holds still", async () => {
		await transition(
			[card("page", "app-layout-card-under"), card("card", "app-layout-card")],
			[card("page", "app-layout-card-under"), card("card", "app-layout-card")],
		);

		const group = pseudo("::view-transition-group(card)");
		expect(Number(group.zIndex)).toBeGreaterThan(
			Number(pseudo("::view-transition-group(page)").zIndex),
		);
		expect(group.boxShadow).not.toBe("none");
		expect(animatedPseudos()).not.toContain("::view-transition-old(page)");
		expect(animatedPseudos()).not.toContain("::view-transition-new(page)");
	});

	test("a card that leaves alone fades with no shadow behind it", async () => {
		await transition([card("card", "app-layout-card-alone")], []);

		expect(pseudo("::view-transition-group(card)").boxShadow).toBe("none");
		expect(animatedPseudos()).toContain("::view-transition-old(card)");
	});
});
