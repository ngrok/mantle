import { afterEach, describe, expect, test } from "vitest";
import { enterModal } from "./enter-modal.js";

afterEach(() => {
	document.body.replaceChildren();
});

/** Builds `<label for=x> <form><button id=x/><button/></form> <aside/> <div popup/>`. */
const page = () => {
	document.body.innerHTML = `
		<label for="trigger">Fruit</label>
		<form><button id="trigger">Pick</button><button id="next">Next</button></form>
		<aside id="aside">Aside</aside>
		<div id="popup"></div>`;
	const get = (id: string) => {
		const element = document.getElementById(id);
		if (element == null) {
			throw new Error(`No #${id}`);
		}
		return element;
	};
	return { trigger: get("trigger"), next: get("next"), aside: get("aside"), popup: get("popup") };
};

describe("enterModal", () => {
	test("makes everything but the owner, its label, its ancestors, and the popup inert, and undoes it", () => {
		const { trigger, next, aside, popup } = page();
		const label = document.querySelector("label");
		const exit = enterModal([trigger, popup]);

		expect(next.inert).toBe(true);
		expect(aside.inert).toBe(true);
		expect(label?.inert).toBe(false);
		expect(trigger.closest("form")?.inert).toBe(false);
		expect(popup.inert).toBe(false);
		expect(document.documentElement.style.overflow).toBe("hidden");

		exit();

		expect(document.querySelector("[inert]")).toBeNull();
		expect(document.documentElement.style.overflow).toBe("");
	});

	test("an element that was inert before stays inert after", () => {
		const { trigger, aside, popup } = page();
		aside.inert = true;
		enterModal([trigger, popup])();
		expect(aside.inert).toBe(true);
	});

	test("nested modals restore the page when the outer one exits first", () => {
		const { trigger, next, aside, popup } = page();
		const exitOuter = enterModal([trigger, popup]);
		// The inner modal keeps a different element, so it sees the outer's inert state.
		const exitInner = enterModal([aside]);
		exitOuter();
		exitInner();
		expect(next.inert).toBe(false);
		expect(aside.inert).toBe(false);
		expect(document.querySelector("[inert]")).toBeNull();
		expect(document.documentElement.style.overflow).toBe("");
	});
});
