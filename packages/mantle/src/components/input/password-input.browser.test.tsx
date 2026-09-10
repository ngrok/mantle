"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PasswordInput } from "./password-input.js";

describe("PasswordInput (browser)", () => {
	test("clicking the visibility toggle switches the input type between password and text", async () => {
		const user = userEvent.setup();
		render(<PasswordInput placeholder="test" />);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Show value" });

		expect(input).toHaveAttribute("type", "password");
		expect(toggle).toHaveAttribute("aria-pressed", "false");

		await user.click(toggle);
		expect(input).toHaveAttribute("type", "text");
		// The name stays fixed; `aria-pressed` carries the state.
		expect(toggle).toHaveAccessibleName("Show value");
		expect(toggle).toHaveAttribute("aria-pressed", "true");

		await user.click(toggle);
		expect(input).toHaveAttribute("type", "password");
		expect(toggle).toHaveAccessibleName("Show value");
		expect(toggle).toHaveAttribute("aria-pressed", "false");
	});

	test("clicking the toggle fires onValueVisibilityChange with the new visibility", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn<(visible: boolean) => void>();
		render(<PasswordInput placeholder="test" onValueVisibilityChange={handleChange} />);

		const toggle = screen.getByRole("button", { name: "Show value" });

		await user.click(toggle);
		expect(handleChange).toHaveBeenCalledTimes(1);
		expect(handleChange).toHaveBeenLastCalledWith(true);

		await user.click(toggle);
		expect(handleChange).toHaveBeenCalledTimes(2);
		expect(handleChange).toHaveBeenLastCalledWith(false);
	});

	test("does not call Element.animate when prefers-reduced-motion is enabled", async () => {
		const user = userEvent.setup();
		// Simulate prefers-reduced-motion: reduce
		vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
			matches: false, // "(prefers-reduced-motion: no-preference)" → false means reduced motion
			media: query,
			onchange: null,
			addListener: vi.fn<() => void>(),
			removeListener: vi.fn<() => void>(),
			addEventListener: vi.fn<() => void>(),
			removeEventListener: vi.fn<() => void>(),
			dispatchEvent: vi.fn<() => boolean>(),
		}));

		render(<PasswordInput placeholder="test" />);
		const toggle = screen.getByRole("button", { name: "Show value" });
		const icon = toggle.querySelector("svg");
		expect(icon).toBeInTheDocument();

		const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");

		await user.click(toggle);

		expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "text");
		expect(animateSpy).not.toHaveBeenCalled();
	});
});
