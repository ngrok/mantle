import { afterEach, describe, expect, test } from "vitest";
import { mockMatchMedia } from "../test-utils/mock-match-media.js";
import { installShakeStyle, shakesOf } from "../test-utils/shake-style.js";
import { shakeElement } from "./shake.js";

installShakeStyle();

let element: HTMLElement;

afterEach(() => {
	element.remove();
});

function renderTarget() {
	element = document.createElement("div");
	element.className = "motion-safe:data-shake:animate-shake";
	document.body.appendChild(element);
	return element;
}

describe("shakeElement", () => {
	test("plays one shake and clears the trigger when it ends", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const target = renderTarget();

		shakeElement(target);

		const [animation] = shakesOf(target);
		if (animation == null) {
			throw new Error("expected a running shake");
		}
		animation.finish();
		await animation.finished;
		await Promise.resolve();
		expect(target).not.toHaveAttribute("data-shake");
		expect(shakesOf(target)).toHaveLength(0);
	});

	test("a second call mid-shake restarts the same animation from rest", () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const target = renderTarget();

		shakeElement(target);
		const [first] = shakesOf(target);
		if (first == null) {
			throw new Error("expected a running shake");
		}
		first.currentTime = 200;

		shakeElement(target);

		expect(shakesOf(target)).toEqual([first]);
		expect(first.currentTime).toBe(0);
	});

	test("a call after a shake ends starts a new one", async () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": true });
		const target = renderTarget();

		shakeElement(target);
		const [first] = shakesOf(target);
		first?.finish();
		await first?.finished;
		await Promise.resolve();

		shakeElement(target);

		expect(shakesOf(target)).toHaveLength(1);
	});

	test("does nothing under reduced motion", () => {
		mockMatchMedia({ "(prefers-reduced-motion: no-preference)": false });
		const target = renderTarget();

		shakeElement(target);

		expect(target).not.toHaveAttribute("data-shake");
		expect(target.getAnimations()).toHaveLength(0);
	});
});
