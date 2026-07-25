"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PasswordInput } from "./password-input.js";

/**
 * `getPrefersReducedMotion()` queries `(prefers-reduced-motion: no-preference)`
 * and inverts the result, so `matches: false` means "reduce motion" and
 * `matches: true` means "animate".
 */
const stubPrefersReducedMotion = ({ reduced }: { reduced: boolean }) => {
	vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
		matches: !reduced,
		media: query,
		onchange: null,
		addListener: vi.fn<() => void>(),
		removeListener: vi.fn<() => void>(),
		addEventListener: vi.fn<() => void>(),
		removeEventListener: vi.fn<() => void>(),
		dispatchEvent: vi.fn<() => boolean>(),
	}));
};

describe("PasswordInput (browser)", () => {
	test("clicking the visibility toggle switches the input type between password and text", async () => {
		const user = userEvent.setup();
		render(<PasswordInput placeholder="test" />);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Turn password visibility on" });

		expect(input).toHaveAttribute("type", "password");

		await user.click(toggle);
		expect(input).toHaveAttribute("type", "text");
		expect(
			screen.getByRole("button", { name: "Turn password visibility off" }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Turn password visibility off" }));
		expect(input).toHaveAttribute("type", "password");
	});

	test("clicking the toggle fires onValueVisibilityChange with the new visibility", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn<(visible: boolean) => void>();
		render(<PasswordInput placeholder="test" onValueVisibilityChange={handleChange} />);

		const toggle = screen.getByRole("button", { name: /turn password visibility/i });

		await user.click(toggle);
		expect(handleChange).toHaveBeenCalledTimes(1);
		expect(handleChange).toHaveBeenLastCalledWith(true);

		await user.click(toggle);
		expect(handleChange).toHaveBeenCalledTimes(2);
		expect(handleChange).toHaveBeenLastCalledWith(false);
	});

	test("animates the revealed icon when motion is allowed", async () => {
		const user = userEvent.setup();
		stubPrefersReducedMotion({ reduced: false });
		const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");

		render(<PasswordInput placeholder="test" />);

		await user.click(screen.getByRole("button", { name: /turn password visibility/i }));

		expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "text");
		expect(animateSpy).toHaveBeenCalledTimes(1);
		expect(animateSpy).toHaveBeenLastCalledWith(
			[{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
			{ duration: 200, easing: "ease-out" },
		);
	});

	test("cancels an in-flight animation so rapid toggles are never blocked", () => {
		stubPrefersReducedMotion({ reduced: false });
		const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");
		const cancelSpy = vi.spyOn(Animation.prototype, "cancel");

		render(<PasswordInput placeholder="test" />);
		const toggle = screen.getByRole("button", { name: /turn password visibility/i });

		// Two synchronous clicks land well inside the 200ms animation, so the
		// second one has to cancel the first before starting its own.
		fireEvent.click(toggle);
		fireEvent.click(toggle);

		expect(animateSpy).toHaveBeenCalledTimes(2);
		expect(cancelSpy).toHaveBeenCalledTimes(1);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "password");
	});

	test("does not call Element.animate when prefers-reduced-motion is enabled", async () => {
		const user = userEvent.setup();
		stubPrefersReducedMotion({ reduced: true });

		render(<PasswordInput placeholder="test" />);
		const toggle = screen.getByRole("button", { name: /turn password visibility/i });
		expect(toggle.querySelector("svg")).toBeInTheDocument();

		const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");

		await user.click(toggle);

		expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "text");
		expect(animateSpy).not.toHaveBeenCalled();
	});
});
