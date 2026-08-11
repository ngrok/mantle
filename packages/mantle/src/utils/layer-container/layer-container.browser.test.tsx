"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Dialog } from "../../components/dialog/dialog.js";
import { Popover } from "../../components/popover/popover.js";
import { Sheet } from "../../components/sheet/sheet.js";
import { makeToast, Toaster } from "../../components/toast/toast.js";

/**
 * Browser mode proves the paint order the layer tiers produce — happy-dom can
 * pin DOM placement (`layer-container.test.tsx`) but not hit-testing. Needs
 * real layout, `getBoundingClientRect`, `getComputedStyle`, and
 * `document.elementFromPoint`.
 *
 * Cross-file spelling pin: browser tests load no Tailwind, so this restates
 * the CSS the layering utilities emit (`fixed`, `z-50`, `z-60`, insets).
 * Radix mirrors each float content's computed z-index onto its popper wrapper,
 * so `.z-50` here engages the real stacking mechanism. If a component's tier
 * class changes, `layer-container.test.tsx`'s tier test catches the class; if
 * these pinned values stop matching Tailwind's output, the paint-order
 * assertions here go stale together — change both deliberately.
 */
const STYLE = `
.fixed { position: fixed; }
.z-50 { z-index: 50; }
.z-60 { z-index: 60; }
.inset-0 { inset: 0px; }
.inset-4 { inset: 16px; }
.inset-y-0 { top: 0px; bottom: 0px; }
.h-full { height: 100%; }
.w-full { width: 100%; }
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

/** The center point of an element's border box, for hit-testing. */
function centerOf(element: Element): { x: number; y: number } {
	const rect = element.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** The topmost element painted at the center of `element`. */
function topElementAt(element: Element): Element | null {
	const { x, y } = centerOf(element);
	return document.elementFromPoint(x, y);
}

/**
 * A dialog plus a base-level popover that opens only after the dialog is
 * already open — the FEP-1754 shape, where mount order used to put the
 * popover on top of the takeover.
 *
 * Why `modal={false}`: a modal dialog sets `pointer-events: none` on `body`,
 * and `elementFromPoint` skips pointer-events-none elements — the assertion
 * would pass with any z-index. Non-modal keeps hit-testing honest; the tiers
 * under test are identical either way.
 */
function LateBasePopoverScenario() {
	const [popoverOpen, setPopoverOpen] = useState(false);

	return (
		<div>
			<button type="button" onClick={() => setPopoverOpen(true)}>
				Announce
			</button>
			<Popover.Root open={popoverOpen}>
				<Popover.Anchor>
					<span>anchor</span>
				</Popover.Anchor>
				<Popover.Content>base popover content</Popover.Content>
			</Popover.Root>
			<Dialog.Root open modal={false}>
				<Dialog.Content appearance="full-bleed">
					<Dialog.Title>Takeover</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
}

describe("paint order across layer tiers", () => {
	test("a base popover that opens over an already-open dialog paints under it", async () => {
		const user = userEvent.setup();
		render(<LateBasePopoverScenario />);

		// The popover opens after the dialog mounted — later in DOM order, which
		// used to win the tie at a shared z-50.
		await user.click(screen.getByRole("button", { name: "Announce" }));
		const popoverContent = await screen.findByText("base popover content");

		const positioner = document.querySelector("[data-slot='dialog-positioner']");
		expect(positioner).not.toBeNull();

		await waitFor(() => {
			const topElement = topElementAt(popoverContent);
			expect(topElement).not.toBeNull();
			expect(positioner?.contains(topElement)).toBe(true);
			expect(popoverContent.contains(topElement)).toBe(false);
		});
	});

	test("a popover opened from inside a dialog paints above the dialog", async () => {
		const user = userEvent.setup();
		render(
			<Dialog.Root open modal={false}>
				<Dialog.Content appearance="full-bleed">
					<Dialog.Title>Takeover</Dialog.Title>
					<Dialog.Body>
						<Popover.Root>
							<Popover.Trigger>Open float</Popover.Trigger>
							<Popover.Content>float content</Popover.Content>
						</Popover.Root>
					</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Open float" }));
		const floatContent = await screen.findByText("float content");

		await waitFor(() => {
			const topElement = topElementAt(floatContent);
			expect(topElement).not.toBeNull();
			expect(floatContent.closest("[data-slot='popover-content']")?.contains(topElement)).toBe(
				true,
			);
		});
	});

	test("a dialog opened from inside a dialog paints above the outer dialog's open popover", async () => {
		const user = userEvent.setup();
		render(
			<Dialog.Root open modal={false}>
				<Dialog.Content appearance="full-bleed">
					<Dialog.Title>Outer</Dialog.Title>
					<Dialog.Body>
						<Popover.Root defaultOpen>
							<Popover.Trigger>Open float</Popover.Trigger>
							<Popover.Content>float content</Popover.Content>
						</Popover.Root>
						<Dialog.Root modal={false}>
							<Dialog.Trigger>Open inner</Dialog.Trigger>
							<Dialog.Content appearance="full-bleed">
								<Dialog.Title>Inner</Dialog.Title>
							</Dialog.Content>
						</Dialog.Root>
					</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>,
		);

		const floatContent = await screen.findByText("float content");
		await user.click(screen.getByRole("button", { name: "Open inner" }));
		await screen.findByText("Inner");

		const positioners = document.querySelectorAll("[data-slot='dialog-positioner']");
		expect(positioners).toHaveLength(2);
		const inner = positioners[1];

		await waitFor(() => {
			const topElement = topElementAt(floatContent);
			expect(topElement).not.toBeNull();
			expect(inner != null && inner.contains(topElement)).toBe(true);
			expect(floatContent.contains(topElement)).toBe(false);
		});
	});

	test("a popover inside a sheet positions against its trigger even when the sheet content is transformed", async () => {
		// Sheet.Content carries a transform while its slide animation runs, and a
		// transformed element is the containing block for fixed descendants. The
		// popover portals into the positioner — a sibling of the content — so its
		// `position: fixed` must keep resolving against the viewport. The identity
		// transform below is visually nothing but still creates a containing
		// block: portaling the float into the content instead turns this red.
		const contentTransform = document.createElement("style");
		contentTransform.textContent = `[data-slot="sheet-content"] { transform: translateX(0px); }`;
		document.head.appendChild(contentTransform);

		try {
			const user = userEvent.setup();
			render(
				<Sheet.Root open>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.TitleGroup>
								<Sheet.Title>Sheet</Sheet.Title>
							</Sheet.TitleGroup>
						</Sheet.Header>
						<Sheet.Body>
							<Popover.Root>
								<Popover.Trigger>Open float</Popover.Trigger>
								<Popover.Content>float content</Popover.Content>
							</Popover.Root>
						</Sheet.Body>
					</Sheet.Content>
				</Sheet.Root>,
			);

			const trigger = screen.getByRole("button", { name: "Open float" });
			await user.click(trigger);
			const floatContent = await screen.findByText("float content");

			await waitFor(() => {
				const contentRect = (
					floatContent.closest("[data-slot='popover-content']") ?? floatContent
				).getBoundingClientRect();
				const triggerRect = trigger.getBoundingClientRect();
				// Radix places the content below the trigger with `sideOffset` 4.
				// A broken containing block lands it far away (typically at the
				// viewport origin, offset by the content's own height).
				expect(Math.abs(contentRect.top - triggerRect.bottom)).toBeLessThan(24);
			});
		} finally {
			contentTransform.remove();
		}
	});

	test("toasts paint above the overlay tier", async () => {
		render(
			<div>
				<Toaster />
				<Dialog.Root open modal={false}>
					<Dialog.Content appearance="full-bleed">
						<Dialog.Title>Takeover</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</div>,
		);

		makeToast(<p>toast content</p>);
		await screen.findByText("toast content");

		// Sonner injects its own stylesheet at runtime, so the viewport's
		// computed z-index is real. It must clear the overlay tier.
		const viewport = document.querySelector("[data-sonner-toaster]");
		expect(viewport).not.toBeNull();
		const viewportZ = Number(getComputedStyle(viewport as Element).zIndex);
		expect(viewportZ).toBeGreaterThan(60);
	});
});
