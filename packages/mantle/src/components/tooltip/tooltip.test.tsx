import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Tooltip, TooltipProvider } from "./tooltip.js";

function CopyTooltip({ body }: { body: ReactNode }) {
	return (
		<TooltipProvider>
			<Tooltip.Root>
				<Tooltip.Trigger>Copy</Tooltip.Trigger>
				<Tooltip.Content>{body}</Tooltip.Content>
			</Tooltip.Root>
		</TooltipProvider>
	);
}

/** Open the tooltip through a real hover and return its surface. */
async function hoverTooltip(user: ReturnType<typeof userEvent.setup>) {
	await user.hover(screen.getByRole("button", { name: "Copy" }));
	return await screen.findByRole("tooltip");
}

describe("Tooltip.Content", () => {
	test("renders children inside the label slot, before the arrow", async () => {
		const user = userEvent.setup();
		render(<CopyTooltip body="Copy endpoint URL" />);

		const tooltip = await hoverTooltip(user);
		const label = tooltip.querySelector('[data-slot="tooltip-label"]');
		expect(label).toHaveTextContent("Copy endpoint URL");
		expect(label?.parentElement).toBe(tooltip);
		// The arrow is the permanent sibling that takes the body off React's
		// lone-child repair path, so it has to stay after the label.
		expect(tooltip.firstElementChild).toBe(label);
	});

	test("lays out the label slot as contents so it adds no box of its own", async () => {
		const user = userEvent.setup();
		render(<CopyTooltip body="Copy endpoint URL" />);

		const tooltip = await hoverTooltip(user);
		// The class is the only observable form of this contract in happy-dom: the
		// slot must generate no box, so a consumer who makes the surface a flex
		// container keeps every child of the body as its own flex item.
		expect(tooltip.querySelector('[data-slot="tooltip-label"]')).toHaveClass("contents");
	});

	describe("on a browser-translated page", () => {
		test("keeps rendering when a string body swaps to an element", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<CopyTooltip body="Copy endpoint URL" />);
			const tooltip = await hoverTooltip(user);
			translateTextNodes(tooltip);
			expect(tooltip).toHaveTextContent("[Copy endpoint URL-es]");

			rerender(<CopyTooltip body={<strong>Copy endpoint URL</strong>} />);

			expect(tooltip.querySelector("font")).toBeNull();
			expect(tooltip.querySelector("strong")).toHaveTextContent("Copy endpoint URL");
		});

		test("keeps rendering when a string body unmounts", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<CopyTooltip body="Copy endpoint URL" />);
			const tooltip = await hoverTooltip(user);
			translateTextNodes(tooltip);
			expect(tooltip).toHaveTextContent("[Copy endpoint URL-es]");

			rerender(<CopyTooltip body={null} />);

			expect(tooltip).toHaveTextContent("");
		});
	});
});
