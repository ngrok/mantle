import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Field } from "../field/field.js";
import { OtpInput } from "./otp-input.js";

describe("OtpInput", () => {
	test("Field.Control wrapping OtpInput.Root applies field ARIA wiring to the hidden input", () => {
		render(
			<Field.Item name="code">
				<Field.Control>
					<OtpInput.Root maxLength={3} data-testid="otp">
						<OtpInput.Group>
							<OtpInput.Slot index={0} />
							<OtpInput.Slot index={1} />
							<OtpInput.Slot index={2} />
						</OtpInput.Group>
					</OtpInput.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Enter your code.</Field.Description>
			</Field.Item>,
		);

		const input = screen.getByTestId("otp");
		const errors = screen.getByTestId("errors");
		const description = screen.getByTestId("desc");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input.getAttribute("aria-describedby")).toContain(errors.id);
		expect(input.getAttribute("aria-describedby")).toContain(description.id);
		expect(input).toHaveAttribute("aria-errormessage", errors.id);
	});

	describe("translation", () => {
		test('every slot renders translate="no" so a translation engine skips the passcode', () => {
			render(
				<OtpInput.Root maxLength={3} aria-label="otp">
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
						<OtpInput.Slot index={1} />
						<OtpInput.Slot index={2} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);

			const slots = document.querySelectorAll('[data-slot="otp-input-slot"]');
			expect(slots).toHaveLength(3);
			for (const slot of slots) {
				expect(slot).toHaveAttribute("translate", "no");
			}
		});

		test("a translation engine skips the slots, so clearing a character cannot throw", () => {
			const handleChange = vi.fn<(value: string) => void>();
			const subject = (value: string) => (
				<div>
					<p>Enter your code</p>
					<OtpInput.Root maxLength={3} aria-label="otp" value={value} onChange={handleChange}>
						<OtpInput.Group>
							<OtpInput.Slot index={0} />
							<OtpInput.Slot index={1} />
							<OtpInput.Slot index={2} />
						</OtpInput.Group>
					</OtpInput.Root>
				</div>
			);
			const { container, rerender } = render(subject("12"));
			translateTextNodes(container);

			// The engine model ran — it translated the prose beside the control...
			expect(screen.getByText("[Enter your code-es]")).toBeInTheDocument();
			// ...and it left every slot alone, because each one carries translate="no".
			const slots = container.querySelectorAll('[data-slot="otp-input-slot"]');
			expect(slots[1]?.querySelector("font")).toBeNull();
			expect(slots[1]).toHaveTextContent("2");

			// A backspace removes the character React holds. The slot renders that
			// character as a sibling of the conditional caret, so React removes a text
			// node rather than rewriting one — and a reparented text node makes that
			// removal throw. The guard is what keeps the engine out of this subtree.
			rerender(subject("1"));

			expect(slots[0]).toHaveTextContent("1");
			expect(slots[1]).toHaveTextContent("");
		});

		test('keeps translate="no" when a call site passes translate', () => {
			render(
				<OtpInput.Root maxLength={1} aria-label="otp">
					<OtpInput.Group>
						<OtpInput.Slot
							index={0}
							data-testid="slot"
							// @ts-expect-error `translate` is omitted from the props type on purpose. This
							// pins the runtime guard for a caller who spreads a wider props object past it.
							translate="yes"
						/>
					</OtpInput.Group>
				</OtpInput.Root>,
			);

			expect(screen.getByTestId("slot")).toHaveAttribute("translate", "no");
		});
	});
});
