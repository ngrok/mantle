"use client";

import { render, screen } from "@testing-library/react";
import type { ClipboardEvent } from "react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, userEvent as browserUser } from "vitest/browser";
import * as Field from "../field/field-parts.js";
import * as OtpInput from "./otp-input-parts.js";
import { REGEXP_ONLY_DIGITS } from "./patterns.js";

/**
 * Render a default 6-slot OTP input. Returns the native input that takes
 * keystrokes and paste, and the six slots.
 */
type RenderOtpProps = {
	defaultValue?: string;
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

	const input = screen.getByRole<HTMLInputElement>("textbox", { name: "otp" });
	const slots = [...result.container.querySelectorAll('[data-slot="otp-input-slot"]')];

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

	test("pattern restricts accepted characters: letters are rejected when REGEXP_ONLY_DIGITS is set", async () => {
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
			// oxlint-disable-next-line consistent-function-scoping -- Why: the transformer reads best beside the test that passes it.
			const pasteTransformer = (pasted: string) => pasted.replace(/[\s-]/g, "");
			const { input } = renderOtp({ pasteTransformer });

			await user.click(input);
			await user.paste("123-456");

			expect(input).toHaveValue("123456");
		});

		test("a controlled parent that keeps its value keeps the input on that value after a transformed paste", async () => {
			const user = userEvent.setup();
			const { container } = render(
				<OtpInput.Root
					maxLength={3}
					aria-label="otp"
					value="123"
					onChange={() => {}}
					pasteTransformer={(pasted) => pasted.trim()}
				>
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
						<OtpInput.Slot index={1} />
						<OtpInput.Slot index={2} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);
			const input = screen.getByRole("textbox", { name: "otp" });

			await user.click(input);
			await user.paste(" 9 ");

			expect(input).toHaveValue("123");
			expect(container.querySelectorAll('[data-slot="otp-input-slot"]')[2]).toHaveTextContent("3");
		});

		test.each([
			["the input is read-only", { readOnly: true }],
			[
				"the consumer's onPaste cancels the paste",
				{ onPaste: (event: ClipboardEvent<HTMLInputElement>) => event.preventDefault() },
			],
		])("a transformed paste changes nothing when %s", async (_case, props) => {
			const user = userEvent.setup();
			const handleChange = vi.fn<(value: string) => void>();
			render(
				<OtpInput.Root
					maxLength={3}
					aria-label="otp"
					onChange={handleChange}
					pasteTransformer={(pasted) => pasted.trim()}
					{...props}
				>
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
						<OtpInput.Slot index={1} />
						<OtpInput.Slot index={2} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);
			const input = screen.getByRole("textbox", { name: "otp" });

			await user.click(input);
			await user.paste("42");

			expect(input).toHaveValue("");
			expect(handleChange).toHaveBeenCalledTimes(0);
		});

		test("pasting characters that don't match `pattern` rejects the paste", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp({ pattern: REGEXP_ONLY_DIGITS });

			await user.click(input);
			await user.paste("abc");

			// A paste that does not satisfy the pattern is rejected, so the value
			// stays empty.
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

	test("the slot at the caret position has data-highlighted", async () => {
		const user = userEvent.setup();
		const { input, slots } = renderOtp();

		await user.click(input);
		// Caret starts at index 0 when the input is focused with no value.
		expect(slots[0]).toHaveAttribute("data-highlighted");

		await user.keyboard("12");
		// After typing 2 chars, the caret is now at index 2.
		expect(slots[2]).toHaveAttribute("data-highlighted");
		expect(slots[0]).not.toHaveAttribute("data-highlighted");
		expect(slots[1]).not.toHaveAttribute("data-highlighted");
	});

	test("the empty active slot draws a 1px caret in the slot's text color, and it blinks", async () => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./otp-input.tsx", { mantleCss: true });
		document.head.append(style);
		try {
			const user = userEvent.setup();
			const { input, slots } = renderOtp();

			await user.click(input);
			await user.keyboard("1");
			await expect.poll(() => slots[1]?.hasAttribute("data-highlighted")).toBe(true);

			const blink = slots[1]?.querySelector("[aria-hidden]");
			const caret = blink?.firstElementChild;
			if (!(blink instanceof HTMLElement) || !(caret instanceof HTMLElement) || slots[1] == null) {
				throw new Error("expected a caret in the active slot");
			}
			const caretStyle = getComputedStyle(caret);
			expect(caretStyle.borderInlineStartWidth).toBe("1px");
			expect(caretStyle.borderInlineStartColor).toBe(getComputedStyle(slots[1]).color);
			const { height } = caret.getBoundingClientRect();
			expect(height).toBeGreaterThan(0);
			expect(height).toBeLessThan(slots[1].getBoundingClientRect().height);
			expect(getComputedStyle(blink).animationName).toBe("caret-blink");
			// A filled slot shows its character, not a caret.
			expect(slots[0]?.querySelector("[aria-hidden]")).toBeNull();
		} finally {
			style.remove();
		}
	});

	describe("selection", () => {
		// Why the vitest/browser keyboard: an arrow key must move the native selection.
		test("a caret on a filled slot selects that slot, so typing replaces its character", async () => {
			const { input, slots } = renderOtp({ defaultValue: "123456" });

			await browserUser.click(input);
			await expect.poll(() => slots[5]?.hasAttribute("data-highlighted")).toBe(true);
			await browserUser.keyboard("{ArrowLeft}");
			await expect.poll(() => slots[4]?.hasAttribute("data-highlighted")).toBe(true);
			expect(slots[5]).not.toHaveAttribute("data-highlighted");

			await browserUser.keyboard("9");
			expect(input).toHaveValue("123496");
			expect(slots[4]).toHaveTextContent("9");
		});

		// Why the vitest/browser click: `@testing-library/user-event` wraps the value setter of an
		// input it focuses, and the browser then fires no `selectionchange` for React's write.
		test("a controlled reset while focused moves the active slot to the first slot", async () => {
			const subject = (value: string) => (
				<OtpInput.Root maxLength={3} aria-label="otp" value={value} onChange={() => {}}>
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
						<OtpInput.Slot index={1} />
						<OtpInput.Slot index={2} />
					</OtpInput.Group>
				</OtpInput.Root>
			);
			const { container, rerender } = render(subject("12"));
			const slots = [...container.querySelectorAll('[data-slot="otp-input-slot"]')];

			const input = screen.getByRole<HTMLInputElement>("textbox", { name: "otp" });
			await browserUser.click(input);
			input.setSelectionRange(2, 2);
			await expect.poll(() => slots[2]?.hasAttribute("data-highlighted")).toBe(true);

			rerender(subject(""));

			await expect.poll(() => slots[0]?.hasAttribute("data-highlighted")).toBe(true);
			expect(slots[2]).not.toHaveAttribute("data-highlighted");
		});
	});

	describe("password manager badge gutter", () => {
		let styleElement: HTMLStyleElement;

		beforeAll(async () => {
			styleElement = document.createElement("style");
			// Why the reset: mantle.css ships Tailwind's preflight, which the browser project does not load.
			styleElement.textContent = [
				"*, ::before, ::after { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }",
				await commands.tailwindCss("./otp-input.tsx"),
			].join("\n");
			document.head.append(styleElement);
		});

		afterAll(() => {
			styleElement.remove();
		});

		test.each([
			["fits", 300, 40],
			["does not fit", 220, 0],
		])(
			"the input covers the slots, and focus widens it past the last slot when the gutter %s",
			async (_case, clipWidth, gutter) => {
				const user = userEvent.setup();
				render(
					<div style={{ width: clipWidth, overflow: "hidden" }}>
						<div style={{ width: 200 }}>
							<OtpInput.Root maxLength={3} aria-label="otp">
								<OtpInput.Group>
									<OtpInput.Slot index={0} />
									<OtpInput.Slot index={1} />
									<OtpInput.Slot index={2} />
								</OtpInput.Group>
							</OtpInput.Root>
						</div>
					</div>,
				);
				const input = screen.getByRole("textbox", { name: "otp" });
				const slots = input.closest("[data-input-otp-container]");
				if (slots == null) {
					throw new Error("OtpInput.Root rendered no container.");
				}

				await user.click(input);

				const inputBox = input.getBoundingClientRect();
				const slotsBox = slots.getBoundingClientRect();
				expect(slotsBox.height).toBe(40);
				expect(inputBox.top).toBe(slotsBox.top);
				expect(inputBox.height).toBe(slotsBox.height);
				expect(inputBox.left).toBe(slotsBox.left);
				expect(inputBox.width).toBe(slotsBox.width + gutter);
			},
		);

		test("a badge that a password manager puts after the input takes the pointer", () => {
			render(
				<OtpInput.Root maxLength={3} aria-label="otp">
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
						<OtpInput.Slot index={1} />
						<OtpInput.Slot index={2} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);
			const input = screen.getByRole("textbox", { name: "otp" });
			const badge = document.createElement("span");
			input.after(badge);

			expect(getComputedStyle(badge).pointerEvents).toBe("auto");
			expect(input.parentElement && getComputedStyle(input.parentElement).pointerEvents).toBe(
				"none",
			);
			badge.remove();
		});
	});

	// `data-otp-state` is what every conditional slot/group style keys off, and it
	// is derived from the count of active slots. Needs real selection APIs, so it
	// lives in browser mode.
	describe("data-otp-state", () => {
		test("goes idle → caret when the input is focused with a single caret slot", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp();

			expect(otpState()).toBe("idle");

			await user.click(input);
			expect(otpState()).toBe("caret");

			await user.keyboard("12");
			expect(otpState()).toBe("caret");
		});

		test("goes back to idle when the input is blurred", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp();

			await user.click(input);
			expect(otpState()).toBe("caret");

			input.blur();
			await expect.poll(otpState).toBe("idle");
		});

		test("reports `all` when every slot is selected and `range` for a partial selection", async () => {
			const user = userEvent.setup();
			const { input } = renderOtp();

			await user.click(input);
			await user.keyboard("123456");
			await user.keyboard("{Control>}a{/Control}");
			await expect.poll(otpState).toBe("all");

			// Every assertion below asserts a state *different* from the previous
			// one, so a stale read can't satisfy it. One slot short of the whole
			// input is still a range, never `all`.
			input.setSelectionRange(0, 5);
			await expect.poll(otpState).toBe("range");

			input.setSelectionRange(0, 6);
			await expect.poll(otpState).toBe("all");

			// A two-slot selection in the middle is a range, not a caret.
			input.setSelectionRange(2, 4);
			await expect.poll(otpState).toBe("range");
		});
	});

	describe("Field integration", () => {
		test("the typed code submits under the field's name", async () => {
			const user = userEvent.setup();
			render(
				<form aria-label="verify form">
					<Field.Item name="code">
						<Field.Label>Code</Field.Label>
						<Field.Control>
							<OtpInput.Root maxLength={3} data-testid="otp">
								<OtpInput.Group>
									<OtpInput.Slot index={0} />
									<OtpInput.Slot index={1} />
									<OtpInput.Slot index={2} />
								</OtpInput.Group>
							</OtpInput.Root>
						</Field.Control>
					</Field.Item>
				</form>,
			);

			// Clicking the field's label must focus the OTP input. That only works
			// if `htmlFor` and the input's `id` agree.
			await user.click(screen.getByText("Code"));
			await user.keyboard("428");

			expect(screen.getByTestId("otp")).toHaveFocus();
			expect(
				new FormData(screen.getByRole<HTMLFormElement>("form", { name: "verify form" })).get(
					"code",
				),
			).toBe("428");
		});
	});
});

/** The current `data-otp-state` published by the bridge, or `null` when unmounted. */
function otpState() {
	return document.querySelector("[data-otp-state]")?.getAttribute("data-otp-state") ?? null;
}
