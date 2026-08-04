import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { Popover } from "./popover.js";

describe("Popover", () => {
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
			expect(arrow?.tagName).toBe("svg");
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

		test("relies on Popover.Content positioning itself", async () => {
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

			// A cross-element pin, asserted where both sides render together. The arrow's
			// wrapper is absolutely positioned, so `Popover.Content` has to be its
			// containing block — otherwise the open animation's `scale` becomes that
			// containing block for one frame and the arrow lands 1px off. No Tailwind runs
			// in either vitest project, so the class is the only observable form here;
			// `popover.browser.test.tsx` measures the geometry it buys.
			expect(await screen.findByRole("dialog")).toHaveClass("relative");
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
			expect(arrow.getAttribute("class")).toContain("fill-red-500");
			expect(arrow).toHaveAttribute("width", "20");
			expect(arrow).toHaveAttribute("height", "10");
		});
	});

	describe("Content", () => {
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
			expect(screen.queryByText("Products moved up here")).not.toBeInTheDocument();
			expect(trigger).toHaveFocus();
		});
	});
});
