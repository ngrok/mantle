import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as HoverCard from "../../components/hover-card/hover-card-parts.js";
import * as Popover from "../../components/popover/popover-parts.js";
import * as Tooltip from "../../components/tooltip/tooltip-parts.js";

const anchorStyle = { position: "fixed", left: 180, top: 200, width: 70, height: 30 } as const;
const panelStyle = {
	width: 140,
	height: 80,
	padding: 0,
	border: 0,
	margin: 0,
	boxSizing: "border-box",
	transition: "none",
} as const;
const families = [
	["Popover", Popover],
	["Tooltip", Tooltip],
	["HoverCard", HoverCard],
] as const;

let style: HTMLStyleElement;

beforeAll(async () => {
	style = document.createElement("style");
	style.textContent =
		(await commands.tailwindCss("./use-float.ts")) + (await commands.tailwindCss("./parts.tsx"));
	document.head.append(style);
});

afterAll(() => {
	style.remove();
});

describe("useFloat placement while open", () => {
	test.each(families)("%s follows a trigger that replaces the old one", async (_name, Parts) => {
		const tree = (replacement: boolean) => (
			<Parts.Root open>
				<Parts.Trigger
					key={String(replacement)}
					style={{ ...anchorStyle, left: replacement ? 240 : 180 }}
				>
					Open
				</Parts.Trigger>
				<Parts.Content data-testid="panel" side="bottom" align="start" style={panelStyle}>
					Content
				</Parts.Content>
			</Parts.Root>
		);
		const { rerender } = render(tree(false));
		const panel = await screen.findByTestId("panel");
		await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0));

		rerender(tree(true));

		await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(240, 0));
	});

	test("Popover follows an Anchor that mounts after it opens", async () => {
		const tree = (anchor: boolean) => (
			<Popover.Root defaultOpen>
				<Popover.Trigger style={anchorStyle}>Open</Popover.Trigger>
				{anchor && <Popover.Anchor style={{ ...anchorStyle, left: 240, width: 100 }} />}
				<Popover.Content data-testid="panel" align="start" sideOffset={4} style={panelStyle}>
					Content
				</Popover.Content>
			</Popover.Root>
		);
		const { rerender } = render(tree(false));
		const panel = await screen.findByTestId("panel");
		await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0));

		rerender(tree(true));

		await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(240, 0));
	});

	test.each(families)(
		"%s follows the inherited direction when it changes",
		async (_name, Parts) => {
			const tree = (dir: "ltr" | "rtl") => (
				<div dir={dir}>
					<Parts.Root open>
						<Parts.Trigger style={anchorStyle}>Open</Parts.Trigger>
						<Parts.Content data-testid="panel" side="bottom" align="start" style={panelStyle}>
							Content
						</Parts.Content>
					</Parts.Root>
				</div>
			);
			const { rerender } = render(tree("ltr"));
			const panel = await screen.findByTestId("panel");
			await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0));

			rerender(tree("rtl"));

			await waitFor(() => expect(panel.getBoundingClientRect().right).toBeCloseTo(250, 0));
		},
	);

	test("Popover keeps the arrow tip sideOffset from the anchor when the arrow grows", async () => {
		const tree = (height: number) => (
			<Popover.Root defaultOpen>
				<Popover.Trigger style={anchorStyle}>Open</Popover.Trigger>
				<Popover.Content data-testid="panel" align="start" sideOffset={4} style={panelStyle}>
					<Popover.Arrow height={height} style={{ display: "block" }} />
					Content
				</Popover.Content>
			</Popover.Root>
		);
		const { rerender } = render(tree(7));
		const panel = await screen.findByTestId("panel");
		// The anchor's bottom edge is at 230, so the panel is 4 + 7 below it.
		await waitFor(() => expect(panel.getBoundingClientRect().top).toBeCloseTo(241, 0));

		rerender(tree(19));

		await waitFor(() => expect(panel.getBoundingClientRect().top).toBeCloseTo(253, 0));
	});
});
