import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import type { Side } from "../../utils/float/position.js";
import { useState } from "react";
import * as Accordion from "../accordion/accordion-parts.js";
import * as Popover from "./popover-parts.js";

describe("Popover", () => {
	test("Trigger, Anchor, and Close join their data-slot with the asChild child's own", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Anchor asChild>
					<div data-slot="inner" data-testid="anchor" />
				</Popover.Anchor>
				<Popover.Trigger asChild data-slot="outer">
					<button data-slot="inner" type="button">
						Open
					</button>
				</Popover.Trigger>
				<Popover.Content>
					<Popover.Close asChild>
						<button data-slot="inner" type="button">
							Done
						</button>
					</Popover.Close>
				</Popover.Content>
			</Popover.Root>,
		);

		const trigger = screen.getByRole("button", { name: "Open" });
		expect(trigger).toHaveAttribute("data-slot", "outer popover-trigger inner");
		expect(screen.getByTestId("anchor")).toHaveAttribute("data-slot", "popover-anchor inner");
		await user.click(trigger);
		expect(await screen.findByRole("button", { name: "Done" })).toHaveAttribute(
			"data-slot",
			"popover-close inner",
		);
	});

	describe("Arrow", () => {
		test("renders inside the open content with its data-slot", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<Popover.Arrow />
						<p>Products moved up here</p>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			const arrow = content.querySelector("[data-slot='popover-arrow']");
			expect(arrow).toHaveAttribute("aria-hidden", "true");
		});

		test("sizes the svg so Radix offsets the content by the arrow's real height", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<Popover.Arrow />
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open" }));

			// Radix measures the rendered arrow and adds its height to `sideOffset`, so a
			// width/height that disagrees with the painted triangle detaches the tip.
			const arrow = (await screen.findByRole("dialog")).querySelector(
				"[data-slot='popover-arrow']",
			);
			expect(arrow).toHaveAttribute("width", "14");
			expect(arrow).toHaveAttribute("height", "7");
			expect(arrow).toHaveAttribute("viewBox", "0 0 30 10");
		});

		test("strokes only the two slanted edges, so the base does not cut the content's border", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<Popover.Arrow />
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open" }));

			const arrow = (await screen.findByRole("dialog")).querySelector(
				"[data-slot='popover-arrow']",
			);
			// The filled polygon closes across the base; the stroked polyline does not.
			expect(arrow?.querySelector("polygon")).toHaveAttribute("points", "0,0 30,0 15,10");
			const border = arrow?.querySelector("polyline");
			expect(border).toHaveAttribute("points", "0,0 15,10 30,0");
			expect(border).toHaveAttribute("fill", "none");
			// Without this the 1px border scales with the 30x10 viewBox and reads as ~0.5px.
			expect(border).toHaveAttribute("vector-effect", "non-scaling-stroke");
		});

		test("takes a consumer className and forwards arbitrary props", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<Popover.Arrow className="fill-red-500" data-testid="arrow" height={10} width={20} />
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open" }));

			const arrow = await screen.findByTestId("arrow");
			// Why the class check: the tailwind-merge contract puts the consumer's class beside the defaults.
			expect(arrow.getAttribute("class")).toContain("fill-red-500");
			expect(arrow).toHaveAttribute("width", "20");
			expect(arrow).toHaveAttribute("height", "10");
		});
	});

	test("the content dialog takes its name from the trigger, unless it has its own", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Popover.Root>
					<Popover.Trigger>Filters</Popover.Trigger>
					<Popover.Content>Pick filters</Popover.Content>
				</Popover.Root>
				<Popover.Root>
					<Popover.Trigger>Share</Popover.Trigger>
					<Popover.Content aria-label="Share settings">Share with</Popover.Content>
				</Popover.Root>
				<Popover.Root>
					<Popover.Trigger asChild>
						<button type="button" id="sort-trigger">
							Sort
						</button>
					</Popover.Trigger>
					<Popover.Content>Sort by</Popover.Content>
				</Popover.Root>
			</>,
		);

		await user.click(screen.getByRole("button", { name: "Filters" }));
		expect(await screen.findByRole("dialog", { name: "Filters" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Share" }));
		expect(await screen.findByRole("dialog", { name: "Share settings" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Sort" }));
		expect(await screen.findByRole("dialog", { name: "Sort" })).toBeInTheDocument();
	});

	test("opens on trigger click and closes on Escape, returning focus to the trigger", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<Popover.Arrow />
					<p>Products moved up here</p>
				</Popover.Content>
			</Popover.Root>,
		);

		const trigger = screen.getByRole("button", { name: "Open" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);
		expect(await screen.findByText("Products moved up here")).toBeInTheDocument();
		expect(trigger).toHaveAttribute("aria-expanded", "true");

		await user.keyboard("{Escape}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveFocus();
		// The content stays mounted while its exit transition plays.
		await waitFor(() => {
			expect(screen.queryByText("Products moved up here")).not.toBeInTheDocument();
		});
	});

	test("Escape closes only the popover that opened last, after the outer one moves", async () => {
		const user = userEvent.setup();
		const Nested = ({ side }: { side: Side }) => (
			<Popover.Root>
				<Popover.Trigger>Outer</Popover.Trigger>
				<Popover.Content side={side}>
					<Popover.Root>
						<Popover.Trigger>Inner</Popover.Trigger>
						<Popover.Content>Inner content</Popover.Content>
					</Popover.Root>
				</Popover.Content>
			</Popover.Root>
		);
		const { rerender } = render(<Nested side="bottom" />);
		const outer = screen.getByRole("button", { name: "Outer" });

		await user.click(outer);
		const inner = await screen.findByRole("button", { name: "Inner" });
		await user.click(inner);
		await screen.findByText("Inner content");
		// A new placement for the outer popover keeps its place under the inner one.
		rerender(<Nested side="top" />);
		await act(async () => {});

		await user.keyboard("{Escape}");
		expect(inner).toHaveAttribute("aria-expanded", "false");
		expect(outer).toHaveAttribute("aria-expanded", "true");

		await user.keyboard("{Escape}");
		expect(outer).toHaveAttribute("aria-expanded", "false");
	});

	test("a press outside closes the popover unless onInteractOutside prevents it for its target", async () => {
		const user = userEvent.setup();
		render(
			<>
				<button type="button">Keep open</button>
				<button type="button">Elsewhere</button>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content
						onInteractOutside={(event) => {
							if (event.target === screen.getByRole("button", { name: "Keep open" })) {
								event.preventDefault();
							}
						}}
					>
						Products
					</Popover.Content>
				</Popover.Root>
			</>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });
		const elsewhere = screen.getByRole("button", { name: "Elsewhere" });

		await user.click(trigger);
		await user.click(screen.getByRole("button", { name: "Keep open" }));
		expect(trigger).toHaveAttribute("aria-expanded", "true");

		await user.click(elsewhere);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		// Focus stays where the user put it.
		expect(elsewhere).toHaveFocus();
	});

	test("an asChild trigger and close inside a form do not submit it", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn<(event: { preventDefault: () => void }) => void>((event) =>
			event.preventDefault(),
		);
		render(
			<form onSubmit={onSubmit}>
				<Popover.Root>
					<Popover.Trigger asChild>
						{/* oxlint-disable-next-line react/button-has-type -- the test needs a button with no type */}
						<button>Open</button>
					</Popover.Trigger>
					<Popover.Content>
						<Popover.Close asChild>
							{/* oxlint-disable-next-line react/button-has-type -- the test needs a button with no type */}
							<button>Done</button>
						</Popover.Close>
					</Popover.Content>
				</Popover.Root>
			</form>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));
		await user.click(await screen.findByRole("button", { name: "Done" }));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("opening focuses the first control that takes focus", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<button type="button" hidden>
						Hidden
					</button>
					<button type="button" tabIndex={-1}>
						Not in the tab order
					</button>
					<input aria-label="Name" />
				</Popover.Content>
			</Popover.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus());
	});

	test("Tab and Shift+Tab cycle inside the open content instead of leaving the page", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<input aria-label="Width" />
						<button type="button">Apply</button>
					</Popover.Content>
				</Popover.Root>
				<button type="button">After the trigger</button>
			</>,
		);

		await user.click(screen.getByRole("button", { name: "Open" }));
		const width = screen.getByRole("textbox", { name: "Width" });
		await waitFor(() => expect(width).toHaveFocus());

		await user.tab();
		expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
		await user.tab();
		expect(width).toHaveFocus();
		await user.tab({ shift: true });
		expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	test("an open popover hydrates with no mismatch", async () => {
		const tree = (
			<Popover.Root defaultOpen>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>Products</Popover.Content>
			</Popover.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(tree);
		document.body.append(container);
		const onRecoverableError = vi.fn<(error: unknown) => void>();
		const root = await act(async () => hydrateRoot(container, tree, { onRecoverableError }));
		onTestFinished(() => {
			act(() => root.unmount());
			container.remove();
		});

		expect(await screen.findByText("Products")).toBeInTheDocument();
		expect(onRecoverableError).not.toHaveBeenCalled();
	});

	test("Escape from an expanded accordion trigger inside closes the popover", async () => {
		const user = userEvent.setup();
		render(
			<Popover.Root>
				<Popover.Trigger>Open</Popover.Trigger>
				<Popover.Content>
					<Accordion.Root type="single" defaultValue="a">
						<Accordion.Item value="a">
							<Accordion.Trigger>Options</Accordion.Trigger>
							<Accordion.Content>Details</Accordion.Content>
						</Accordion.Item>
					</Accordion.Root>
				</Popover.Content>
			</Popover.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		(await screen.findByRole("button", { name: "Options" })).focus();

		await user.keyboard("{Escape}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("onOpenAutoFocus sees the render that opened the popover", async () => {
		const user = userEvent.setup();
		const Controlled = () => {
			const [open, setOpen] = useState(false);
			return (
				<Popover.Root open={open} onOpenChange={setOpen}>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content
						onOpenAutoFocus={(event) => {
							if (open) {
								event.preventDefault();
							}
						}}
					>
						<input aria-label="Name" />
					</Popover.Content>
				</Popover.Root>
			);
		};
		render(<Controlled />);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		await screen.findByRole("textbox", { name: "Name" });
		expect(trigger).toHaveFocus();
	});
});
