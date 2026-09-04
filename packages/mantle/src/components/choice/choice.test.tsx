import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
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
		// `h-lh` resolves to the element's own line-height, so the indicator must use
		// the same `text-sm` line box as the title/label — otherwise it sizes to the
		// inherited line-height and the control can't vertically center on the first line.
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
		expect(title).not.toHaveAttribute("for");
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

	test("disabled disables the control and dims the text", () => {
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
		expect(screen.getByText("Email")).toHaveClass("opacity-50");
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

	test("Label reuses the base Label component (keeps its styling + context-owned wiring)", () => {
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
		// It IS the mantle Label, not a re-implementation, so it keeps base-label
		// styling (cursor-pointer); htmlFor + disabled are owned by Choice.Root.
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveClass("cursor-pointer");
		expect(label).toHaveAttribute("for", control.id);
		expect(label).toHaveAttribute("aria-disabled", "true");
		expect(label).toHaveClass("opacity-50");
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

	// Each row pins one entry of the interactive-content selector: drop that entry
	// and its row toggles the control.
	test.each([
		{
			name: "a <summary> inside a <details>",
			content: (
				<details>
					<summary>More</summary>
					Extra text.
				</details>
			),
			query: () => screen.getByText("More"),
		},
		{
			name: "a nested <label>",
			content: (
				<label>
					Also <input type="checkbox" />
				</label>
			),
			query: () => screen.getByText("Also"),
		},
		{
			name: "a <video controls>",
			content: (
				<video controls aria-label="preview">
					<track kind="captions" />
				</video>
			),
			query: () => screen.getByLabelText("preview"),
		},
	])(
		"a click on $name inside the Description does not toggle the control",
		async ({ content, query }) => {
			const user = userEvent.setup();
			render(
				<Choice.Root>
					<Choice.Indicator>
						<input type="checkbox" aria-label="control" />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Label>Email</Choice.Label>
						<Choice.Description asChild>
							<div>{content}</div>
						</Choice.Description>
					</Choice.Content>
				</Choice.Root>,
			);
			await user.click(query());
			expect(screen.getByRole("checkbox", { name: "control" })).not.toBeChecked();
		},
	);

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
		expect(screen.getByText("Airplane mode")).toHaveClass("opacity-50");
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
