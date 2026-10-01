import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Field } from "../field/field.js";
import { OtpInput } from "./otp-input.js";

type RenderOtpProps = Pick<ComponentProps<typeof OtpInput.Root>, "aria-invalid" | "validation">;

/**
 * Renders the six-slot composition from the docs page. `bridge` is the element
 * that carries `data-otp-state` and `data-validation`.
 */
const renderOtp = (props: RenderOtpProps = {}) => {
	const { container } = render(
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
	const bridge = container.querySelector<HTMLElement>("[data-otp-state]");
	if (bridge == null) {
		throw new Error("OtpInput.Root rendered no bridge element.");
	}

	return { bridge, container, input };
};

describe("OtpInput", () => {
	test("stamps each part with its data-slot", () => {
		const { container, input } = renderOtp();

		expect(input).toHaveAttribute("data-slot", "otp-input");
		expect(container.querySelectorAll('[data-slot="otp-input-group"]')).toHaveLength(2);
		expect(container.querySelectorAll('[data-slot="otp-input-slot"]')).toHaveLength(6);
		expect(container.querySelectorAll('[data-slot="otp-input-separator"]')).toHaveLength(1);
	});

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

	describe("compound parts", () => {
		test("Group asChild renders the child element instead of a div", () => {
			render(
				<OtpInput.Root maxLength={1} aria-label="otp">
					<OtpInput.Group asChild>
						<section data-testid="custom-group">
							<OtpInput.Slot index={0} />
						</section>
					</OtpInput.Group>
				</OtpInput.Root>,
			);

			const customGroup = screen.getByTestId("custom-group");
			// Why tagName: the asChild swap renders the child element in place of the default.
			expect(customGroup.tagName).toBe("SECTION");
			expect(customGroup).toHaveAttribute("data-slot", "otp-input-group");
		});

		test("Separator is decorative and renders the minus icon by default", () => {
			const { container } = renderOtp();

			const separator = container.querySelector('[data-slot="otp-input-separator"]');
			expect(separator).toHaveAttribute("role", "none");
			expect(separator).toHaveAttribute("aria-hidden", "true");
			expect(container.querySelector('[data-slot="otp-input-separator"] svg')).toBeInTheDocument();
		});

		test("Separator with `semantic` renders role='separator'", () => {
			render(
				<OtpInput.Root maxLength={2} aria-label="otp">
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
					</OtpInput.Group>
					<OtpInput.Separator semantic />
					<OtpInput.Group>
						<OtpInput.Slot index={1} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);

			expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "otp-input-separator");
		});

		test("Separator children replace the default minus icon", () => {
			render(
				<OtpInput.Root maxLength={2} aria-label="otp">
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
					</OtpInput.Group>
					<OtpInput.Separator semantic>
						<span>·</span>
					</OtpInput.Separator>
					<OtpInput.Group>
						<OtpInput.Slot index={1} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);

			const separator = screen.getByRole("separator");
			expect(separator).toHaveTextContent("·");
			expect(separator.querySelector("svg")).toBeNull();
		});
	});

	describe("validation", () => {
		test("leaves the bridge unstamped and aria-invalid unset when validation is omitted", () => {
			const { bridge, input } = renderOtp();

			expect(bridge).not.toHaveAttribute("data-validation");
			expect(bridge.style.getPropertyValue("--otp-validation-border")).toBe("");
			expect(bridge.style.getPropertyValue("--otp-validation-ring")).toBe("");
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		// Why a table: each validation value is its own entry in the hue lookup, so
		// only a case per value catches a permuted row.
		test.each([
			["error", "var(--color-danger-600)", "var(--ring-color-focus-danger)"],
			["success", "var(--color-success-600)", "var(--ring-color-focus-success)"],
			["warning", "var(--color-warning-600)", "var(--ring-color-focus-warning)"],
		] as const)(
			"validation=%s stamps the bridge and sets its hue variables",
			(validation, border, ring) => {
				const { bridge } = renderOtp({ validation });

				expect(bridge).toHaveAttribute("data-validation", validation);
				expect(bridge.style.getPropertyValue("--otp-validation-border")).toBe(border);
				expect(bridge.style.getPropertyValue("--otp-validation-ring")).toBe(ring);
			},
		);

		test("validation='error' marks the input aria-invalid", () => {
			const { input } = renderOtp({ validation: "error" });

			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		test("aria-invalid='true' forces data-validation=error over a non-error validation", () => {
			const { bridge, input } = renderOtp({ "aria-invalid": "true", validation: "success" });

			expect(bridge).toHaveAttribute("data-validation", "error");
			expect(input).toHaveAttribute("aria-invalid", "true");
		});
	});

	describe("translation", () => {
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
