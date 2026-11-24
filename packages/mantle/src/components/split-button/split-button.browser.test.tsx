import { render, screen } from "@testing-library/react";
import { memo } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { SplitButton } from "./index.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. Without the
// real utilities, the menu's width reads a custom property that no rule uses.
beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why border-box: Tailwind's preflight sets it, and the menu's width holds
	// its border and padding only under it.
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; }",
		await commands.tailwindCss("./split-button.tsx"),
		await commands.tailwindCss("../dropdown-menu/dropdown-menu.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

function OpenSplitButton({
	className,
	label,
	open = true,
	width,
}: {
	className?: string;
	label: string;
	open?: boolean;
	width?: "root" | "content";
}) {
	// Why the padding: menus keep 8px from the viewport edge, and a split button
	// flush with the edge would push the menu out of line.
	return (
		<div style={{ padding: 16 }}>
			<div>
				<SplitButton.Root className={className} data-testid="root" open={open}>
					<SplitButton.PrimaryAction>{label}</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More deploy options" />
					<SplitButton.MenuContent width={width}>
						<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>
			</div>
		</div>
	);
}

test("in a block container, Root is as wide as its parts", () => {
	render(<OpenSplitButton label="Deploy to production" />);
	const root = screen.getByTestId("root");
	const trigger = screen.getByRole("button", { hidden: true, name: "More deploy options" });

	expect(root.getBoundingClientRect().right).toBe(trigger.getBoundingClientRect().right);
});

test("a width class on Root still stretches it", () => {
	render(<OpenSplitButton className="w-full" label="Deploy to production" />);
	const root = screen.getByTestId("root");
	const parent = root.parentElement;

	expect(parent).not.toBeNull();
	expect(width(root)).toBe(width(parent as Element));
});

function width(element: Element) {
	return element.getBoundingClientRect().width;
}

/**
 * The distance between the right edges of the menu and the split button. Layout
 * can snap the placed menu's edge to a device pixel, so a placed menu reads under 1.
 */
function rightEdgeGap(menu: Element, root: Element) {
	return Math.abs(menu.getBoundingClientRect().right - root.getBoundingClientRect().right);
}

test("by default the menu lines up with both edges of the split button, and matches its new width when it opens again", async () => {
	const { rerender } = render(<OpenSplitButton label="Deploy to production" />);
	const root = screen.getByTestId("root");
	const menu = screen.getByRole("menu");
	await expect.poll(() => width(menu)).toBe(width(root));
	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
	const widthBefore = width(root);

	rerender(<OpenSplitButton label="Deploy to production" open={false} />);
	rerender(<OpenSplitButton label="Deploy to every production region in the world" />);
	const reopenedMenu = screen.getByRole("menu");

	expect(width(root)).toBeGreaterThan(widthBefore);
	await expect.poll(() => width(reopenedMenu)).toBe(width(root));
	await expect.poll(() => rightEdgeGap(reopenedMenu, root)).toBeLessThan(1);
});

test("by default the menu grows past the split button when an item is wider", async () => {
	// Why at the end: an end-aligned menu wider than the split button reaches
	// past its start edge, and the float keeps it inside the viewport.
	render(
		<div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}>
			<SplitButton.Root data-testid="root" open style={{ width: 160 }}>
				<SplitButton.PrimaryAction className="flex-1">Go</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Deploy to every production region</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</div>,
	);
	const root = screen.getByTestId("root");
	const menu = screen.getByRole("menu");
	const item = screen.getByRole("menuitem");

	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
	expect(width(menu)).toBeGreaterThan(160);
	// Why the line height: a wrapped label fits its width but takes more lines.
	expect(item.getClientRects()).toHaveLength(1);
	expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth);
});

test("a split button with display: contents falls back to the trigger", async () => {
	render(
		<div style={{ display: "flex", padding: 64 }}>
			<SplitButton.Root open style={{ display: "contents" }}>
				<SplitButton.PrimaryAction>Deploy</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</div>,
	);
	const caret = screen.getByRole("button", { name: "More options" });
	const menu = screen.getByRole("menu");

	await expect
		.poll(() => menu.getBoundingClientRect().top)
		.toBeGreaterThan(caret.getBoundingClientRect().bottom);
});

test('width="content" keeps the intrinsic width of the menu', async () => {
	render(<OpenSplitButton label="Deploy to every production region" width="content" />);
	const root = screen.getByTestId("root");
	const menu = screen.getByRole("menu");

	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
	expect(width(menu)).toBeLessThan(width(root));
});

test("the menu follows a stretched split button that resizes while the menu is open", async () => {
	render(
		<div style={{ padding: 16 }}>
			<div data-testid="container" style={{ width: 320 }}>
				<SplitButton.Root className="w-full" data-testid="root" open>
					<SplitButton.PrimaryAction>Deploy</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More deploy options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>
			</div>
		</div>,
	);
	const container = screen.getByTestId("container");
	const root = screen.getByTestId("root");
	const menu = screen.getByRole("menu");
	await expect.poll(() => width(menu)).toBe(width(root));
	const widthBefore = width(root);

	container.style.width = "240px";

	expect(width(root)).toBeLessThan(widthBefore);
	await expect.poll(() => width(menu)).toBe(width(root));
	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
});

test("a dropdown menu inside the split button menu anchors to its own trigger", async () => {
	render(
		<div style={{ padding: 16 }}>
			<SplitButton.Root data-testid="root" open style={{ width: 320 }}>
				<SplitButton.PrimaryAction className="flex-1">Deploy</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More deploy options" />
				<SplitButton.MenuContent>
					<DropdownMenu.Root open>
						<DropdownMenu.Trigger style={{ width: 144 }}>Export</DropdownMenu.Trigger>
						<DropdownMenu.Content width="trigger">
							<DropdownMenu.Item>As CSV</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</div>,
	);
	const inner = screen.getByRole("menu", { name: "Export" });
	const innerTrigger = screen.getByRole("button", { name: "Export" });

	await expect.poll(() => inner.style.getPropertyValue("--anchor-width")).toBe("144px");
	expect(width(innerTrigger)).toBe(144);
});

/** A menu that a parent rerender does not render again, as a hoisted element is not. */
const StaticMenu = memo(function StaticMenu() {
	return (
		<SplitButton.MenuContent>
			<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
		</SplitButton.MenuContent>
	);
});

test("the menu keeps the split button as its anchor when Root and the trigger take new ref callbacks", async () => {
	const ui = () => (
		<div style={{ padding: 16 }}>
			<SplitButton.Root data-testid="root" open ref={() => {}} style={{ width: 320 }}>
				<SplitButton.PrimaryAction className="flex-1">Deploy</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More deploy options" ref={() => {}} />
				<StaticMenu />
			</SplitButton.Root>
		</div>
	);
	const { rerender } = render(ui());
	const menu = screen.getByRole("menu");
	await expect.poll(() => menu.style.getPropertyValue("--anchor-width")).toBe("320px");

	rerender(ui());

	await expect.poll(() => menu.style.getPropertyValue("--anchor-width")).toBe("320px");
	await expect.poll(() => width(menu)).toBe(320);
});

test("the menu under a viewport-wide split button stays inside the viewport", async () => {
	render(
		<div style={{ position: "fixed", top: 16, left: 0, right: 0 }}>
			<SplitButton.Root className="w-full" open>
				<SplitButton.PrimaryAction className="flex-1">Deploy</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More deploy options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</div>,
	);
	const menu = screen.getByRole("menu");
	const viewportWidth = document.documentElement.clientWidth;

	await expect.poll(() => menu.getBoundingClientRect().left).toBe(8);
	expect(menu.getBoundingClientRect().right).toBe(viewportWidth - 8);
});

test("a long primary label truncates inside its container, not past it", () => {
	render(
		<div style={{ width: 320 }}>
			<SplitButton.Root data-testid="root">
				<SplitButton.PrimaryAction style={{ minWidth: 0 }}>
					<span
						style={{
							minWidth: 0,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{"Deploy to production ".repeat(8)}
					</span>
				</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More deploy options" />
			</SplitButton.Root>
		</div>,
	);

	expect(width(screen.getByTestId("root"))).toBeLessThanOrEqual(320);
});

test("under large text, the menu still stays inside the viewport", async () => {
	document.documentElement.style.fontSize = "200px";
	try {
		render(
			<div style={{ position: "fixed", top: 16, left: 0, right: 0 }}>
				<SplitButton.Root className="w-full" open>
					<SplitButton.PrimaryAction className="flex-1">Go</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More deploy options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>
			</div>,
		);
		const menu = screen.getByRole("menu");
		const viewportWidth = document.documentElement.clientWidth;

		await expect.poll(() => menu.getBoundingClientRect().left).toBe(8);
		expect(menu.getBoundingClientRect().right).toBe(viewportWidth - 8);
	} finally {
		document.documentElement.style.fontSize = "";
	}
});

describe("SplitButton menu placement (browser)", () => {
	test.each([
		{ align: undefined, edge: "right" },
		{ align: "start", edge: "left" },
	] as const)(
		"MenuContent align=$align lines up the menu's $edge edge with the split button's",
		async ({ align, edge }) => {
			render(
				<div style={{ position: "absolute", left: 120, top: 20 }}>
					<SplitButton.Root data-testid="root" open>
						<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="More save options" />
						<SplitButton.MenuContent align={align} style={{ width: 160, boxSizing: "border-box" }}>
							<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>,
			);
			const root = screen.getByTestId("root").getBoundingClientRect();

			await expect
				.poll(() => Math.round(screen.getByRole("menu").getBoundingClientRect()[edge]))
				.toBe(Math.round(root[edge]));
		},
	);
});
