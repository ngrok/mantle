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
	test("a nested modal's popup that mounts later stays live", async () => {
		const { trigger, next, popup } = page();
		const exitOuter = enterModal([trigger, popup]);
		const nested = document.createElement("div");
		document.body.append(nested);
		const exitNested = enterModal([next, nested]);
		await Promise.resolve();
		expect(nested.inert).toBe(false);
		exitNested();
		exitOuter();
	});

	test("an element that mounts beside the page while the popup is open is inert too", async () => {
		const { trigger, popup } = page();
		const exit = enterModal([trigger, popup]);
		const toast = document.createElement("div");
		document.body.append(toast);
		// Why: a MutationObserver reports in a microtask.
		await Promise.resolve();
		expect(toast.inert).toBe(true);
		exit();
		expect(toast.inert).toBe(false);
	});

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

	test("an ancestor's label, such as a dialog title, stays live", () => {
		document.body.innerHTML = `
			<div role="dialog" aria-labelledby="title"><h2 id="title">Edit</h2><p id="body">Body</p><button id="trigger">Pick</button></div>
			<div id="popup"></div>`;
		const trigger = document.getElementById("trigger");
		const popup = document.getElementById("popup");
		if (trigger == null || popup == null) {
			throw new Error("No fixture");
		}
		const exit = enterModal([trigger, popup]);
		expect(document.getElementById("title")?.inert).toBe(false);
		expect(document.getElementById("body")?.inert).toBe(true);
		exit();
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

	test("a modal that exits under two later modals leaves the newest one live", () => {
		const { trigger, next, aside, popup } = page();
		const exitFirst = enterModal([trigger, popup]);
		const exitMiddle = enterModal([next]);
		const exitNewest = enterModal([aside]);
		exitFirst();
		expect(aside.inert).toBe(false);
		expect(popup.inert).toBe(true);
		exitNewest();
		exitMiddle();
		expect(document.querySelector("[inert]")).toBeNull();
		expect(document.documentElement.style.overflow).toBe("");
	});

	test("a modal's popup that an older modal made inert before it entered is live", () => {
		const { trigger, aside, popup } = page();
		const exitOuter = enterModal([trigger, popup]);
		expect(aside.inert).toBe(true);
		const exitLater = enterModal([aside]);
		expect(aside.inert).toBe(false);
		exitLater();
		expect(aside.inert).toBe(true);
		exitOuter();
		expect(document.querySelector("[inert]")).toBeNull();
	});
});
