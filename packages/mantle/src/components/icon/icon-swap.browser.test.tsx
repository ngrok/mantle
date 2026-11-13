import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { IconSwap } from "./icon-swap.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and these
// tests read the visibility that the component's real classes compute.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss("./icon-swap.tsx");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

// Why pinned: the swap transition is `motion-safe`, and the host's own setting
// would otherwise decide which path a test runs.
beforeEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

const icons = {
	idle: <svg data-testid="idle" />,
	loading: <svg data-testid="loading" />,
};

/** The `icon-swap-item` span of one icon. */
const itemOf = (testId: string): HTMLElement => {
	const item = screen.getByTestId(testId).parentElement;
	if (item == null) {
		throw new Error(`The ${testId} icon has no item span.`);
	}
	return item;
};

test("an inactive icon is not rendered, so a hidden spinner paints nothing", () => {
	render(<IconSwap active="idle" icons={icons} />);

	expect(getComputedStyle(itemOf("loading")).visibility).toBe("hidden");
	expect(getComputedStyle(itemOf("idle")).visibility).toBe("visible");
});

test("a swap shows the next icon and hides the last one when its exit ends", async () => {
	const { rerender } = render(<IconSwap active="idle" icons={icons} />);
	// Why read before the swap: a transition needs a computed style to start from.
	expect(getComputedStyle(itemOf("idle")).visibility).toBe("visible");

	rerender(<IconSwap active="loading" icons={icons} />);

	// The exit transition holds the outgoing icon visible while it fades.
	expect(getComputedStyle(itemOf("idle")).visibility).toBe("visible");
	await expect.poll(() => getComputedStyle(itemOf("loading")).visibility).toBe("visible");
	await expect.poll(() => getComputedStyle(itemOf("idle")).visibility).toBe("hidden");
});

test("under reduced motion, a swap hides the last icon at once", async () => {
	await commands.emulateMedia({ reducedMotion: "reduce" });
	const { rerender } = render(<IconSwap active="idle" icons={icons} />);
	expect(getComputedStyle(itemOf("idle")).visibility).toBe("visible");

	rerender(<IconSwap active="loading" icons={icons} />);

	expect(getComputedStyle(itemOf("idle")).visibility).toBe("hidden");
	expect(getComputedStyle(itemOf("loading")).visibility).toBe("visible");
});
