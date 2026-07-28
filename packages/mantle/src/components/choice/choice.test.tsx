import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { Switch } from "../switch/switch.js";
import { Choice } from "./choice.js";

describe("Choice", () => {
	// `data-slot` is public API — consumer CSS selects on it — so a rename or a
	// moved slot is a breaking change. Pin every part to the element it lands on.
	test.each([
		["choice", "DIV"],
		["choice-indicator", "SPAN"],
		["choice-content", "DIV"],
		["choice-label", "LABEL"],
		["choice-description", "P"],
	])("data-slot=%s lands on a <%s>", (slot, tagName) => {
		const { container } = render(
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
		expect(container.querySelector(`[data-slot="${slot}"]`)?.tagName).toBe(tagName);
	});

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

	test("Indicator shares the title's text-sm line box so the control centers on the first line", () => {
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
		// Cross-file spelling pin, asserted on both sides in one test. `h-lh` in
		// choice.tsx resolves against the *indicator's own* line-height, so it only
		// produces a one-line box that matches the title when the indicator's
		// `text-sm` equals the font size `Label` (label.tsx) sets on the title. If
		// either file's `text-sm` moves, the control silently stops centering on the
		// title's first line — and neither Vitest project loads Tailwind, so nothing
		// but the class spelling can observe the pair here.
		const indicator = screen.getByRole("checkbox").closest('[data-slot="choice-indicator"]');
		expect(indicator).toHaveClass("h-lh", "items-center", "text-sm");
		expect(screen.getByText("Email")).toHaveClass("text-sm");
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
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("for", control.id);
	});

	test("Title renders label-less text (a <p>, not a <label>)", () => {
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
		const title = screen.getByText("Onboarding Key");
		expect(title.tagName).toBe("P");
		expect(title).toHaveAttribute("data-slot", "choice-title");
		expect(title).not.toHaveAttribute("for");
		// Nothing labels the control: Title must not become the accessible name, so
		// the control keeps the name it was given itself.
		expect(screen.getByRole("checkbox")).toHaveAccessibleName("control");
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

	test("disabled disables the control and marks the label disabled", () => {
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
		// The label's disabled state is announced, not merely dimmed: Root's
		// `disabled` reaches `Label`'s own `disabled` prop, which emits aria-disabled.
		expect(screen.getByText("Email")).toHaveAttribute("aria-disabled", "true");
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

	test("Label reuses the base Label component (keeps its behavior + context-owned wiring)", () => {
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
		const control = screen.getByRole("checkbox");
		const label = screen.getByText("Email");
		expect(label.tagName).toBe("LABEL");
		// It IS the mantle `Label`, not a re-implementation: only label.tsx installs
		// the double-click text-selection guard (preventDefault once detail > 1), so
		// a hand-rolled <label> here would let the second click select the text.
		expect(fireEvent.mouseDown(label, { detail: 1 })).toBe(true);
		expect(fireEvent.mouseDown(label, { detail: 2 })).toBe(false);
		// htmlFor + disabled are owned by Choice.Root and applied after the props
		// spread, so consumer props can never unwire the label from the control.
		expect(label).toHaveAttribute("for", control.id);
		expect(label).toHaveAttribute("aria-disabled", "true");
	});

	test("forwards aria-invalid and aria-errormessage from Root onto the control (standalone, not the wrapper)", () => {
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
		expect(control).toHaveAttribute("aria-invalid", "true");
		expect(control).toHaveAttribute("aria-errormessage", "error-1");
		// They must land on the control, not leak onto the layout wrapper.
		const wrapper = control.closest('[data-slot="choice"]');
		expect(wrapper).not.toHaveAttribute("aria-invalid");
		expect(wrapper).not.toHaveAttribute("aria-errormessage");
	});

	test("an explicit id on Root becomes the control id and the Label's htmlFor target", () => {
		render(
			<Choice.Root id="notify-email">
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(screen.getByRole("checkbox")).toHaveAttribute("id", "notify-email");
		expect(screen.getByText("Email")).toHaveAttribute("for", "notify-email");
	});

	test("Indicator renders a non-element child untouched", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>–</Choice.Indicator>
				<Choice.Content>
					<Choice.Title>Onboarding Key</Choice.Title>
				</Choice.Content>
			</Choice.Root>,
		);
		// There is nothing to clone the association props onto, so the child is
		// passed through rather than crashing `cloneElement`.
		expect(screen.getByText("–")).toHaveAttribute("data-slot", "choice-indicator");
	});

	test("a part rendered outside Root throws", () => {
		expect(() => render(<Choice.Label>orphan</Choice.Label>)).toThrow(
			/Choice\.Label must be rendered inside Choice\.Root/,
		);
	});
});

describe("Choice asChild", () => {
	test("Description asChild keeps the description id, data-slot, and the aria-describedby association", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Email</Choice.Label>
					<Choice.Description asChild className="italic">
						<a href="/docs/email">Read the docs</a>
					</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);

		const description = screen.getByRole("link", { name: "Read the docs" });
		expect(description.tagName).toBe("A");
		expect(description).toHaveAttribute("href", "/docs/email");
		expect(description).toHaveAttribute("data-slot", "choice-description");
		expect(description).toHaveClass("italic");
		expect(screen.getByRole("checkbox").getAttribute("aria-describedby")?.split(" ")).toContain(
			description.id,
		);
	});

	test("Title asChild renders the supplied element", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Title asChild>
						<h3>Onboarding Key</h3>
					</Choice.Title>
				</Choice.Content>
			</Choice.Root>,
		);

		const title = screen.getByRole("heading", { name: "Onboarding Key" });
		expect(title.tagName).toBe("H3");
		expect(title).toHaveAttribute("data-slot", "choice-title");
	});

	test("Content asChild renders the supplied element", () => {
		render(
			<Choice.Root>
				<Choice.Indicator>
					<input type="checkbox" aria-label="control" />
				</Choice.Indicator>
				<Choice.Content asChild>
					<section data-testid="content">
						<Choice.Label>Email</Choice.Label>
					</section>
				</Choice.Content>
			</Choice.Root>,
		);

		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("SECTION");
		expect(content).toHaveAttribute("data-slot", "choice-content");
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
		expect(screen.getByText("Airplane mode")).toHaveAttribute("aria-disabled", "true");
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
		expect(choiceLabel.tagName).toBe("LABEL");
		expect(choiceLabel).toHaveAttribute("for", control.id);
		expect(control).toHaveAttribute("name", "notify");
	});

	test("the field's id wins over an explicit id on Choice.Root", () => {
		render(
			<Field.Item name="notify">
				<Field.Label>Notifications</Field.Label>
				<Field.Control>
					<Choice.Root id="ignored-choice-id">
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
		// Field wins so `Field.Label htmlFor` and `Choice.Label htmlFor` resolve
		// to the same control; reversing the precedence would desynchronize them.
		const control = screen.getByRole("checkbox");
		// Non-empty, or the two `for` assertions below would pass on `for=""`.
		expect(control.id).toMatch(/.+/);
		expect(control.id).not.toBe("ignored-choice-id");
		expect(screen.getByText("Notifications")).toHaveAttribute("for", control.id);
		expect(screen.getByText("Email")).toHaveAttribute("for", control.id);
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
