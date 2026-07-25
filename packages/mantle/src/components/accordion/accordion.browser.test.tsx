"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { Accordion } from "./accordion.js";

/**
 * The collapse geometry the `beforematch` reveal has to defeat. No stylesheet is
 * loaded in the browser project, so `Accordion.Content`'s `h-0 overflow-hidden`
 * (and its `data-state-open:h-auto` counterpart) are inert class strings here —
 * without these rules the region measures its natural height and any geometry
 * assertion below would pass no matter what the component does.
 *
 * Keep the selectors keyed off `data-slot` / `data-state`, which are public API.
 */
const STYLE = `
[data-slot="accordion-content"] { height: 0; overflow: hidden; }
[data-slot="accordion-content"][data-state="open"] { height: auto; }
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

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
		// Collapsed: clipped to zero height so it can animate open.
		expect(region.offsetHeight).toBe(0);

		region.dispatchEvent(new Event("beforematch", { bubbles: true }));

		// Synchronously — before React flushes the open state — the reveal handler must
		// un-hide and un-clip the content. The browser highlights the match right after
		// this event, so if the box were still zero-height the highlight would be
		// clipped away. React hasn't re-rendered yet, so `data-state` is still
		// "closed": the layout below can only come from the handler's inline height.
		expect(region).not.toHaveAttribute("hidden");
		expect(region).toHaveAttribute("data-state", "closed");
		expect(region.style.height).toBe("auto");
		expect(region.offsetHeight).toBeGreaterThan(0);
	});

	// The reveal's inline `height: auto` is a one-shot escape hatch: once the item
	// closes again the class-driven `h-0 ↔ h-auto` slide has to take back over, so
	// the inline height must be cleared.
	test('closing a "beforematch"-revealed section clears the inline height', async () => {
		const user = userEvent.setup();
		render(
			<Accordion.Root type="single" defaultValue="">
				{items}
			</Accordion.Root>,
		);

		const region = regionFor("Body of section A");
		if (!(region instanceof HTMLElement)) {
			throw new Error("expected the content region to be an HTMLElement");
		}

		region.dispatchEvent(new Event("beforematch", { bubbles: true }));
		await waitFor(() => expect(region).toHaveAttribute("data-state", "open"));
		expect(region.style.height).toBe("auto");

		await user.click(screen.getByRole("button", { name: /Trigger A/ }));

		await waitFor(() => expect(region).toHaveAttribute("data-state", "closed"));
		await waitFor(() => expect(region.style.height).toBe(""));
		expect(region).toHaveAttribute("hidden", "until-found");
		expect(region.offsetHeight).toBe(0);
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
