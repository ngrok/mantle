import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import { PasswordInput } from "./password-input.js";

/**
 * happy-dom reports `(prefers-reduced-motion: no-preference)` as matching but
 * implements no Web Animations API, so the reveal animation would throw inside
 * the toggle's click handler. Forcing reduced motion keeps these tests focused
 * on the visibility contract — the animation itself is covered in
 * `password-input.browser.test.tsx`.
 *
 * Uses the shared stub rather than a local object literal, which dropped every registered
 * `"change"` listener on the floor.
 */
const stubPrefersReducedMotion = () => {
	mockMatchMedia({ "(prefers-reduced-motion: no-preference)": false });
};

describe("PasswordInput", () => {
	test('given validation={false}, renders an input with aria-invalid="false" and not have data-validation', () => {
		render(<PasswordInput placeholder="test" validation={false} />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByPlaceholderText("test")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders an input with aria-invalid="false" and data-validation="success"', () => {
		render(<PasswordInput placeholder="test" validation="success" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders an input with aria-invalid="false" and data-validation="warning"', () => {
		render(<PasswordInput placeholder="test" validation="warning" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" validation="error" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" aria-invalid="true" validation="success" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" aria-invalid="true" validation="warning" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" aria-invalid="true" validation="error" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test("overrides the Input container data-slot with password-input", () => {
		render(<PasswordInput placeholder="test" />);

		const container = document.querySelector('[data-slot="password-input"]');
		expect(container).not.toBeNull();
		expect(container).toContainElement(screen.getByPlaceholderText("test"));
	});

	describe("visibility", () => {
		test("hides the value and offers to turn visibility on by default", () => {
			render(<PasswordInput placeholder="test" />);

			expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "password");
			expect(
				screen.getByRole("button", { name: "Turn password visibility on" }),
			).toBeInTheDocument();
		});

		test("showValue reveals the value on first paint", () => {
			render(<PasswordInput placeholder="test" showValue />);

			expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "text");
			expect(
				screen.getByRole("button", { name: "Turn password visibility off" }),
			).toBeInTheDocument();
		});

		test("follows showValue in both directions when the parent controls it", () => {
			const { rerender } = render(<PasswordInput placeholder="test" showValue={false} />);
			expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "password");

			rerender(<PasswordInput placeholder="test" showValue />);
			expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "text");

			rerender(<PasswordInput placeholder="test" showValue={false} />);
			expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "password");
		});

		test("the built-in toggle still reports changes while showValue is supplied", async () => {
			const user = userEvent.setup();
			stubPrefersReducedMotion();
			const handleVisibilityChange = vi.fn<(visible: boolean) => void>();
			render(
				<PasswordInput
					placeholder="test"
					showValue={false}
					onValueVisibilityChange={handleVisibilityChange}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Turn password visibility on" }));

			expect(handleVisibilityChange).toHaveBeenCalledTimes(1);
			expect(handleVisibilityChange).toHaveBeenLastCalledWith(true);
			expect(screen.getByPlaceholderText("test")).toHaveAttribute("type", "text");
			expect(
				screen.getByRole("button", { name: "Turn password visibility off" }),
			).toBeInTheDocument();
		});
	});
});
