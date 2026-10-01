import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { Checkbox } from "../checkbox/checkbox.js";
import { Field } from "../field/field.js";
import { Switch } from "../switch/switch.js";
import { Choice } from "./choice.js";

describe("Choice", () => {
	test("Indicator injects an id onto its control child", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(screen.getByRole("checkbox")).toHaveAttribute("id", expect.stringMatching(/.+/));
	});

	test("Label renders a <label> whose htmlFor targets the injected control id", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		const control = screen.getByRole("checkbox");
		const label = screen.getByText("Email");
		expect(screen.getByLabelText("Email")).toBe(control);
		expect(label).toHaveAttribute("for", control.id);
	});

	test("Title renders text that does not label the control", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Title>Onboarding Key</Choice.Title>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(screen.getByText("Onboarding Key")).toBeInTheDocument();
		expect(screen.queryByLabelText("Onboarding Key")).not.toBeInTheDocument();
	});

	test("Description is associated to the control via aria-describedby", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
					<Choice.Description>Get notified by email.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		const control = screen.getByRole("checkbox");
		const description = screen.getByText("Get notified by email.");
		expect(description.id).toMatch(/.+/);
		expect(control.getAttribute("aria-describedby")?.split(" ")).toContain(description.id);
	});

	test("Choice.Root owns the Description id: a stray id cannot break aria-describedby", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
					<Choice.Description
						// @ts-expect-error -- id is not a Choice.Description prop; Choice.Root owns it
						id="elsewhere"
					>
						Get notified by email.
					</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		const control = screen.getByRole("checkbox");
		const description = screen.getByText("Get notified by email.");
		expect(description.id).not.toBe("elsewhere");
		expect(control.getAttribute("aria-describedby")?.split(" ")).toContain(description.id);
	});

	test("disabled disables the control and marks the Label disabled", () => {
		render(
			<Choice.Root disabled>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(screen.getByRole("checkbox")).toBeDisabled();
		// Why `data-disabled`: only the mantle `Label` stamps it, so this also pins that `Choice.Label` is that `Label`.
		expect(screen.getByText("Email")).toHaveAttribute("data-disabled", "true");
	});

	test("name lands on the control", () => {
		render(
			<Choice.Root name="notify">
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(screen.getByRole("checkbox")).toHaveAttribute("name", "notify");
	});

	test("does not clobber disabled / name set on the control itself", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" name="custom" disabled />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		const control = screen.getByRole("checkbox");
		expect(control).toBeDisabled();
		expect(control).toHaveAttribute("name", "custom");
	});

	test("forwards aria-errormessage from Root onto the control (standalone, not the wrapper)", () => {
		render(
			<Choice.Root aria-errormessage="error-1" aria-invalid="true">
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		const control = screen.getByRole("checkbox");
		expect(control).toHaveAttribute("aria-errormessage", "error-1");
		// It must land on the control, not leak onto the layout wrapper.
		expect(control.closest('[data-slot="choice"]')).not.toHaveAttribute("aria-errormessage");
	});

	test("a part rendered outside Root throws", () => {
		expect(() => render(<Choice.Label>orphan</Choice.Label>)).toThrow(
			/Choice\.Label must be rendered inside Choice\.Root/,
		);
	});
});

describe("Choice — clicking the Label toggles the control", () => {
	test("checkbox, standalone", async () => {
		const user = userEvent.setup();
		render(
			<Choice.Root name="terms">
				<Choice.Indicator>
					<Checkbox />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>I agree to the terms</Choice.Label>
					<Choice.Description>You can change this later.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
		await user.click(screen.getByText("I agree to the terms"));
		expect(checkbox).toBeChecked();
	});

	test("checkbox, inside a Field", async () => {
		const user = userEvent.setup();
		render(
			<Field.Item name="notify">
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<Checkbox />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Email</Choice.Label>
							<Choice.Description>Sent to your primary address.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
			</Field.Item>,
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
		// Why a Field: `Choice.Root` takes the control id from `Field.Control`, so the label must target that id, not its own.
		await user.click(screen.getByText("Email"));
		expect(checkbox).toBeChecked();
	});

	test("switch, standalone", async () => {
		const user = userEvent.setup();
		render(
			<Choice.Root name="airplane-mode">
				<Choice.Indicator>
					<Switch />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Airplane mode</Choice.Label>
					<Choice.Description>Disables wireless radios while in flight.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);

		// Why a switch: a `<button role="switch">` is labelable, so the `htmlFor` on
		// `Choice.Label` forwards the click to it.
		const toggle = screen.getByRole("switch");
		expect(toggle).not.toBeChecked();
		await user.click(screen.getByText("Airplane mode"));
		expect(toggle).toBeChecked();
	});
});

describe("Choice — Description extends the label's click target", () => {
	test("clicking the Description toggles the control once, through Choice.Label", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<() => void>();
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" onChange={onChange} />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
					<Choice.Description>Get notified by email.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		const control = screen.getByRole("checkbox");
		expect(control).not.toBeChecked();
		await user.click(screen.getByText("Get notified by email."));
		expect(control).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	test("with Choice.Title the Description forwards nothing, so an ancestor label toggles the control once", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<() => void>();
		render(
			// oxlint-disable-next-line jsx-a11y/label-has-associated-control -- `Choice.Title` renders the label text
			<label htmlFor="onboarding-key">
				<Choice.Root id="onboarding-key">
					<Choice.Indicator>
						<input type="checkbox" onChange={onChange} />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Title>Onboarding Key</Choice.Title>
						<Choice.Description>ng-3FaThZL***8xiA</Choice.Description>
					</Choice.Content>
				</Choice.Root>
			</label>,
		);
		const control = screen.getByRole("checkbox");
		await user.click(screen.getByText("ng-3FaThZL***8xiA"));
		expect(control).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	test("a click on a link inside the Description does not toggle the control", async () => {
		const user = userEvent.setup();
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
					<Choice.Description asChild>
						<div>
							Supports <a href="#docs">rich content</a> when rendered as a div.
						</div>
					</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		await user.click(screen.getByRole("link", { name: "rich content" }));
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	test("after the forward, the click is marked handled so a click-to-activate ancestor defers", async () => {
		const user = userEvent.setup();
		const onAncestorClick = vi.fn<(event: MouseEvent<HTMLDivElement>) => void>();
		render(
			<div role="presentation" onClick={onAncestorClick}>
				<Choice.Root>
					<Choice.Indicator>
						<input type="checkbox" aria-label="control" />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Label>Email</Choice.Label>
						<Choice.Description>Get notified by email.</Choice.Description>
					</Choice.Content>
				</Choice.Root>
			</div>,
		);
		await user.click(screen.getByText("Get notified by email."));
		expect(screen.getByRole("checkbox")).toBeChecked();
		// The description's own click arrives handled; the forwarded label click
		// and the control's click bubble too, and those stay untouched.
		const descriptionClick = onAncestorClick.mock.calls.find(
			([event]) => event.target === screen.getByText("Get notified by email."),
		);
		expect(descriptionClick?.[0].defaultPrevented).toBe(true);
	});

	test("a skipped forward leaves the click unhandled for the ancestor", async () => {
		const user = userEvent.setup();
		const onAncestorClick = vi.fn<(event: MouseEvent<HTMLDivElement>) => void>();
		render(
			<div role="presentation" onClick={onAncestorClick}>
				<Choice.Root>
					<Choice.Indicator>
						<input type="checkbox" aria-label="control" />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Label>Email</Choice.Label>
						<Choice.Description asChild>
							<div>
								See the <a href="#docs">docs</a>.
							</div>
						</Choice.Description>
					</Choice.Content>
				</Choice.Root>
			</div>,
		);
		await user.click(screen.getByRole("link", { name: "docs" }));
		expect(onAncestorClick).toHaveBeenCalledTimes(1);
		expect(onAncestorClick.mock.calls[0]?.[0].defaultPrevented).toBe(false);
	});

	test("a <details> that wraps the whole choice does not stop the forward", async () => {
		const user = userEvent.setup();
		render(
			<details open>
				<summary>Notifications</summary>
				<Choice.Root>
					<Choice.Indicator>
						<input type="checkbox" aria-label="control" />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Label>Email</Choice.Label>
						<Choice.Description>Get notified by email.</Choice.Description>
					</Choice.Content>
				</Choice.Root>
			</details>,
		);
		await user.click(screen.getByText("Get notified by email."));
		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	test("a consumer onClick runs first, and preventDefault() cancels the forward", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>((event) => {
			event.preventDefault();
		});
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
					<Choice.Description onClick={onClick}>Get notified by email.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		await user.click(screen.getByText("Get notified by email."));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});
});

describe("Choice + Switch interop", () => {
	test("Indicator wires a Switch: id on the switch, Label htmlFor targets it, description associated", () => {
		render(
			<Choice.Root name="airplane-mode">
				<Choice.Indicator>
					<Switch />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Airplane mode</Choice.Label>
					<Choice.Description>Disables wireless radios while in flight.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		// Radix Switch renders a role="switch" button that receives the injected id.
		const control = screen.getByRole("switch");
		expect(control).toHaveAttribute("id", expect.stringMatching(/.+/));
		expect(screen.getByText("Airplane mode")).toHaveAttribute("for", control.id);
		expect(control.getAttribute("aria-describedby")?.split(" ")).toContain(
			screen.getByText("Disables wireless radios while in flight.").id,
		);
	});

	test("disabled flows from Root onto the Switch", () => {
		render(
			<Choice.Root disabled>
				<Choice.Indicator>
					<Switch />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Airplane mode</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(screen.getByRole("switch")).toBeDisabled();
	});
});

describe("Choice + Field interop", () => {
	test("Field.Label and Choice.Label both target the control id (merged, clickable labels)", () => {
		render(
			<Field.Item name="notify">
				<Field.Label>Notifications</Field.Label>
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<input type="checkbox" aria-label="control" />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Email</Choice.Label>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
			</Field.Item>,
		);
		const control = screen.getByRole("checkbox");
		expect(screen.getByText("Notifications")).toHaveAttribute("for", control.id);
		// The rich title is a real <label> for the same control, so clicking it toggles.
		const choiceLabel = screen.getByText("Email");
		expect(screen.getByLabelText("Email")).toBe(control);
		expect(choiceLabel).toHaveAttribute("for", control.id);
		expect(control).toHaveAttribute("name", "notify");
	});

	test("aria-describedby merges the field's description with the choice's own", () => {
		render(
			<Field.Item name="notify">
				<Field.Label>Notifications</Field.Label>
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<input type="checkbox" aria-label="control" />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Email</Choice.Title>
							<Choice.Description>Sent to your primary address.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
				<Field.Description>How we reach you.</Field.Description>
			</Field.Item>,
		);
		const control = screen.getByRole("checkbox");
		const describedBy = control.getAttribute("aria-describedby")?.split(" ") ?? [];
		expect(describedBy).toContain(screen.getByText("Sent to your primary address.").id);
		expect(describedBy).toContain(screen.getByText("How we reach you.").id);
		// No id is listed twice.
		expect(new Set(describedBy).size).toBe(describedBy.length);
	});
});
