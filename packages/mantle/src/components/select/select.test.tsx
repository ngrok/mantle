import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Field } from "../field/field.js";
import { Select } from "./select.js";

describe("Select", () => {
	test("Select.Root onBlur fires when the trigger blurs, after the trigger's own onBlur", async () => {
		const user = userEvent.setup();
		const calls: string[] = [];
		const rootBlur = vi.fn<() => void>(() => {
			calls.push("root");
		});
		const triggerBlur = vi.fn<() => void>(() => {
			calls.push("trigger");
		});
		render(
			<>
				<Select.Root onBlur={rootBlur}>
					<Select.Trigger onBlur={triggerBlur} />
				</Select.Root>
				<button type="button">Next</button>
			</>,
		);

		await user.tab();
		expect(screen.getByRole("combobox")).toHaveFocus();
		await user.tab();
		expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
		expect(rootBlur).toHaveBeenCalledTimes(1);
		expect(triggerBlur).toHaveBeenCalledTimes(1);
		expect(calls).toEqual(["trigger", "root"]);
	});

	test("callback refs on Select.Root and Select.Trigger fire once with the trigger across a re-render", () => {
		const rootRefSpy = vi.fn<(node: HTMLButtonElement | null) => void>();
		const triggerRefSpy = vi.fn<(node: HTMLButtonElement | null) => void>();
		// Why a factory: React bails out of a re-render when it receives the same
		// element object, so each render needs fresh elements with the same props.
		const renderTree = () => (
			<Select.Root ref={rootRefSpy}>
				<Select.Trigger ref={triggerRefSpy}>
					<Select.Value placeholder="Pick" />
				</Select.Trigger>
			</Select.Root>
		);
		const { rerender } = render(renderTree());
		rerender(renderTree());

		const trigger = screen.getByRole("combobox");
		expect(triggerRefSpy).toHaveBeenCalledTimes(1);
		expect(triggerRefSpy).toHaveBeenLastCalledWith(trigger);
		expect(rootRefSpy).toHaveBeenCalledTimes(1);
		expect(rootRefSpy).toHaveBeenLastCalledWith(trigger);
	});

	test('given validation={false}, renders a Select.Trigger with aria-invalid="false" and not have data-validation', () => {
		render(
			<Select.Root validation={false}>
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a Select.Trigger with aria-invalid="false" and data-validation="success"', () => {
		render(
			<Select.Root validation="success">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a Select.Trigger with aria-invalid="false" and data-validation="warning"', () => {
		render(
			<Select.Root validation="warning">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root validation="error">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="success">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="warning">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="error">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test("Field.Item validation={false} suppresses inferred error state on the trigger", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root>
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).not.toHaveAttribute("data-validation");
	});

	test("Select.Trigger validation wins over Field.Item validation", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root>
					<Field.Control>
						<Select.Trigger validation="warning" />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "warning");
	});

	test("Select.Root validation wins over Field.Item validation", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root validation="error">
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test("Field.Control wrapping Select.Root applies field ARIA wiring to the trigger", () => {
		// The user-friendly form puts Field.Control above Select.Root, not
		// around Select.Trigger. cloneElement onto Select.Root reaches the
		// trigger via SelectContext for id / aria-invalid, and the trigger
		// reads FieldControlContext for aria-describedby / aria-errormessage
		// (which Select.Root does not forward).
		render(
			<Field.Item name="example">
				<Field.Control>
					<Select.Root>
						<Select.Trigger
							aria-describedby="ignored-description"
							aria-errormessage="ignored-error"
							data-testid="trigger"
							id="ignored-trigger"
						>
							<Select.Value placeholder="Pick" />
						</Select.Trigger>
					</Select.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Pick a fruit.</Field.Description>
			</Field.Item>,
		);

		const trigger = screen.getByTestId("trigger");
		const errors = screen.getByTestId("errors");
		const description = screen.getByTestId("desc");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger.getAttribute("aria-describedby")).toContain(errors.id);
		expect(trigger.getAttribute("aria-describedby")).toContain(description.id);
		expect(trigger.getAttribute("aria-describedby")).not.toContain("ignored-description");
		expect(trigger).toHaveAttribute("aria-errormessage", errors.id);
		expect(trigger).not.toHaveAttribute("id", "ignored-trigger");
	});

	test("Field.Control outside Field.Item does not override Select props", () => {
		render(
			<Field.Control>
				<Select.Root validation="error">
					<Select.Trigger data-testid="trigger" id="fruit">
						<Select.Value placeholder="Pick" />
					</Select.Trigger>
				</Select.Root>
			</Field.Control>,
		);

		const trigger = screen.getByTestId("trigger");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger).toHaveAttribute("data-validation", "error");
		expect(trigger).toHaveAttribute("id", "fruit");
	});

	test("rendered Field errors force the trigger into error state even when Select.Root says otherwise", () => {
		// Field.Control wires aria-invalid="true" onto the trigger when the
		// Field has rendered errors, and an explicit invalid aria value always
		// resolves to "error" in parseValidation — so a "warning" claim from
		// Select.Root is overridden in this case. Consumers who need the
		// non-error Select.Root state to win must suppress the inferred error
		// via `validation` on Field.Item or Field.Control.
		render(
			<Field.Item name="example">
				<Select.Root validation="warning">
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
				<Field.Errors messages={["Pick a value."]} />
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	describe("data-slot", () => {
		test("every part carries its slot, and the selected label reaches the trigger", async () => {
			const user = userEvent.setup();
			render(
				<Select.Root defaultValue="apple">
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Fruits</Select.Label>
							<Select.Item value="apple">Apple</Select.Item>
						</Select.Group>
						<Select.Separator />
						<Select.Group>
							<Select.Label>Veggies</Select.Label>
							<Select.Item value="carrot">Carrot</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveAttribute("data-slot", "select-trigger");
			const value = trigger.querySelector('[data-slot="select-value"]');
			expect(value).toBeInstanceOf(HTMLSpanElement);
			// Radix portals the selected item's children into the value node, so
			// the label span is the node it later removes.
			expect(value?.querySelector('[data-slot="select-item-label"]')).toHaveTextContent("Apple");

			await user.click(trigger);

			const listbox = await screen.findByRole("listbox");
			const option = screen.getByRole("option", { name: "Apple" });
			expect(listbox).toHaveAttribute("data-slot", "select-content");
			expect(screen.getByRole("group", { name: "Fruits" })).toHaveAttribute(
				"data-slot",
				"select-group",
			);
			expect(screen.getByText("Fruits")).toHaveAttribute("data-slot", "select-label");
			expect(option).toHaveAttribute("data-slot", "select-item");
			expect(listbox.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
			expect(option.querySelector('[data-slot="select-item-label"]')).toHaveTextContent("Apple");
		});

		test("the placeholder renders inside its own slot until a value is picked", () => {
			render(
				<Select.Root>
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger.querySelector('[data-slot="select-placeholder"]')).toHaveTextContent(
				"Select a fruit",
			);
			expect(trigger.querySelector('[data-slot="select-item-label"]')).not.toBeInTheDocument();
		});

		test("Select.Value with children renders them and no placeholder slot", () => {
			render(
				<Select.Root value="apple">
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit">Custom apple</Select.Value>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger.querySelector('[data-slot="select-value"]')).toHaveTextContent("Custom apple");
			expect(trigger.querySelector('[data-slot="select-value-label"]')).toHaveTextContent(
				"Custom apple",
			);
			expect(trigger.querySelector('[data-slot="select-placeholder"]')).not.toBeInTheDocument();
			expect(trigger.querySelector('[data-slot="select-item-label"]')).not.toBeInTheDocument();
		});

		test("a consumer data-slot joins ahead of the part's own slot on Select.Value and Select.Item", async () => {
			const user = userEvent.setup();
			render(
				<Select.Root defaultValue="apple">
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" data-slot="app-value" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple" data-slot="app-item">
							Apple
						</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger.querySelector('[data-slot="app-value select-value"]')).toBeInstanceOf(
				HTMLSpanElement,
			);
			expect(trigger.querySelector('[data-slot="select-value"]')).not.toBeInTheDocument();

			await user.click(trigger);

			expect(await screen.findByRole("option", { name: "Apple" })).toHaveAttribute(
				"data-slot",
				"app-item select-item",
			);
		});

		test("every part joins a consumer data-slot ahead of its own", async () => {
			const user = userEvent.setup();
			render(
				<Select.Root defaultValue="apple">
					<Select.Trigger data-slot="app-trigger">
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content data-slot="app-content">
						<Select.Group data-slot="app-group">
							<Select.Label data-slot="app-label">Fruits</Select.Label>
							<Select.Item value="apple">Apple</Select.Item>
						</Select.Group>
						<Select.Separator data-slot="app-separator" />
					</Select.Content>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveAttribute("data-slot", "app-trigger select-trigger");

			await user.click(trigger);

			const listbox = await screen.findByRole("listbox");
			expect(listbox).toHaveAttribute("data-slot", "app-content select-content");
			expect(screen.getByRole("group", { name: "Fruits" })).toHaveAttribute(
				"data-slot",
				"app-group select-group",
			);
			expect(screen.getByText("Fruits")).toHaveAttribute("data-slot", "app-label select-label");
			expect(
				listbox.querySelector('[data-slot="app-separator select-separator"]'),
			).toBeInTheDocument();
		});

		test("className and arbitrary data attributes reach each part's root", () => {
			render(
				<Select.Root defaultValue="apple" defaultOpen>
					<Select.Trigger className="app-trigger" data-testid="trigger">
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content className="app-content" data-testid="content">
						<Select.Group className="app-group" data-testid="group">
							<Select.Label className="app-label" data-testid="label">
								Fruits
							</Select.Label>
							<Select.Item value="apple" className="app-item" data-testid="item">
								Apple
							</Select.Item>
						</Select.Group>
						<Select.Separator className="app-separator" data-testid="separator" />
					</Select.Content>
				</Select.Root>,
			);

			for (const part of ["trigger", "content", "group", "label", "item", "separator"]) {
				const element = screen.getByTestId(part);
				expect(element).toHaveClass(`app-${part}`);
				expect(element).toHaveAttribute("data-slot", `select-${part}`);
			}
		});

		test("Select.Label asChild renders the child and merges class, data attributes, and ref", () => {
			const refSpy = vi.fn<(node: HTMLDivElement | null) => void>();
			render(
				<Select.Root defaultValue="apple" defaultOpen>
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label asChild className="app-label" data-testid="label" ref={refSpy}>
								<h3>Fruits</h3>
							</Select.Label>
							<Select.Item value="apple">Apple</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>,
			);

			const heading = screen.getByRole("heading", { name: "Fruits" });
			expect(heading).toBe(screen.getByTestId("label"));
			expect(heading).toHaveClass("app-label");
			expect(heading).toHaveAttribute("data-slot", "select-label");
			expect(refSpy).toHaveBeenCalledTimes(1);
			expect(refSpy).toHaveBeenLastCalledWith(heading);
		});

		test("the trigger and content stamp their documented state attributes across open, pick, and disabled", async () => {
			const user = userEvent.setup();
			render(
				<Select.Root>
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveAttribute("data-placeholder", "");
			expect(trigger).toHaveAttribute("data-state", "closed");
			expect(trigger).not.toHaveAttribute("data-disabled");

			await user.click(trigger);

			expect(trigger).toHaveAttribute("data-state", "open");
			const listbox = await screen.findByRole("listbox");
			expect(listbox).toHaveAttribute("data-state", "open");
			expect(listbox).toHaveAttribute("data-side", "bottom");
			expect(listbox).toHaveAttribute("data-align", "start");

			await user.click(screen.getByRole("option", { name: "Apple" }));

			expect(trigger).not.toHaveAttribute("data-placeholder");
			expect(trigger).toHaveAttribute("data-state", "closed");

			render(
				<Select.Root disabled>
					<Select.Trigger data-testid="disabled">
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);
			expect(screen.getByTestId("disabled")).toHaveAttribute("data-disabled", "");
		});

		test("documented item data attributes follow selection, keyboard highlight, and disabled", async () => {
			const user = userEvent.setup();
			render(
				<Select.Root defaultValue="apple">
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
						<Select.Item value="banana">Banana</Select.Item>
						<Select.Item value="cherry" disabled>
							Cherry
						</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			await user.click(screen.getByRole("combobox"));

			const apple = await screen.findByRole("option", { name: "Apple" });
			const banana = screen.getByRole("option", { name: "Banana" });
			const cherry = screen.getByRole("option", { name: "Cherry" });
			expect(apple).toHaveAttribute("data-state", "checked");
			expect(banana).toHaveAttribute("data-state", "unchecked");
			expect(cherry).toHaveAttribute("data-disabled", "");
			expect(banana).not.toHaveAttribute("data-disabled");
			// Radix focuses the selected item when the list opens, so it is highlighted.
			expect(apple).toHaveAttribute("data-highlighted", "");
			expect(banana).not.toHaveAttribute("data-highlighted");

			await user.keyboard("{ArrowDown}");

			expect(banana).toHaveAttribute("data-highlighted", "");
			expect(apple).not.toHaveAttribute("data-highlighted");

			await user.keyboard("{Enter}");

			expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
		});

		test("Select.Value asChild renders the child as-is and skips the label span", () => {
			render(
				<Select.Root value="apple">
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" asChild>
							<output data-testid="value">Custom apple</output>
						</Select.Value>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			// Why this pins a missing attribute: Radix 2.3.7 hands `Slot` a keyed
			// Fragment, so an `asChild` child receives none of the value's props, and
			// the docs page marks the path unsupported. When this assertion fails,
			// Radix fixed the Fragment wrap: drop the warning from the docs page and
			// the JSDoc, and assert the joined slot here instead.
			const value = screen.getByTestId("value");
			expect(value).not.toHaveAttribute("data-slot");
			expect(value.parentElement).toBe(screen.getByRole("combobox"));
			expect(value.querySelector('[data-slot="select-value-label"]')).not.toBeInTheDocument();
			expect(
				screen.getByRole("combobox").querySelector('[data-slot="select-value-label"]'),
			).not.toBeInTheDocument();
		});
	});

	describe("after browser translation", () => {
		test("changes a translated selection and reports the new value", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: string) => void>();
			render(
				<Select.Root defaultValue="apple" onValueChange={onValueChange}>
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
						<Select.Item value="banana">Banana</Select.Item>
					</Select.Content>
				</Select.Root>,
			);
			const trigger = screen.getByRole("combobox");
			translateTextNodes(trigger);
			expect(trigger).toHaveTextContent("[Apple-es]");

			await user.click(trigger);
			await user.click(await screen.findByRole("option", { name: "Banana" }));

			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenLastCalledWith("banana");
			expect(trigger).toHaveTextContent("Banana");
		});

		test("picks a first value over a translated placeholder", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: string) => void>();
			render(
				<Select.Root onValueChange={onValueChange}>
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
						<Select.Item value="banana">Banana</Select.Item>
					</Select.Content>
				</Select.Root>,
			);
			const trigger = screen.getByRole("combobox");
			translateTextNodes(trigger);
			expect(trigger).toHaveTextContent("[Select a fruit-es]");

			await user.click(trigger);
			await user.click(await screen.findByRole("option", { name: "Apple" }));

			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenLastCalledWith("apple");
			expect(trigger).toHaveTextContent("Apple");
			expect(trigger.querySelector('[data-slot="select-placeholder"]')).not.toBeInTheDocument();
		});

		test("clears a translated custom value back to the placeholder", async () => {
			const user = userEvent.setup();
			function Page() {
				const [value, setValue] = useState("apple");
				return (
					<>
						<Select.Root value={value} onValueChange={setValue}>
							<Select.Trigger>
								<Select.Value placeholder="Select a fruit">{value.toUpperCase()}</Select.Value>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="apple">Apple</Select.Item>
							</Select.Content>
						</Select.Root>
						<button type="button" onClick={() => setValue("")}>
							Clear
						</button>
					</>
				);
			}
			render(<Page />);
			const trigger = screen.getByRole("combobox");
			translateTextNodes(trigger);
			expect(trigger).toHaveTextContent("[APPLE-es]");

			await user.click(screen.getByRole("button", { name: "Clear" }));

			expect(trigger).toHaveTextContent("Select a fruit");
			expect(trigger.querySelector('[data-slot="select-value-label"]')).not.toBeInTheDocument();
		});

		test("swaps a translated custom value between text and an element", async () => {
			const user = userEvent.setup();
			function Page() {
				const [paused, setPaused] = useState(true);
				return (
					<>
						<Select.Root value="past-3d">
							<Select.Trigger>
								<Select.Value>{paused ? "Paused" : <time>Past 3 days</time>}</Select.Value>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="past-3d">Past 3 days</Select.Item>
							</Select.Content>
						</Select.Root>
						<button type="button" onClick={() => setPaused(false)}>
							Resume
						</button>
					</>
				);
			}
			render(<Page />);
			const trigger = screen.getByRole("combobox");
			translateTextNodes(trigger);
			expect(trigger).toHaveTextContent("[Paused-es]");

			await user.click(screen.getByRole("button", { name: "Resume" }));

			// The lone string child took the `textContent` path, so the swap wiped
			// the `<font>` wrapper instead of removing a node it no longer owned.
			expect(trigger.querySelector("time")).toHaveTextContent("Past 3 days");
			expect(trigger).not.toHaveTextContent("Paused");
		});

		test('translate="no" on an item rides on the label copy the trigger shows', async () => {
			const user = userEvent.setup();
			render(
				<Select.Root defaultValue="us-east-1">
					<Select.Trigger>
						<Select.Value placeholder="Select a region" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="us-east-1" translate="no">
							us-east-1
						</Select.Item>
					</Select.Content>
				</Select.Root>,
			);
			const trigger = screen.getByRole("combobox");
			expect(trigger.querySelector('[data-slot="select-item-label"]')).toHaveAttribute(
				"translate",
				"no",
			);

			translateTextNodes(trigger);

			expect(trigger).toHaveTextContent("us-east-1");
			expect(trigger).not.toHaveTextContent("-es]");

			await user.click(trigger);
			const option = await screen.findByRole("option", { name: "us-east-1" });
			expect(option).toHaveAttribute("translate", "no");
		});

		test("unmounts a translated selection", () => {
			const { unmount } = render(
				<Select.Root defaultValue="apple">
					<Select.Trigger>
						<Select.Value placeholder="Select a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);
			translateTextNodes(screen.getByRole("combobox"));

			unmount();

			expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		});
	});
});
