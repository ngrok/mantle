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
			<button id="invisible" type="button" style="visibility: hidden">v</button>
			<div id="negative" tabindex="-1">n</div>
			<a id="no-href">a</a>
			<input id="hidden-input" type="hidden" />
			<div hidden><button id="in-hidden" type="button">h</button></div>
			<div inert><button id="in-inert" type="button">i</button></div>
			<div id="positive" tabindex="0">p</div>
		`);

		expect(ids(findTabbableNeighbors(anchor))).toEqual(["positive"]);
	});

	describe("radio groups", () => {
		test("counts only the checked radio of a named group", () => {
			const anchor = mount(`
				<div id="anchor"></div>
				<input id="plan-free" type="radio" name="plan" />
				<input id="plan-pro" type="radio" name="plan" checked />
				<input id="plan-team" type="radio" name="plan" />
				<button id="after" type="button">Continue</button>
			`);

			expect(ids(findTabbableNeighbors(anchor))).toEqual(["plan-pro", "after"]);
		});

		test("counts the first enabled radio when none in the group is checked", () => {
			const anchor = mount(`
				<div id="anchor"></div>
				<input id="plan-free" type="radio" name="plan" disabled />
				<input id="plan-pro" type="radio" name="plan" />
				<input id="plan-team" type="radio" name="plan" />
			`);

			expect(ids(findTabbableNeighbors(anchor))).toEqual(["plan-pro"]);
		});

		test("groups a radio placed outside its form through the `form` attribute", () => {
			const anchor = mount(`
				<div id="anchor"></div>
				<form id="plan-form"><input id="in-form" type="radio" name="plan" /></form>
				<input id="via-attribute" type="radio" name="plan" form="plan-form" checked />
			`);

			expect(ids(findTabbableNeighbors(anchor))).toEqual(["via-attribute"]);
		});

		test("keeps separate groups, unnamed radios, and separate forms as their own stops", () => {
			const anchor = mount(`
				<div id="anchor"></div>
				<input id="plan-pro" type="radio" name="plan" checked />
				<input id="plan-team" type="radio" name="plan" />
				<input id="region-us" type="radio" name="region" />
				<input id="region-eu" type="radio" name="region" />
				<input id="lonely" type="radio" />
				<form><input id="form-plan" type="radio" name="plan" /></form>
			`);

			expect(ids(findTabbableNeighbors(anchor))).toEqual([
				"plan-pro",
				"region-us",
				"lonely",
				"form-plan",
			]);
		});
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
