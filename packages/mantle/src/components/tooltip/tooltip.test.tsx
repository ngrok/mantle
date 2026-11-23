import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Tooltip from "./tooltip-parts.js";
import { TooltipProvider } from "./tooltip.js";

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
	test("joins a composing part's data-slot ahead of its own", async () => {
		// Why: a wrapper such as `Sidebar.Tooltip` names the surface, and a
		// consumer selector on `[data-slot~="tooltip-content"]` must still reach it.
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Tooltip.Root>
					<Tooltip.Trigger>Copy</Tooltip.Trigger>
					<Tooltip.Content data-slot="outer">Copy endpoint URL</Tooltip.Content>
				</Tooltip.Root>
			</TooltipProvider>,
		);

		const tooltip = await hoverTooltip(user);
		expect(tooltip).toHaveAttribute("data-slot", "outer tooltip-content");
	});

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

	describe("on a browser-translated page", () => {
		test("keeps rendering when a string body swaps to an element", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<CopyTooltip body="Copy endpoint URL" />);
			const tooltip = await hoverTooltip(user);
			translateTextNodes(tooltip);
			expect(findTranslatedFont(tooltip)).toHaveTextContent("[Copy endpoint URL-es]");

			rerender(<CopyTooltip body={<strong>Copy endpoint URL</strong>} />);

			expect(findTranslatedFont(tooltip)).toBeNull();
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

describe("Tooltip.Trigger", () => {
	test("keeps its own aria-describedby next to the open tooltip's id", async () => {
		const user = userEvent.setup();
		render(
			<>
				<p id="help">Copies the URL</p>
				<Tooltip.Root>
					<Tooltip.Trigger aria-describedby="help">Copy</Tooltip.Trigger>
					<Tooltip.Content>Copy to clipboard</Tooltip.Content>
				</Tooltip.Root>
			</>,
		);
		const trigger = screen.getByRole("button", { name: "Copy" });
		expect(trigger).toHaveAttribute("aria-describedby", "help");

		await user.hover(trigger);
		const tooltip = await screen.findByRole("tooltip");
		expect(trigger.getAttribute("aria-describedby")?.split(" ")).toEqual(["help", tooltip.id]);
	});

	test("a tap's focus does not open the tooltip, and the next keyboard focus does", () => {
		render(<CopyTooltip body="Copy endpoint URL" />);
		const trigger = screen.getByRole("button", { name: "Copy" });

		// Why this order: a tap focuses the trigger after `pointerup`.
		fireEvent.pointerDown(trigger, { pointerType: "touch" });
		fireEvent.pointerUp(trigger, { pointerType: "touch" });
		act(() => trigger.focus());
		expect(trigger).not.toHaveAttribute("aria-describedby");
		fireEvent.click(trigger);

		act(() => trigger.blur());
		act(() => trigger.focus());
		expect(trigger).toHaveAttribute("aria-describedby");
	});

	test("a tap whose click a parent stops leaves the next keyboard focus free to open", () => {
		render(
			// oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Why: a row that stops clicks, as a table cell does.
			<div onClick={(event) => event.stopPropagation()}>
				<CopyTooltip body="Copy endpoint URL" />
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Copy" });

		fireEvent.pointerDown(trigger, { pointerType: "touch" });
		fireEvent.pointerUp(trigger, { pointerType: "touch" });
		act(() => trigger.focus());
		fireEvent.click(trigger);

		act(() => trigger.blur());
		act(() => trigger.focus());
		expect(trigger).toHaveAttribute("aria-describedby");
	});

	test("a touch press that becomes a scroll leaves the next keyboard focus free to open", () => {
		render(<CopyTooltip body="Copy endpoint URL" />);
		const trigger = screen.getByRole("button", { name: "Copy" });

		fireEvent.pointerDown(trigger, { pointerType: "touch" });
		fireEvent.pointerCancel(trigger, { pointerType: "touch" });
		act(() => trigger.focus());
		expect(trigger).toHaveAttribute("aria-describedby");
	});
});

describe("Tooltip.Root", () => {
	test("a tooltip that its parent closes brings back the next tooltip's delay", async () => {
		const user = userEvent.setup();
		const Tips = ({ forceClosed }: { forceClosed: boolean }) => {
			const [open, setOpen] = useState(false);
			return (
				<TooltipProvider delayDuration={1000} skipDelayDuration={0}>
					<Tooltip.Root open={open && !forceClosed} onOpenChange={setOpen}>
						<Tooltip.Trigger>First</Tooltip.Trigger>
						<Tooltip.Content>First tip</Tooltip.Content>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger>Second</Tooltip.Trigger>
						<Tooltip.Content>Second tip</Tooltip.Content>
					</Tooltip.Root>
				</TooltipProvider>
			);
		};
		const { rerender } = render(<Tips forceClosed={false} />);
		await user.hover(screen.getByRole("button", { name: "First" }));
		await screen.findByText("First tip", undefined, { timeout: 2000 });

		rerender(<Tips forceClosed />);
		await user.hover(screen.getByRole("button", { name: "Second" }));
		expect(screen.queryByText("Second tip")).not.toBeInTheDocument();
	});
});
