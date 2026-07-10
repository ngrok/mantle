import { afterEach, describe, expect, test } from "vitest";
import {
	attachFoldHandler,
	clearRegionLinesCache,
	getFoldGeometry,
	resetFoldState,
	toggleFoldFromButton,
} from "./fold-runtime.js";

/**
 * Builds a minimal fold-decorated DOM tree shaped like what
 * {@link import("./decorate-highlighted-html.js").decorateHighlightedHtml}
 * emits, so the runtime helpers can be exercised without React.
 */
function buildFoldDom() {
	const pre = document.createElement("pre");
	pre.dataset.slot = "code-block-code";
	const code = document.createElement("code");
	pre.appendChild(code);

	function addLine({
		number,
		regions,
		opener,
	}: {
		number: number;
		regions?: string;
		opener?: string;
	}) {
		const line = document.createElement("span");
		line.className = "mantle-code-line";
		line.setAttribute("data-line-number", String(number));
		if (regions != null) {
			line.dataset.foldRegions = regions;
		}
		if (opener != null) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "mantle-code-fold-toggle";
			button.dataset.foldLine = opener;
			button.setAttribute("aria-expanded", "true");
			line.appendChild(button);
		}
		const content = document.createElement("span");
		content.className = "mantle-code-line-content";
		content.textContent = `line ${number}`;
		line.appendChild(content);
		code.appendChild(line);
		return line;
	}

	addLine({ number: 1, opener: "1" });
	addLine({ number: 2, regions: "1", opener: "2" });
	addLine({ number: 3, regions: "1 2" });
	addLine({ number: 4, regions: "1 2" });
	addLine({ number: 5, regions: "1" });
	addLine({ number: 6 });

	document.body.appendChild(pre);
	return { pre, code };
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("fold-runtime", () => {
	test("getFoldGeometry groups lines by their parent region IDs", () => {
		const { code } = buildFoldDom();
		const { regionToLines } = getFoldGeometry(code);
		expect(regionToLines.get("1")?.length).toBe(4);
		expect(regionToLines.get("2")?.length).toBe(2);
		expect(regionToLines.get("3")).toBeUndefined();
	});

	test("getFoldGeometry is memoized per code element", () => {
		const { code } = buildFoldDom();
		const first = getFoldGeometry(code);
		const second = getFoldGeometry(code);
		expect(first).toBe(second);
	});

	test("clearRegionLinesCache forces a rebuild", () => {
		const { code } = buildFoldDom();
		const first = getFoldGeometry(code);
		clearRegionLinesCache(code);
		const second = getFoldGeometry(code);
		expect(first).not.toBe(second);
	});

	test("resetFoldState clears cached geometry and persisted folded regions", () => {
		const { code } = buildFoldDom();
		const first = getFoldGeometry(code);
		code.setAttribute("data-folded-regions", "2");

		resetFoldState(code);

		expect(code.hasAttribute("data-folded-regions")).toBe(false);
		const second = getFoldGeometry(code);
		expect(first).not.toBe(second);
	});

	test("getFoldGeometry pre-parses each line's region set so toggles avoid re-splitting", () => {
		const { code } = buildFoldDom();
		const { lineToRegions } = getFoldGeometry(code);
		const line3 = code.querySelector('[data-line-number="3"]');
		expect(line3).toBeInstanceOf(HTMLElement);
		if (!(line3 instanceof HTMLElement)) {
			return;
		}
		const regions = lineToRegions.get(line3);
		expect(regions).toBeInstanceOf(Set);
		expect(regions?.size).toBe(2);
		expect(regions?.has("1")).toBe(true);
		expect(regions?.has("2")).toBe(true);
	});

	test("toggleFoldFromButton flips the button's aria-expanded and the parent state", () => {
		const { code } = buildFoldDom();
		const button = code.querySelector<HTMLButtonElement>('[data-fold-line="2"]');
		if (button == null) {
			throw new Error("expected fold toggle for region 2");
		}

		toggleFoldFromButton(button);
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(code.getAttribute("data-folded-regions")).toBe("2");

		toggleFoldFromButton(button);
		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(code.hasAttribute("data-folded-regions")).toBe(false);
	});

	test("toggleFoldFromButton derives the next state from folded regions and reconciles aria", () => {
		const { code } = buildFoldDom();
		const button = code.querySelector<HTMLButtonElement>('[data-fold-line="2"]');
		if (button == null) {
			throw new Error("expected fold toggle for region 2");
		}
		button.setAttribute("aria-expanded", "false");
		expect(code.hasAttribute("data-folded-regions")).toBe(false);

		toggleFoldFromButton(button);

		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(code.getAttribute("data-folded-regions")).toBe("2");

		button.setAttribute("aria-expanded", "true");
		toggleFoldFromButton(button);

		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(code.hasAttribute("data-folded-regions")).toBe(false);
	});

	test("toggleFoldFromButton hides only the lines belonging to the toggled region", () => {
		const { code } = buildFoldDom();
		const button2 = code.querySelector<HTMLButtonElement>('[data-fold-line="2"]');
		if (button2 == null) {
			throw new Error("expected fold toggle for region 2");
		}

		toggleFoldFromButton(button2);

		const line2 = code.querySelector('[data-line-number="2"]');
		const line3 = code.querySelector('[data-line-number="3"]');
		const line4 = code.querySelector('[data-line-number="4"]');
		const line5 = code.querySelector('[data-line-number="5"]');

		// region 2 contains lines 3 and 4
		expect(line2?.getAttribute("data-fold-hidden")).toBeNull();
		expect(line3?.getAttribute("data-fold-hidden")).toBe("true");
		expect(line4?.getAttribute("data-fold-hidden")).toBe("true");
		expect(line5?.getAttribute("data-fold-hidden")).toBeNull();
	});

	test("re-expanding an outer fold leaves inner folds collapsed", () => {
		const { code } = buildFoldDom();
		const buttonInner = code.querySelector<HTMLButtonElement>('[data-fold-line="2"]');
		const buttonOuter = code.querySelector<HTMLButtonElement>('[data-fold-line="1"]');
		if (buttonInner == null || buttonOuter == null) {
			throw new Error("expected fold toggles for both regions");
		}

		toggleFoldFromButton(buttonInner);
		toggleFoldFromButton(buttonOuter);
		toggleFoldFromButton(buttonOuter);

		expect(buttonOuter.getAttribute("aria-expanded")).toBe("true");
		expect(buttonInner.getAttribute("aria-expanded")).toBe("false");

		const line3 = code.querySelector('[data-line-number="3"]');
		expect(line3?.getAttribute("data-fold-hidden")).toBe("true");
	});

	test("attachFoldHandler returns a cleanup that removes the listener", () => {
		const { pre, code } = buildFoldDom();
		const cleanup = attachFoldHandler(pre);
		const button = code.querySelector<HTMLButtonElement>('[data-fold-line="2"]');
		if (button == null) {
			throw new Error("expected fold toggle for region 2");
		}

		button.click();
		expect(button.getAttribute("aria-expanded")).toBe("false");

		cleanup();
		button.click();
		// After cleanup, the click no longer toggles state.
		expect(button.getAttribute("aria-expanded")).toBe("false");
	});

	test("attachFoldHandler ignores clicks outside of any fold toggle", () => {
		const { pre, code } = buildFoldDom();
		attachFoldHandler(pre);
		const line5 = code.querySelector('[data-line-number="5"]');
		expect(line5).toBeInstanceOf(HTMLElement);
		(line5 as HTMLElement).click();
		expect(code.hasAttribute("data-folded-regions")).toBe(false);
	});

	test("toggleFoldFromButton is a no-op for buttons missing data-fold-line", () => {
		const { code, pre } = buildFoldDom();
		const orphan = document.createElement("button");
		orphan.type = "button";
		orphan.className = "mantle-code-fold-toggle";
		code.appendChild(orphan);
		expect(toggleFoldFromButton(orphan)).toBe(false);
		expect(pre.querySelector("[data-folded-regions]")).toBeNull();
	});
});
