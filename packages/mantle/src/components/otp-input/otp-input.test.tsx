import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { OtpInput } from "./otp-input.js";

/**
 * Loosely-typed root props for the test helper — the real `OtpInput.Root` type is
 * a discriminated union (render | children) which doesn't compose cleanly with
 * `Partial<>`. The runtime contract is the same.
 */
type RenderOtpProps = {
	"aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
	validation?:
		| "error"
		| "success"
		| "warning"
		| false
		| (() => "error" | "success" | "warning" | false);
};

/** Render a default 6-slot OTP input split into two groups by a separator. */
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

	return { ...result, input: screen.getByRole("textbox", { name: "otp" }) };
}

describe("OtpInput", () => {
	test("renders maxLength slots with the correct data-slot attributes", () => {
		renderOtp();

		expect(screen.getAllByText("", { selector: '[data-slot="otp-input-slot"]' })).toHaveLength(6);
		expect(screen.getAllByText("", { selector: '[data-slot="otp-input-group"]' })).toHaveLength(2);
		expect(
			screen.getByText("", { selector: '[data-slot="otp-input-separator"]' }),
		).toBeInTheDocument();
	});

	test("Field.Control wrapping OtpInput.Root applies field ARIA wiring to the hidden input", () => {
		render(
			<Field.Item name="code">
				<Field.Label data-testid="label">Code</Field.Label>
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
		// `id` and `name` ride the same conditional spread as the aria props:
		// `name` is what makes the control submit, `id` is what `Field.Label`'s
		// `htmlFor` resolves to.
		expect(input).toHaveAttribute("name", "code");
		expect(input.id).toBeTruthy();
		expect(screen.getByTestId("label")).toHaveAttribute("for", input.id);
	});

	describe("compound parts", () => {
		test("Group renders a div", () => {
			renderOtp();

			for (const group of screen.getAllByText("", {
				selector: '[data-slot="otp-input-group"]',
			})) {
				expect(group.tagName).toBe("DIV");
			}
		});

		test("Separator is decorative by default (role='none', aria-hidden) and renders the minus icon", () => {
			renderOtp();

			const separator = screen.getByText("", {
				selector: '[data-slot="otp-input-separator"]',
			});
			expect(separator).toHaveAttribute("role", "none");
			expect(separator).toHaveAttribute("aria-hidden", "true");
			expect(separator.querySelector("svg")).toBeInTheDocument();
		});

		test("Separator with `semantic` renders with role='separator'", () => {
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

			const separator = screen.getByRole("separator");
			expect(separator).toHaveAttribute("data-slot", "otp-input-separator");
			expect(separator).not.toHaveAttribute("aria-hidden");
		});

		test("Separator children replace the default minus icon", () => {
			render(
				<OtpInput.Root maxLength={2} aria-label="otp">
					<OtpInput.Group>
						<OtpInput.Slot index={0} />
					</OtpInput.Group>
					<OtpInput.Separator semantic>
						<span data-testid="custom-sep">·</span>
					</OtpInput.Separator>
					<OtpInput.Group>
						<OtpInput.Slot index={1} />
					</OtpInput.Group>
				</OtpInput.Root>,
			);

			expect(screen.getByTestId("custom-sep")).toHaveTextContent("·");
			// The default MinusIcon renders a bare `<svg>`, so its absence is the
			// only signal that `children ?? <MinusIcon />` still replaces rather
			// than appends.
			expect(screen.getByRole("separator").querySelector("svg")).toBeNull();
		});

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
			expect(customGroup.tagName).toBe("SECTION");
			expect(customGroup).toHaveAttribute("data-slot", "otp-input-group");
		});
	});

	describe("validation", () => {
		test("no validation prop leaves data-validation unset on the bridge and aria-invalid unset on the input", () => {
			const { input } = renderOtp();

			const bridge = document.querySelector("[data-otp-state]");
			expect(bridge).not.toBeNull();
			expect(bridge).not.toHaveAttribute("data-validation");
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		test("validation='error' sets data-validation=error on the bridge and aria-invalid on the input", () => {
			const { input } = renderOtp({ validation: "error" });

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute(
				"data-validation",
				"error",
			);
			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		test("validation='success' sets data-validation=success and does NOT mark aria-invalid", () => {
			const { input } = renderOtp({ validation: "success" });

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute(
				"data-validation",
				"success",
			);
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		test("validation='warning' sets data-validation=warning and does NOT mark aria-invalid", () => {
			const { input } = renderOtp({ validation: "warning" });

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute(
				"data-validation",
				"warning",
			);
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		test("aria-invalid='true' forces data-validation=error with non-error validation", () => {
			const { input } = renderOtp({ "aria-invalid": "true", validation: "success" });

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute(
				"data-validation",
				"error",
			);
			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		test("validation as a function is resolved and applied", () => {
			const { input } = renderOtp({ validation: () => "error" });

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute(
				"data-validation",
				"error",
			);
			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		test("validation={false} is treated as no validation", () => {
			const { input } = renderOtp({ validation: false });

			expect(document.querySelector("[data-otp-state]")).not.toHaveAttribute("data-validation");
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		test("validation inherited from Field.Item reaches the bridge and the input", () => {
			render(
				<Field.Item name="code" validation="warning">
					<Field.Control>
						<OtpInput.Root maxLength={1} data-testid="otp">
							<OtpInput.Group>
								<OtpInput.Slot index={0} />
							</OtpInput.Group>
						</OtpInput.Root>
					</Field.Control>
				</Field.Item>,
			);

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute(
				"data-validation",
				"warning",
			);
			// A warning is not an invalid state, and `OtpInput` opts out of the
			// default `aria-invalid="false"`, so the attribute stays off entirely.
			expect(screen.getByTestId("otp")).not.toHaveAttribute("aria-invalid");
		});
	});

	describe("data-otp-state", () => {
		test("is idle before the input is focused", () => {
			renderOtp();

			expect(document.querySelector("[data-otp-state]")).toHaveAttribute("data-otp-state", "idle");
		});
	});
});
