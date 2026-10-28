// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PointerEventsCheckLevel, userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SandbarOverSheetDemo, SandbarReducedMotionDemo } from "./sandbar-demos";

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
		expect(screen.queryByText("motion allowed")).not.toBeNull();
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
		expect(screen.queryByText(/rises 400ms on enter/)).not.toBeNull();

		fireEvent.click(screen.getByRole("switch", { name: /simulate reduced motion/i }));

		expect(screen.queryByText(/fades in and out/)).not.toBeNull();
		expect(screen.queryByText(/rises 400ms on enter/)).toBeNull();
	});

	it("hides and reshows the bar, so the enter and exit are both reachable", () => {
		render(<SandbarReducedMotionDemo />);
		expect(getPanel().getAttribute("data-state")).toBe("open");

		fireEvent.click(screen.getByRole("button", { name: "Hide the bar" }));
		expect(getPanel().getAttribute("data-state")).toBe("closed");

		fireEvent.click(screen.getByRole("button", { name: "Show the bar" }));
		// Why "open" at once: the panel is still visible mid-exit, so the reopen
		// skips the pre-enter frame.
		expect(getPanel().getAttribute("data-state")).toBe("open");
	});
});

describe("SandbarOverSheetDemo", () => {
	it("saves from the bar while the sheet stays open", async () => {
		// Why skip the pointer-events check: the open sheet sets `pointer-events: none`
		// on <body>, and tests load no Tailwind for the panel's `pointer-events-auto`.
		const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
		render(<SandbarOverSheetDemo />);

		await user.type(screen.getByRole("textbox", { name: "Endpoint name" }), "-v2");
		await user.click(screen.getByRole("button", { name: "View endpoint details" }));
		await screen.findByRole("dialog");

		// The open sheet marks the bar `aria-hidden`, so the query passes `hidden: true`.
		await user.click(screen.getByRole("button", { name: "Save changes", hidden: true }));

		expect(screen.queryByRole("dialog")).not.toBeNull();
		expect(getPanel().getAttribute("data-state")).toBe("closed");
		expect(screen.queryByRole("heading", { name: "my-agent-endpoint-v2" })).not.toBeNull();
	});

	it("keeps the bar reachable by keyboard once the sheet closes", async () => {
		const user = userEvent.setup();
		render(<SandbarOverSheetDemo />);

		await user.type(screen.getByRole("textbox", { name: "Endpoint name" }), "-v2");
		await user.click(screen.getByRole("button", { name: "View endpoint details" }));
		await screen.findByRole("dialog");
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});

		const save = screen.getByRole("button", { name: "Save changes" });
		while (document.activeElement !== save && document.activeElement !== document.body) {
			await user.tab();
		}
		expect(document.activeElement).toBe(save);
	});
});
