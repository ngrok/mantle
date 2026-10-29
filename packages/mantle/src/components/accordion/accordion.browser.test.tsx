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

// Why inline CSS: the browser project loads no Tailwind, so its classes are bare here. The
// reveal handler's inline `height: auto` and `opacity: 1` must beat the `h-0` and `opacity-0`
// rules for the match to lay out and show. The content's real height and opacity transition is
// load-bearing too: a transition starts the box at zero height and opacity, so without it a
// handler that only sets the end values still passes. The trigger row rules give the icon its
// layout, and `font: inherit` is the Tailwind preflight rule that gives the button the line height
// of its parent.
const STYLE = `
	button { font: inherit; }
	.h-0 { height: 0; } .opacity-0 { opacity: 0; }
	[data-slot="accordion-content"] { transition: height 200ms, opacity 200ms; interpolate-size: allow-keywords; }
	.flex { display: flex; } .items-center { align-items: center; }
	.items-start { align-items: flex-start; } .gap-4 { gap: 1rem; }
	.self-start { align-self: flex-start; } .shrink-0 { flex-shrink: 0; }
	.h-lh { height: 1lh; } .w-4 { width: 1rem; } .text-sm { font-size: 14px; line-height: 20px; }
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
		expect(getComputedStyle(region).opacity).toBe("0");

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
		// The closed state is transparent, so a match the browser highlights now
		// must not paint at zero opacity.
		expect(getComputedStyle(region).opacity).toBe("1");
		// The reveal turns the transition off only for its own flush. An open section
		// must keep its transitions.
		expect(getComputedStyle(region).transitionProperty).toContain("height");
	});

	test("a find-in-page reveal keeps the consumer's inline transition", () => {
		render(
			<Accordion.Root type="single" defaultValue="">
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
					<Accordion.Content style={{ transition: "color 300ms" }}>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);

		const region = regionFor("Body of section A");
		if (!(region instanceof HTMLElement)) {
			throw new Error("expected the content region to be an HTMLElement");
		}
		// The closed item's layout effect runs on mount and must leave the style alone.
		expect(region.style.transition).toBe("color 300ms");

		region.dispatchEvent(new Event("beforematch", { bubbles: true }));

		expect(region.style.transition).toBe("color 300ms");
	});

	test("a find-in-page reveal keeps the consumer's inline transition longhand", () => {
		render(
			<Accordion.Root type="single" defaultValue="">
				<Accordion.Item value="a">
					<Accordion.Trigger>Trigger A</Accordion.Trigger>
					<Accordion.Content style={{ transitionDuration: "500ms" }}>
						<Accordion.Body>Body of section A</Accordion.Body>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>,
		);

		const region = regionFor("Body of section A");
		if (!(region instanceof HTMLElement)) {
			throw new Error("expected the content region to be an HTMLElement");
		}

		region.dispatchEvent(new Event("beforematch", { bubbles: true }));

		// Why a longhand: with only one longhand set, the `transition` shorthand reads
		// as empty, so a reveal that saves and restores the shorthand deletes it.
		expect(region.style.transitionDuration).toBe("500ms");
		expect(region.style.transitionProperty).toBe("");
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
		expect(region.style.opacity).toBe("");
		expect(region.style.transition).toBe("");
		expect(region).toHaveAttribute("hidden", "until-found");
	});

	const verticalCenter = (rect: DOMRect) => rect.top + rect.height / 2;

	// Why 1px: glyph boxes round differently per platform font, up to 0.5px from the
	// line box center on Linux. A misaligned icon is off by 2px or more.
	const expectCentersAligned = (a: DOMRect, b: DOMRect) => {
		expect(Math.abs(verticalCenter(a) - verticalCenter(b))).toBeLessThanOrEqual(1);
	};

	const iconRect = () => {
		const icon = document.querySelector('[data-slot~="accordion-trigger-icon"]');
		if (!icon) {
			throw new Error("expected the trigger icon");
		}
		return icon.getBoundingClientRect();
	};

	test("TriggerIcon centers on the first line of a wrapped label", () => {
		const label = "What happens when I run out of usage credit on Hobbyist?";
		render(
			<div style={{ width: 200, font: "16px/24px sans-serif" }}>
				<Accordion.Root>
					<Accordion.Item value="a">
						<Accordion.Trigger>
							{label}
							<Accordion.TriggerIcon />
						</Accordion.Trigger>
					</Accordion.Item>
				</Accordion.Root>
			</div>,
		);

		const range = document.createRange();
		// The text node alone, so the icon box is not one of the rects.
		const text = screen.getByRole("button", { name: label }).firstChild;
		if (!text) {
			throw new Error("expected the label text node");
		}
		range.selectNodeContents(text);
		const lines = [...range.getClientRects()];
		const firstLine = lines[0];
		if (!firstLine) {
			throw new Error("expected the label to render a line box");
		}
		expect(lines.length).toBeGreaterThan(1);
		expectCentersAligned(iconRect(), firstLine);
	});

	test("TriggerIcon centers with children shorter than one trigger line", () => {
		render(
			<div style={{ font: "16px/24px sans-serif" }}>
				<Accordion.Root>
					<Accordion.Item value="a">
						<Accordion.Trigger>
							<span className="text-sm">on_tcp_connect</span>
							<Accordion.TriggerIcon />
						</Accordion.Trigger>
					</Accordion.Item>
				</Accordion.Root>
			</div>,
		);

		const labelRect = screen.getByText("on_tcp_connect").getBoundingClientRect();
		expectCentersAligned(iconRect(), labelRect);
	});
});
