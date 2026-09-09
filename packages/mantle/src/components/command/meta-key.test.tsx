import { render, screen } from "@testing-library/react";
import { Profiler } from "react";
import type { ProfilerOnRenderCallback } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { MetaKey } from "./meta-key.js";

describe("MetaKey", () => {
	test("renders the Command glyph on an Apple host in a single mount commit", () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
		const onRender = vi.fn<ProfilerOnRenderCallback>();

		render(
			<Profiler id="meta-key" onRender={onRender}>
				<MetaKey />
			</Profiler>,
		);

		expect(screen.getByText("⌘")).toBeInTheDocument();
		expect(screen.getByText("Command")).toBeInTheDocument();
		// One commit. A platform hook that seeds `false` and corrects itself in an
		// effect adds an `"update"` commit and paints `⌃` first.
		const phases = onRender.mock.calls.map(([, phase]) => phase);
		expect(phases).toEqual(["mount"]);
	});

	test("renders the Control glyph on a non-Apple host", () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");

		render(<MetaKey />);

		expect(screen.getByText("⌃")).toBeInTheDocument();
		expect(screen.getByText("Control")).toBeInTheDocument();
	});

	test("renders the Control glyph in the server HTML, even on an Apple host", () => {
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");

		const html = renderToString(<MetaKey />);

		expect(html).toContain("⌃");
		expect(html).toContain("Control");
		expect(html).not.toContain("⌘");
	});

	test("renders a kbd with its slot, a locked translate, and the consumer's className", () => {
		render(<MetaKey className="custom" data-testid="meta" />);

		const kbd = screen.getByTestId("meta");
		expect(kbd.tagName).toBe("KBD");
		expect(kbd).toHaveAttribute("data-slot", "meta-key");
		expect(kbd).toHaveAttribute("translate", "no");
		expect(kbd).toHaveClass("custom");
	});
});
