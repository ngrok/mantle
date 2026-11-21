"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { commands, userEvent as browserUserEvent } from "vitest/browser";
import { afterEach, describe, expect, test, vi } from "vitest";
import * as Accordion from "./accordion-native-parts.js";

/**
 * Coverage that needs Chromium: happy-dom does not toggle a `<details>` from its `<summary>`,
 * does not close the other members of a `<details name>` group, and fires no `toggle` event.
 */

/** The `<summary>` whose text is `label`. */
const triggerFor = (label: string): HTMLElement => {
	const trigger = screen.getByText(label).closest("summary");
	if (trigger == null) {
		throw new Error(`expected a <summary> for "${label}"`);
	}
	return trigger;
};

/** Whether the `<details>` of the trigger labeled `label` is open. */
const isOpen = (label: string) => triggerFor(label).closest("details")?.open === true;

const sections = (
	<>
		<Accordion.Item value="a">
			<Accordion.Trigger>
				Trigger A
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>Body of section A</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
		<Accordion.Item value="b">
			<Accordion.Trigger>
				Trigger B
				<Accordion.TriggerIcon />
			</Accordion.Trigger>
			<Accordion.Content>
				<Accordion.Body>Body of section B</Accordion.Body>
			</Accordion.Content>
		</Accordion.Item>
	</>
);

describe("native Accordion (browser)", () => {
	test('type="single": the browser keeps one section open, and onValueChange reports each change once', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Accordion.Root type="single" defaultValue="a" onValueChange={onValueChange}>
				{sections}
			</Accordion.Root>,
		);
		expect(isOpen("Trigger A")).toBe(true);

		await user.click(triggerFor("Trigger B"));

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
		expect(onValueChange).toHaveBeenLastCalledWith("b");
		expect(isOpen("Trigger A")).toBe(false);
		expect(isOpen("Trigger B")).toBe(true);

		await user.click(triggerFor("Trigger B"));

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2));
		expect(onValueChange).toHaveBeenLastCalledWith("");
		expect(isOpen("Trigger B")).toBe(false);
	});

	test('type="multiple" (the default) opens sections independently and reports the open list', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<Accordion.Root defaultValue={["a"]} onValueChange={onValueChange}>
				{sections}
			</Accordion.Root>,
		);

		await user.click(triggerFor("Trigger B"));

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
		expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
		expect(isOpen("Trigger A")).toBe(true);
		expect(isOpen("Trigger B")).toBe(true);

		await user.click(triggerFor("Trigger A"));

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2));
		expect(onValueChange).toHaveBeenLastCalledWith(["b"]);
	});

	test("controlled value opens the section it names and reports no change of its own", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string) => void>();
		const Controlled = () => {
			const [value, setValue] = useState("a");
			return (
				<>
					<button type="button" onClick={() => setValue("b")}>
						Open B
					</button>
					<Accordion.Root
						type="single"
						value={value}
						onValueChange={(next) => {
							onValueChange(next);
							setValue(next);
						}}
					>
						{sections}
					</Accordion.Root>
				</>
			);
		};
		render(<Controlled />);
		expect(isOpen("Trigger A")).toBe(true);

		await user.click(screen.getByRole("button", { name: "Open B" }));

		await waitFor(() => expect(isOpen("Trigger B")).toBe(true));
		expect(isOpen("Trigger A")).toBe(false);

		await user.click(triggerFor("Trigger A"));

		// Why one call: the browser closes B after A opens, and B's `toggle` event must not
		// report `""` before the new `value` renders.
		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
		expect(onValueChange).toHaveBeenLastCalledWith("a");
		expect(isOpen("Trigger A")).toBe(true);
		expect(isOpen("Trigger B")).toBe(false);
	});

	test("Item composes a consumer onToggle", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn<(open: boolean) => void>();
		const onValueChange = vi.fn<(value: string[]) => void>();
		render(
			<Accordion.Root onValueChange={onValueChange}>
				<Accordion.Item value="a" onToggle={(event) => onToggle(event.currentTarget.open)}>
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
				</Accordion.Item>
			</Accordion.Root>,
		);

		await user.click(triggerFor("Trigger A"));

		await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1));
		expect(onToggle).toHaveBeenLastCalledWith(true);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
	});

	test("Enter and Space toggle the focused section", async () => {
		render(<Accordion.Root>{sections}</Accordion.Root>);
		triggerFor("Trigger A").focus();

		// Why the browser's own keyboard: the `<summary>` keys are browser behavior, and a
		// synthetic key event does not reach it.
		await browserUserEvent.keyboard("{Enter}");
		expect(isOpen("Trigger A")).toBe(true);

		await browserUserEvent.keyboard(" ");
		expect(isOpen("Trigger A")).toBe(false);
	});

	describe("with the compiled Tailwind CSS", () => {
		let styleElement: HTMLStyleElement | undefined;

		afterEach(() => {
			styleElement?.remove();
		});

		test("TriggerIcon turns under an open section only, not under an open outer section", async () => {
			styleElement = document.createElement("style");
			styleElement.textContent = await commands.tailwindCss("../accordion/accordion-classes.ts");
			document.head.appendChild(styleElement);
			render(
				<Accordion.Root defaultValue={["outer"]}>
					<Accordion.Item value="outer">
						<Accordion.Trigger>
							Outer
							<Accordion.TriggerIcon data-testid="outer-icon" />
						</Accordion.Trigger>
						<Accordion.Content>
							<Accordion.Root>
								<Accordion.Item value="inner">
									<Accordion.Trigger>
										Inner
										<Accordion.TriggerIcon data-testid="inner-icon" />
									</Accordion.Trigger>
								</Accordion.Item>
							</Accordion.Root>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>,
			);

			expect(getComputedStyle(screen.getByTestId("outer-icon")).rotate).toBe("180deg");
			expect(getComputedStyle(screen.getByTestId("inner-icon")).rotate).toBe("none");
		});
	});
});
