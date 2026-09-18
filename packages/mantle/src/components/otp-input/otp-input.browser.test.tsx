"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { OtpInput, REGEXP_ONLY_DIGITS } from "./otp-input.js";

/**
 * Render a default 6-slot OTP input. Returns the hidden input that accepts
 * keystrokes/paste — input-otp renders a real `<input>` we can target via
 * the textbox role.
 */
// Loosely-typed root props for the test helper — the real `OtpInput.Root`
// type is a discriminated union (render | children) which doesn't compose
// cleanly with `Partial<>`. The runtime contract is the same.
type RenderOtpProps = {
	maxLength?: number;
	disabled?: boolean;
	pattern?: string;
	onChange?: (value: string) => void;
	onComplete?: (value: string) => void;
	pasteTransformer?: (pasted: string) => string;
};

function renderOtp(props: RenderOtpProps = {}) {
	const result = render(
		<OtpInput.Root maxLength={6} aria-label="otp" {...props}>
			<OtpInput.Group>
				<OtpInput.Slot index={0} />
				<OtpInput.Slot index={1} />
				<OtpInput.Slot index={2} />
			</OtpInput.Group>
			<OtpInput.Separator />
			<OtpInput.Group>
				<OtpInput.Slot index={3} />
				<OtpInput.Slot index={4} />
				<OtpInput.Slot index={5} />
			</OtpInput.Group>
		</OtpInput.Root>,
	);

	const input = screen.getByRole("textbox", { name: "otp" });
	const slots = screen.getAllByText("", { selector: '[data-slot="otp-input-slot"]' });

	return { ...result, input, slots };
}

describe("OtpInput (browser)", () => {
	test("typing fills slots in order and exposes the typed characters via context", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderOtp();

		await user.click(input);
		await user.keyboard("123");

		expect(input).toHaveValue("123");
		expect(slots[0]).toHaveTextContent("1");
		expect(slots[1]).toHaveTextContent("2");
		expect(slots[2]).toHaveTextContent("3");
		expect(slots[3]).toHaveTextContent("");
	});

	test("backspace removes the last character", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderOtp();

		await user.click(input);
		await user.keyboard("12{Backspace}");

		expect(input).toHaveValue("1");
		expect(slots[0]).toHaveTextContent("1");
		expect(slots[1]).toHaveTextContent("");
	});

	test("onChange is called with each new value", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn<(value: string) => void>();
		const { input } = renderOtp({ onChange: handleChange });

		await user.click(input);
		await user.keyboard("ab");

		expect(handleChange).toHaveBeenCalledTimes(2);
		expect(handleChange).toHaveBeenNthCalledWith(1, "a");
		expect(handleChange).toHaveBeenLastCalledWith("ab");
	});

	test("onComplete fires when the final slot is filled", async () => {
		const user = userEvent.setup();
		const handleComplete = vi.fn<(value: string) => void>();
		const { input } = renderOtp({ onComplete: handleComplete });

		await user.click(input);
		await user.keyboard("12345");
		expect(handleComplete).not.toHaveBeenCalled();

		await user.keyboard("6");
		expect(handleComplete).toHaveBeenCalledTimes(1);
		expect(handleComplete).toHaveBeenCalledWith("123456");
	});

	test("disabled prevents typing", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderOtp({ disabled: true });

		expect(input).toBeDisabled();

		await user.click(input);
		await user.keyboard("123");

		expect(input).toHaveValue("");
		expect(slots[0]).toHaveTextContent("");
	});

	test("pattern restricts accepted characters — letters are rejected when REGEXP_ONLY_DIGITS is set", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderOtp({ pattern: REGEXP_ONLY_DIGITS });

		await user.click(input);
		await user.keyboard("1a2b3");

		expect(input).toHaveValue("123");
		expect(slots[0]).toHaveTextContent("1");
		expect(slots[1]).toHaveTextContent("2");
		expect(slots[2]).toHaveTextContent("3");
	});

	describe("paste", () => {
		test("pasting a full code fills every slot and triggers onComplete", async () => {
			const user = userEvent.setup();
			const handleComplete = vi.fn<(value: string) => void>();
			const { input, slots } = renderOtp({ onComplete: handleComplete });

			await user.click(input);
			await user.paste("987654");

			expect(input).toHaveValue("987654");
			expect(slots[0]).toHaveTextContent("9");
			expect(slots[1]).toHaveTextContent("8");
			expect(slots[2]).toHaveTextContent("7");
			expect(slots[3]).toHaveTextContent("6");
			expect(slots[4]).toHaveTextContent("5");
			expect(slots[5]).toHaveTextContent("4");
			expect(handleComplete).toHaveBeenCalledExactlyOnceWith("987654");
		});

		test("pasting more than maxLength is truncated to maxLength", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp();

			await user.click(input);
			await user.paste("1234567890");

			expect(input).toHaveValue("123456");
		});

		test("pasting a partial code fills only the corresponding slots", async () => {
			const user = userEvent.setup();
			const { input, slots } = renderOtp();

			await user.click(input);
			await user.paste("42");

			expect(input).toHaveValue("42");
			expect(slots[0]).toHaveTextContent("4");
			expect(slots[1]).toHaveTextContent("2");
			expect(slots[2]).toHaveTextContent("");
		});

		test("pasteTransformer rewrites the pasted value before it is consumed", async () => {
			const user = userEvent.setup();
			// e.g. strip dashes/spaces from "123-456" → "123456"
			// oxlint-disable-next-line consistent-function-scoping
			const pasteTransformer = (pasted: string) => pasted.replace(/[\s-]/g, "");
			const { input } = renderOtp({ pasteTransformer });

			await user.click(input);
			await user.paste("123-456");

			expect(input).toHaveValue("123456");
		});

		test("pasting characters that don't match `pattern` rejects the paste", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp({ pattern: REGEXP_ONLY_DIGITS });

			await user.click(input);
			await user.paste("abc");

			// input-otp rejects pastes that don't satisfy the pattern, so the
			// value stays empty.
			expect(input).toHaveValue("");
		});

		test("pasting after typing inserts at the caret and truncates to maxLength", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp();

			await user.click(input);
			await user.keyboard("12");
			// Caret is at position 2; paste inserts there, then the whole value
			// is clipped to maxLength=6.
			await user.paste("999999");

			expect(input).toHaveValue("129999");
		});
	});

	test("the slot at the caret position has data-active", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderOtp();

		await user.click(input);
		// Caret starts at index 0 when the input is focused with no value.
		expect(slots[0]).toHaveAttribute("data-active");

		await user.keyboard("12");
		// After typing 2 chars, the caret is now at index 2.
		expect(slots[2]).toHaveAttribute("data-active");
		expect(slots[0]).not.toHaveAttribute("data-active");
		expect(slots[1]).not.toHaveAttribute("data-active");
	});
});
