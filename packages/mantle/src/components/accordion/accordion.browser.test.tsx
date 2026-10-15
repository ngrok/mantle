"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Accordion } from "./accordion.js";

/**
 * Coverage that needs Chromium. happy-dom has no `onbeforematch`, so only a real
 * browser reaches the `hidden="until-found"` branch through native detection.
 * happy-dom also reports `offsetHeight` as zero, so only a real layout can show
 * that the reveal handler un-clips the region.
 */

// Why inline CSS: the browser project loads no Tailwind, so `h-0` is a bare class here.
// The reveal handler's inline `height: auto` must beat this rule for the match to lay out.
const STYLE = `.h-0 { height: 0; }`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

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
		// `inert` would hide the text from find-in-page, so it must not coexist.
		expect(region).not.toHaveAttribute("inert");

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
		// Collapsed: the injected `h-0` clips the box to zero height.
		expect(region.offsetHeight).toBe(0);

		region.dispatchEvent(new Event("beforematch", { bubbles: true }));

		// The reveal handler must un-hide and un-clip the content before React flushes
		// the open state. The browser highlights the match right after this event, so a
		// box still at `h-0` clips the highlight away.
		expect(region).not.toHaveAttribute("hidden");
		// React has not re-rendered yet, so the layout below can only come from the
		// handler's inline height.
		expect(region).toHaveAttribute("data-state", "closed");
		expect(region.style.height).toBe("auto");
		expect(region.offsetHeight).toBeGreaterThan(0);
	});

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

		// The reveal's inline `height: auto` is a one-shot escape hatch. The close branch
		// must clear it so the class-driven `h-0 ↔ h-auto` slide takes over again.
		await waitFor(() => expect(region).toHaveAttribute("data-state", "closed"));
		await waitFor(() => expect(region.style.height).toBe(""));
		expect(region).toHaveAttribute("hidden", "until-found");
	});
});
