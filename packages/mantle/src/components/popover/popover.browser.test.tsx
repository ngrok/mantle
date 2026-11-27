"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { createPortal } from "react-dom";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands, server, userEvent as browserUser } from "vitest/browser";
import * as AlertDialog from "../alert-dialog/alert-dialog-parts.js";
import * as Popover from "./popover-parts.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this file's geometry leans
 * on. We inline it instead of importing the full mantle stylesheet so the test
 * stays hermetic and needs no Tailwind build step.
 *
 * `.block` is written as Tailwind's own utility rather than a rule aimed at the
 * arrow. The arrow has to emit the class for the rule to match, and an inline
 * `svg` adds a line box that moves the tip off the edge.
 */
const STYLE = `
@layer utilities {
	.block { display: block; }
}
[data-slot="popover-content"] {
	background: #fff;
	border: 1px solid #000;
	padding: 16px;
}
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

/** How far the arrow's base reaches past the content's outer edge, in pixels. */
function baseOverlap() {
	const arrow = document.querySelector("[data-slot='popover-arrow']");
	const content = document.querySelector("[data-slot='popover-content']");
	if (arrow == null || content == null) {
		throw new Error("expected an open Popover.Content with a Popover.Arrow inside it");
	}
	return arrow.getBoundingClientRect().right - content.getBoundingClientRect().left;
}

describe("Popover.Arrow", () => {
	test("overlaps the content's border so the two edges read as one line", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content side="right">
					<Popover.Arrow />
					<p>Products moved up here</p>
				</Popover.Content>
			</Popover.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));
		await screen.findByRole("dialog");

		// One border width, so the arrow's fill covers the border across its base and
		// no line cuts the tip off the content. Less would leave that line showing.
		expect(baseOverlap()).toBeCloseTo(1, 1);
	});
});

describe("Popover.Content placement", () => {
	let placementStyle: HTMLStyleElement;

	beforeAll(async () => {
		placementStyle = document.createElement("style");
		placementStyle.textContent = await commands.tailwindCss("../../utils/float/use-float.ts");
		document.head.appendChild(placementStyle);
	});

	afterAll(() => {
		placementStyle.remove();
	});

	test("content that scrolls does not bounce or scroll the page at its ends", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content style={{ maxHeight: 60, overflowY: "auto" }}>
					<p style={{ height: 200 }}>Tall content</p>
				</Popover.Content>
			</Popover.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Open" }));
		const content = await screen.findByRole("dialog");

		expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
		expect(getComputedStyle(content).overscrollBehaviorY).toBe("none");
	});

	test("aligns to the trigger's start edge after it changes from center", async () => {
		const user = userEvent.setup();
		const Aligned = ({ align }: { align: "center" | "start" }) => (
			<div style={{ padding: 120 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content align={align}>
						<p style={{ width: 120 }}>Wider than the trigger</p>
					</Popover.Content>
				</Popover.Root>
			</div>
		);
		const { rerender } = render(<Aligned align="center" />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		rerender(<Aligned align="start" />);

		await waitFor(() => {
			expect(content.getBoundingClientRect().left).toBeCloseTo(
				trigger.getBoundingClientRect().left,
				0,
			);
		});
	});

	test("aligns start to the trigger's right edge in a right-to-left document", async () => {
		const user = userEvent.setup();
		render(
			<div dir="rtl" style={{ padding: 120 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content align="start">
						<p style={{ width: 120 }}>Wider than the trigger</p>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		await waitFor(() => {
			expect(content.getBoundingClientRect().right).toBeCloseTo(
				trigger.getBoundingClientRect().right,
				0,
			);
		});
	});

	// Why Chromium only: Chromium keeps a closing popover in the top layer for its
	// exit. Firefox and Safari hide it at once, so they paint no exit to place.
	test.runIf(server.browser === "chromium")(
		"stays next to its trigger while its exit transition plays",
		async () => {
			const user = userEvent.setup();
			render(
				<div style={{ padding: 120 }}>
					<Popover.Root>
						<Popover.Trigger>Open</Popover.Trigger>
						<Popover.Content>
							<Popover.Close>Done</Popover.Close>
						</Popover.Content>
					</Popover.Root>
				</div>,
			);
			const trigger = screen.getByRole("button", { name: "Open" });
			await user.click(trigger);
			const content = await screen.findByRole("dialog");
			await Promise.all(content.getAnimations().map((animation) => animation.finished));
			const openTop = content.getBoundingClientRect().top;

			await user.click(screen.getByRole("button", { name: "Done" }));
			await new Promise(requestAnimationFrame);

			expect(content.checkVisibility()).toBe(true);
			expect(content.getBoundingClientRect().top).toBeCloseTo(openTop, 0);
		},
	);

	test("takes pointer input when a modal menu turns off pointer events on the body", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<button type="button">Inside</button>
				</Popover.Content>
			</Popover.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Open" }));
		const content = await screen.findByRole("dialog");
		document.body.style.pointerEvents = "none";
		try {
			expect(getComputedStyle(content).pointerEvents).toBe("auto");
		} finally {
			document.body.style.removeProperty("pointer-events");
		}
	});

	test("does not place the open content again when it renders again", async () => {
		const user = userEvent.setup();
		const tree = (label: string) => (
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<p>{label}</p>
				</Popover.Content>
			</Popover.Root>
		);
		const { rerender } = render(tree("First"));
		await user.click(screen.getByRole("button", { name: "Open" }));
		const content = await screen.findByRole("dialog");
		await Promise.all(content.getAnimations().map((animation) => animation.finished));
		const observer = new MutationObserver(() => {});
		observer.observe(content, { attributeFilter: ["style"] });

		rerender(tree("Second"));
		// Why right after the render: a placement in its commit writes the style at
		// once. A later write comes from the open transition's end, not the render.
		const styleWrites = observer.takeRecords();
		observer.disconnect();

		expect(screen.getByText("Second")).toBeInTheDocument();
		expect(styleWrites).toHaveLength(0);
	});
});

describe("Popover.Content Tab order", () => {
	test("Tab and Shift+Tab wrap at the edges of the open content", async () => {
		render(
			<>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<button type="button">First</button>
						<button type="button">Last</button>
					</Popover.Content>
				</Popover.Root>
				<button type="button">After</button>
			</>,
		);
		await browserUser.click(screen.getByRole("button", { name: "Open" }));
		const first = screen.getByRole("button", { name: "First" });
		const last = screen.getByRole("button", { name: "Last" });
		await waitFor(() => expect(first).toHaveFocus());

		await browserUser.keyboard("{Tab}");
		expect(last).toHaveFocus();
		await browserUser.keyboard("{Tab}");
		expect(first).toHaveFocus();
		await browserUser.keyboard("{Shift>}{Tab}{/Shift}");
		expect(last).toHaveFocus();
	});

	test("lets the browser move focus inside a shadow root in the content", async () => {
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<div
						ref={(host) => {
							if (host != null && host.shadowRoot == null) {
								host.attachShadow({ mode: "open" }).innerHTML =
									'<input aria-label="S1"><input aria-label="S2">';
							}
						}}
					/>
				</Popover.Content>
			</Popover.Root>,
		);
		await browserUser.click(screen.getByRole("button", { name: "Open" }));
		const shadow = (await screen.findByRole("dialog")).querySelector("div")?.shadowRoot;
		shadow?.querySelector<HTMLInputElement>("[aria-label=S1]")?.focus();

		await browserUser.keyboard("{Tab}");
		expect(shadow?.activeElement?.getAttribute("aria-label")).toBe("S2");
	});

	test("leaves Tab to an AlertDialog opened from the content", async () => {
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<button type="button">Inside</button>
					<AlertDialog.Root intent="danger">
						<AlertDialog.Trigger>Delete</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Body>
								<AlertDialog.Title>Delete it?</AlertDialog.Title>
								<AlertDialog.Footer>
									<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								</AlertDialog.Footer>
							</AlertDialog.Body>
						</AlertDialog.Content>
					</AlertDialog.Root>
				</Popover.Content>
			</Popover.Root>,
		);
		await browserUser.click(screen.getByRole("button", { name: "Open" }));
		await browserUser.click(await screen.findByRole("button", { name: "Delete" }));
		const cancel = await screen.findByRole("button", { name: "Cancel" });
		cancel.focus();

		let prevented: boolean | undefined;
		const record = (event: KeyboardEvent) => {
			prevented = event.defaultPrevented;
		};
		document.addEventListener("keydown", record);
		try {
			await browserUser.keyboard("{Tab}");
		} finally {
			document.removeEventListener("keydown", record);
		}
		expect(prevented).toBe(false);
	});

	test("wraps from the last stop inside a dialog element written in the content", async () => {
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<button type="button">First</button>
					<dialog open>
						<button type="button">Last</button>
					</dialog>
				</Popover.Content>
			</Popover.Root>,
		);
		await browserUser.click(screen.getByRole("button", { name: "Open" }));
		screen.getByRole("button", { name: "Last" }).focus();

		await browserUser.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
	});

	test("leaves Tab to a React child portaled outside the content", async () => {
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<p>No controls here</p>
					{createPortal(<input aria-label="Portaled" />, document.body)}
				</Popover.Content>
			</Popover.Root>,
		);
		await browserUser.click(screen.getByRole("button", { name: "Open" }));
		screen.getByRole("textbox", { name: "Portaled" }).focus();

		let prevented: boolean | undefined;
		const record = (event: KeyboardEvent) => {
			prevented = event.defaultPrevented;
		};
		document.addEventListener("keydown", record);
		try {
			await browserUser.keyboard("{Tab}");
		} finally {
			document.removeEventListener("keydown", record);
		}
		expect(prevented).toBe(false);
	});
});

describe("Popover.Trigger openOnHover", () => {
	let placementStyle: HTMLStyleElement;

	beforeAll(async () => {
		placementStyle = document.createElement("style");
		placementStyle.textContent = await commands.tailwindCss("../../utils/float/use-float.ts");
		document.head.appendChild(placementStyle);
	});

	afterAll(() => {
		placementStyle.remove();
	});

	const trigger = () => screen.getByRole("button", { name: "About limits" });

	function HoverPopover() {
		return (
			<div>
				<Popover.Root>
					<Popover.Trigger openOnHover>About limits</Popover.Trigger>
					<Popover.Content side="bottom" sideOffset={8}>
						<button type="button">Learn more</button>
					</Popover.Content>
				</Popover.Root>
				<button type="button" style={{ marginTop: 300 }}>
					Elsewhere
				</button>
			</div>
		);
	}

	test("a hover opens it and leaves focus where it was", async () => {
		render(<HoverPopover />);
		const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
		elsewhere.focus();

		await browserUser.hover(trigger());
		await screen.findByRole("dialog");

		expect(trigger()).toHaveAttribute("aria-expanded", "true");
		expect(elsewhere).toHaveFocus();
	});

	test("stays open while the pointer moves onto the content, and closes when it leaves both", async () => {
		render(<HoverPopover />);
		await browserUser.hover(trigger());
		const content = await screen.findByRole("dialog");

		await browserUser.hover(content);
		await browserUser.hover(screen.getByRole("button", { name: "Learn more" }));
		expect(trigger()).toHaveAttribute("aria-expanded", "true");

		await browserUser.hover(screen.getByRole("button", { name: "Elsewhere" }));
		await waitFor(() => expect(trigger()).toHaveAttribute("aria-expanded", "false"));
	});

	test("Escape closes a hover open while focus is outside it", async () => {
		render(<HoverPopover />);
		await browserUser.hover(trigger());
		await screen.findByRole("dialog");

		await browserUser.keyboard("{Escape}");
		await waitFor(() => expect(trigger()).toHaveAttribute("aria-expanded", "false"));
	});

	test("a press on the trigger keeps a hover open, moves focus in, and the pointer can leave", async () => {
		render(<HoverPopover />);
		const button = trigger();
		await browserUser.hover(button);
		await screen.findByRole("dialog");

		await browserUser.click(button);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Learn more" })).toHaveFocus();

		await browserUser.hover(screen.getByRole("button", { name: "Elsewhere" }));
		await browserUser.hover(document.body);
		expect(button).toHaveAttribute("aria-expanded", "true");
	});

	test("Enter opens it with focus inside", async () => {
		render(<HoverPopover />);
		await browserUser.keyboard("{Tab}");
		expect(trigger()).toHaveFocus();

		await browserUser.keyboard("{Enter}");
		await screen.findByRole("dialog");
		expect(screen.getByRole("button", { name: "Learn more" })).toHaveFocus();
	});
});
