// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SandbarReducedMotionDemo } from "./sandbar-demos";

afterEach(() => {
	cleanup();
});

function getPanel(): HTMLElement {
	const panel = document.querySelector('[data-slot="sandbar"]');
	if (!(panel instanceof HTMLElement)) {
		throw new Error("sandbar panel not found");
	}
	return panel;
}

describe("SandbarReducedMotionDemo", () => {
	it("reports the system preference, which happy-dom leaves at motion allowed", () => {
		render(<SandbarReducedMotionDemo />);
		expect(screen.getByText("motion allowed")).not.toBeNull();
	});

	it("swaps the panel's travel utility for stillness when the switch is on", () => {
		render(<SandbarReducedMotionDemo />);

		// tailwind-merge override contract: flipping the switch must actually replace
		// the panel's travel utility, not merely add a class beside it. The variant
		// chain is what decides that, so this pins the outcome rather than the input.
		const panel = getPanel();
		expect(panel.className).toContain("translate-y-[calc(100%+2.5rem)]");

		fireEvent.click(screen.getByRole("switch", { name: /simulate reduced motion/i }));

		expect(getPanel().className).toContain("motion-safe:data-state-closed:translate-y-0");
		expect(getPanel().className).not.toContain("translate-y-[calc(100%+2.5rem)]");
		// the wiggle suppressor rides along, since `shake()` reads the real preference
		expect(getPanel().className).toContain("transform-none!");
	});

	it("describes the motion it will use, and updates when the switch flips", () => {
		render(<SandbarReducedMotionDemo />);
		expect(screen.getByText(/rises 400ms on enter/)).not.toBeNull();

		fireEvent.click(screen.getByRole("switch", { name: /simulate reduced motion/i }));

		expect(screen.getByText(/fades in and out/)).not.toBeNull();
		expect(screen.queryByText(/rises 400ms on enter/)).toBeNull();
	});

	it("hides and reshows the bar, so the enter and exit are both reachable", () => {
		render(<SandbarReducedMotionDemo />);
		expect(getPanel().getAttribute("data-state")).toBe("open");

		fireEvent.click(screen.getByRole("button", { name: "Hide the bar" }));
		expect(getPanel().getAttribute("data-state")).toBe("closed");

		fireEvent.click(screen.getByRole("button", { name: "Show the bar" }));
		// the enter paints one frame in the closed pose before transitioning
		expect(getPanel().hasAttribute("hidden")).toBe(false);
	});
});
