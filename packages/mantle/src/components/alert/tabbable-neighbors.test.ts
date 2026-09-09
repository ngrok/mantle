import { afterEach, describe, expect, test } from "vitest";
import { findTabbableNeighbors } from "./tabbable-neighbors.js";

/**
 * Writes the fixture into the document and returns the element with
 * `id="anchor"`, the element the neighbors are computed around.
 */
function mount(html: string): HTMLElement {
	document.body.innerHTML = html;
	const anchor = document.getElementById("anchor");
	if (anchor == null) {
		throw new Error("fixture has no #anchor");
	}
	return anchor;
}

const ids = (elements: HTMLElement[]) => elements.map((element) => element.id);

afterEach(() => {
	document.body.innerHTML = "";
});

describe("findTabbableNeighbors", () => {
	test("orders following tabbables nearest-first, then preceding tabbables nearest-first", () => {
		const anchor = mount(`
			<button id="before-far" type="button">1</button>
			<button id="before-near" type="button">2</button>
			<div id="anchor"><button id="inside" type="button">x</button></div>
			<button id="after-near" type="button">3</button>
			<a id="after-far" href="/next">4</a>
		`);

		expect(ids(findTabbableNeighbors(anchor))).toEqual([
			"after-near",
			"after-far",
			"before-near",
			"before-far",
		]);
	});

	test("skips elements a Tab press cannot reach", () => {
		const anchor = mount(`
			<div id="anchor"></div>
			<button id="disabled" type="button" disabled>d</button>
			<div id="negative" tabindex="-1">n</div>
			<a id="no-href">a</a>
			<input id="hidden-input" type="hidden" />
			<div hidden><button id="in-hidden" type="button">h</button></div>
			<div inert><button id="in-inert" type="button">i</button></div>
			<div id="positive" tabindex="0">p</div>
		`);

		expect(ids(findTabbableNeighbors(anchor))).toEqual(["positive"]);
	});

	test("counts a tabbable ancestor as a preceding neighbor", () => {
		const anchor = mount(`
			<div id="scroller" tabindex="0"><div id="anchor"></div></div>
		`);

		expect(ids(findTabbableNeighbors(anchor))).toEqual(["scroller"]);
	});

	test("returns an empty array when nothing outside the anchor is tabbable", () => {
		const anchor = mount(`<div id="anchor"><button type="button">only</button></div>`);

		expect(findTabbableNeighbors(anchor)).toEqual([]);
	});
});
