"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { Accordion } from "./accordion.js";

/**
 * These exercise real browser behavior the happy-dom environment can't model:
 * the `hidden="until-found"` attribute, the `beforematch` find-in-page event, and
 * `content-visibility`-driven reveal.
 */
describe("Accordion (browser)", () => {
	const items = (
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

	const regionFor = (text: string) =>
		screen.getByText(text).closest('[data-slot="accordion-content"]');

	test("clicking a trigger opens its section", async () => {
		const user = userEvent.setup();
		render(
			<Accordion.Root type="single" defaultValue="">
				{items}
			</Accordion.Root>,
		);

		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "closed");
		await user.click(screen.getByRole("button", { name: /Trigger A/ }));
		await waitFor(() =>
			expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open"),
		);
	});

	test('type="single" keeps at most one section open (opening one closes the other)', async () => {
		const user = userEvent.setup();
		render(
			<Accordion.Root type="single" defaultValue="a">
				{items}
			</Accordion.Root>,
		);

		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open");
		await user.click(screen.getByRole("button", { name: /Trigger B/ }));

		await waitFor(() =>
			expect(regionFor("Body of section B")).toHaveAttribute("data-state", "open"),
		);
		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "closed");
	});

	test('type="multiple" allows several sections open at once', async () => {
		const user = userEvent.setup();
		render(
			<Accordion.Root type="multiple" defaultValue={["a"]}>
				{items}
			</Accordion.Root>,
		);

		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open");
		await user.click(screen.getByRole("button", { name: /Trigger B/ }));

		await waitFor(() =>
			expect(regionFor("Body of section B")).toHaveAttribute("data-state", "open"),
		);
		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open");
	});

	test("controlled value round-trips through onValueChange", async () => {
		const user = userEvent.setup();

		function Controlled() {
			const [value, setValue] = useState<string[]>([]);
			return (
				<Accordion.Root type="multiple" value={value} onValueChange={setValue}>
					{items}
				</Accordion.Root>
			);
		}

		render(<Controlled />);

		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "closed");
		await user.click(screen.getByRole("button", { name: /Trigger A/ }));
		await waitFor(() =>
			expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open"),
		);

		await user.click(screen.getByRole("button", { name: /Trigger A/ }));
		await waitFor(() =>
			expect(regionFor("Body of section A")).toHaveAttribute("data-state", "closed"),
		);
	});

	test('find-in-page reveal: collapsed content carries hidden="until-found" and "beforematch" opens it', async () => {
		render(
			<Accordion.Root type="single" defaultValue="">
				{items}
			</Accordion.Root>,
		);

		const region = regionFor("Body of section A");
		expect(region).not.toBeNull();
		// Collapsed content stays in the DOM, kept findable via hidden="until-found".
		await waitFor(() => expect(region).toHaveAttribute("hidden", "until-found"));

		// The browser fires `beforematch` on the element right before it reveals a
		// find-in-page match; that opens the section and clears the hidden attribute.
		region?.dispatchEvent(new Event("beforematch", { bubbles: true }));
		await waitFor(() => expect(region).not.toHaveAttribute("hidden"));
		expect(region).toHaveAttribute("data-state", "open");
	});

	test('"beforematch" expands the content synchronously so the browser can highlight the revealed match', () => {
		render(
			<Accordion.Root type="single" defaultValue="">
				{items}
			</Accordion.Root>,
		);

		const region = regionFor("Body of section A");
		if (!(region instanceof HTMLElement)) {
			throw new Error("expected the content region to be an HTMLElement");
		}
		// Collapsed: clipped to zero height (h-0) so it can animate open.
		expect(region.offsetHeight).toBe(0);

		region.dispatchEvent(new Event("beforematch", { bubbles: true }));

		// Synchronously — before React flushes the open state — the reveal handler must
		// un-hide and un-clip the content. The browser highlights the match right after
		// this event, so if the box were still h-0 the highlight would be clipped away.
		expect(region).not.toHaveAttribute("hidden");
		expect(region.offsetHeight).toBeGreaterThan(0);
	});

	test("Trigger composes a consumer onClick", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<Accordion.Root type="single" defaultValue="">
				<Accordion.Item value="a">
					<Accordion.Trigger onClick={onClick}>Trigger A</Accordion.Trigger>
					<Accordion.Content>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);

		await user.click(screen.getByRole("button", { name: /Trigger A/ }));
		await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open");
	});

	test("an action button beside the trigger never toggles the section", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn<() => void>();
		render(
			<Accordion.Root type="single" defaultValue="a">
				<Accordion.Item value="a">
					<div className="flex items-center gap-2">
						<Accordion.Trigger className="w-auto">Trigger A</Accordion.Trigger>
						<button type="button" onClick={onAction}>
							Add Rule
						</button>
					</div>
					<Accordion.Content>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);

		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open");
		await user.click(screen.getByRole("button", { name: "Add Rule" }));
		await waitFor(() => expect(onAction).toHaveBeenCalledTimes(1));
		// The action button is a sibling of the trigger, so the section stayed open.
		expect(regionFor("Body of section A")).toHaveAttribute("data-state", "open");
	});
});
