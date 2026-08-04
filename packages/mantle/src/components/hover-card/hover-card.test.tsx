import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { HoverCard } from "./hover-card.js";

function renderHoverCard(arrow = <HoverCard.Arrow />) {
	render(
		<HoverCard.Root>
			<HoverCard.Trigger href="https://ngrok.com">@ngrok/mantle</HoverCard.Trigger>
			<HoverCard.Content>
				{arrow}
				<p>The Design System</p>
			</HoverCard.Content>
		</HoverCard.Root>,
	);
}

describe("HoverCard", () => {
	describe("Arrow", () => {
		test("renders inside the content once hover opens it, with its data-slot", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));

			expect(await screen.findByText("The Design System")).toBeInTheDocument();
			const arrow = document.querySelector("[data-slot='hover-card-arrow']");
			expect(arrow?.tagName).toBe("svg");
			expect(arrow).toHaveAttribute("aria-hidden", "true");
		});

		test("sizes the svg so Radix offsets the content by the arrow's real height", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));
			await screen.findByText("The Design System");

			// Radix measures the rendered arrow and adds its height to `sideOffset`, so a
			// width/height that disagrees with the painted triangle detaches the tip.
			const arrow = document.querySelector("[data-slot='hover-card-arrow']");
			expect(arrow).toHaveAttribute("width", "14");
			expect(arrow).toHaveAttribute("height", "7");
			expect(arrow).toHaveAttribute("viewBox", "0 0 30 10");
		});

		test("strokes only the two slanted edges, so the base does not cut the content's border", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));
			await screen.findByText("The Design System");

			const arrow = document.querySelector("[data-slot='hover-card-arrow']");
			// The filled polygon closes across the base; the stroked polyline does not.
			expect(arrow?.querySelector("polygon")).toHaveAttribute("points", "0,0 30,0 15,10");
			const border = arrow?.querySelector("polyline");
			expect(border).toHaveAttribute("points", "0,0 15,10 30,0");
			expect(border).toHaveAttribute("fill", "none");
			// Without this the 1px border scales with the 30x10 viewBox and reads as ~0.5px.
			expect(border).toHaveAttribute("vector-effect", "non-scaling-stroke");
		});

		test("relies on HoverCard.Content positioning itself", async () => {
			const user = userEvent.setup();
			renderHoverCard();

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));
			await screen.findByText("The Design System");

			// A cross-element pin, asserted where both sides render together. The arrow's
			// wrapper is absolutely positioned, so `HoverCard.Content` has to be its
			// containing block — otherwise the open animation's `scale` becomes that
			// containing block for one frame and the arrow lands 1px off. No Tailwind runs
			// in either vitest project, so the class is the only observable form here;
			// `popover.browser.test.tsx` measures the same geometry on the shared shape.
			expect(document.querySelector("[data-slot='hover-card-content']")).toHaveClass("relative");
		});

		test("takes a consumer className and forwards arbitrary props", async () => {
			const user = userEvent.setup();
			renderHoverCard(
				<HoverCard.Arrow className="fill-red-500" data-testid="arrow" height={10} width={20} />,
			);

			await user.hover(screen.getByRole("link", { name: "@ngrok/mantle" }));

			const arrow = await screen.findByTestId("arrow");
			expect(arrow.getAttribute("class")).toContain("fill-red-500");
			expect(arrow).toHaveAttribute("width", "20");
			expect(arrow).toHaveAttribute("height", "10");
		});
	});
});
