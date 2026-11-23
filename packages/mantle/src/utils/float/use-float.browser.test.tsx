import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as HoverCard from "../../components/hover-card/hover-card-parts.js";
import * as Popover from "../../components/popover/popover-parts.js";
import * as Tooltip from "../../components/tooltip/tooltip-parts.js";
import { LayerContainerContext } from "../layer-container/layer-container.js";

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

	test.each(["before", "after"])(
		"Popover follows an Anchor that mounts %s the content after it opens",
		async (order) => {
			const anchor = <Popover.Anchor style={{ ...anchorStyle, left: 240, width: 100 }} />;
			const tree = (mounted: boolean) => (
				<Popover.Root defaultOpen>
					<Popover.Trigger style={anchorStyle}>Open</Popover.Trigger>
					{mounted && order === "before" && anchor}
					<Popover.Content data-testid="panel" align="start" sideOffset={4} style={panelStyle}>
						Content
					</Popover.Content>
					{mounted && order === "after" && anchor}
				</Popover.Root>
			);
			const { rerender } = render(tree(false));
			const panel = await screen.findByTestId("panel");
			await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0));

			rerender(tree(true));

			await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(240, 0));
		},
	);

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

	test("an open Popover with no anchor shows when its first Anchor mounts", async () => {
		const tree = (anchor: boolean) => (
			<Popover.Root open>
				{anchor && <Popover.Anchor style={anchorStyle} />}
				<Popover.Content data-testid="panel" side="bottom" align="start" style={panelStyle}>
					Content
				</Popover.Content>
			</Popover.Root>
		);
		const { rerender } = render(tree(false));
		const panel = await screen.findByTestId("panel");
		expect(panel.matches(":popover-open")).toBe(false);

		rerender(tree(true));

		await waitFor(() => expect(panel.matches(":popover-open")).toBe(true));
		expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0);
	});

	test.each(["inserted", "replaced"])(
		"Popover keeps the arrow tip sideOffset from the anchor when an arrow is %s",
		async (mode) => {
			const tree = (updated: boolean) => (
				<Popover.Root open>
					<Popover.Trigger style={anchorStyle}>Open</Popover.Trigger>
					<Popover.Content data-testid="panel" align="start" sideOffset={4} style={panelStyle}>
						{(mode === "replaced" || updated) && (
							<Popover.Arrow
								key={String(updated)}
								height={updated ? 19 : 7}
								style={{ display: "block" }}
							/>
						)}
						Content
					</Popover.Content>
				</Popover.Root>
			);
			const { rerender } = render(tree(false));
			const panel = await screen.findByTestId("panel");
			await waitFor(() =>
				expect(panel.getBoundingClientRect().top).toBeCloseTo(mode === "replaced" ? 241 : 234, 0),
			);

			rerender(tree(true));

			await waitFor(() => expect(panel.getBoundingClientRect().top).toBeCloseTo(253, 0));
		},
	);

	test.each(families)(
		"%s follows a custom trigger that replaces its own element",
		async (_name, Parts) => {
			const control = { replaceElement: () => {} };
			function CustomTrigger(props: ComponentProps<"button">) {
				const [replacement, setReplacement] = useState(false);
				useEffect(() => {
					control.replaceElement = () => setReplacement(true);
				});
				return (
					<button
						type="button"
						key={String(replacement)}
						{...props}
						style={{ ...anchorStyle, left: replacement ? 240 : 180 }}
					>
						Open
					</button>
				);
			}
			render(
				<Parts.Root open>
					<Parts.Trigger asChild>
						<CustomTrigger />
					</Parts.Trigger>
					<Parts.Content data-testid="panel" side="bottom" align="start" style={panelStyle}>
						Content
					</Parts.Content>
				</Parts.Root>,
			);
			const panel = await screen.findByTestId("panel");
			await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0));

			await act(async () => control.replaceElement());

			await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(240, 0));
		},
	);
});

describe("useFloat placement when neither side fits", () => {
	test.each(families)("%s takes the side with more room", async (_name, Parts) => {
		render(
			<Parts.Root open>
				<Parts.Trigger style={{ ...anchorStyle, top: 520 }}>Open</Parts.Trigger>
				<Parts.Content data-testid="panel" side="bottom" style={{ ...panelStyle, height: 600 }}>
					Content
				</Parts.Content>
			</Parts.Root>,
		);
		const panel = await screen.findByTestId("panel");

		// Why top: 520 px of room above the trigger, and the rest of the viewport below it.
		await waitFor(() => expect(panel.dataset.side).toBe("top"));
	});
});

describe("useFloat placement near the edge of the room", () => {
	test("a scrolling popover beside its trigger lines up with the trigger", async () => {
		render(
			<Popover.Root open>
				<Popover.Trigger style={anchorStyle}>Open</Popover.Trigger>
				<Popover.Content
					data-testid="panel"
					side="right"
					align="start"
					style={{ ...panelStyle, overflowY: "auto" }}
				>
					<div style={{ height: 1000 }}>Long content</div>
				</Popover.Content>
			</Popover.Root>,
		);
		const panel = await screen.findByTestId("panel");

		await waitFor(() => expect(panel.getBoundingClientRect().top).toBeCloseTo(200, 0));
	});

	test("a popover with an arrow keeps its side as its trigger moves a pixel", async () => {
		const tree = (top: number) => (
			<Popover.Root open>
				<Popover.Trigger style={{ ...anchorStyle, top }}>Open</Popover.Trigger>
				<Popover.Content data-testid="panel" side="top" style={panelStyle}>
					<Popover.Arrow />
				</Popover.Content>
			</Popover.Root>
		);
		// Why 102: 80 px of panel, a 4 px offset, a 7 px arrow, and 8 px of padding fit with 3 px to spare.
		const { rerender } = render(tree(102));
		const panel = await screen.findByTestId("panel");
		await waitFor(() => expect(panel.dataset.side).toBe("top"));

		for (const top of [103, 102, 103]) {
			rerender(tree(top));
			await new Promise(requestAnimationFrame);
			await new Promise(requestAnimationFrame);
			expect(panel.dataset.side).toBe("top");
		}
	});
});

describe("useFloat placement as the anchor moves", () => {
	/** Two frames: the frame that sees the move, and the one that paints it. */
	const nextFrames = async () => {
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
	};
	/** Waits for the open transition, so no `transitionend` places the float again. */
	const settle = async (panel: HTMLElement) => {
		await Promise.all(panel.getAnimations().map((animation) => animation.finished));
		await nextFrames();
	};
	const tree = () => (
		<div data-testid="container" style={{ position: "fixed", left: 100, top: 100 }}>
			<div data-testid="spacer" />
			<Popover.Root defaultOpen>
				<Popover.Trigger style={{ width: 80, height: 24 }}>Trigger</Popover.Trigger>
				<Popover.Content align="start" style={panelStyle}>
					Content
				</Popover.Content>
			</Popover.Root>
		</div>
	);

	test("a layout shift above an unchanged trigger moves its open popover", async () => {
		render(tree());
		const trigger = screen.getByRole("button", { name: "Trigger" });
		const panel = await screen.findByRole("dialog");
		await waitFor(() =>
			expect(panel.getBoundingClientRect().top).toBeCloseTo(
				trigger.getBoundingClientRect().bottom + 4,
				0,
			),
		);

		await settle(panel);

		screen.getByTestId("spacer").style.height = "80px";
		await nextFrames();

		expect(panel.getBoundingClientRect().top).toBeCloseTo(
			trigger.getBoundingClientRect().bottom + 4,
			0,
		);
	});

	test("a transform on an ancestor of the trigger moves its open popover", async () => {
		render(tree());
		const trigger = screen.getByRole("button", { name: "Trigger" });
		const panel = await screen.findByRole("dialog");
		await waitFor(() =>
			expect(panel.getBoundingClientRect().left).toBeCloseTo(
				trigger.getBoundingClientRect().left,
				0,
			),
		);

		await settle(panel);

		screen.getByTestId("container").style.transform = "translateX(100px)";
		await nextFrames();

		expect(panel.getBoundingClientRect().left).toBeCloseTo(trigger.getBoundingClientRect().left, 0);
	});

	test("a popover follows its trigger through a running animation", async () => {
		render(tree());
		const trigger = screen.getByRole("button", { name: "Trigger" });
		const panel = await screen.findByRole("dialog");
		await settle(panel);
		const animation = screen
			.getByTestId("container")
			.animate([{ translate: "0" }, { translate: "300px" }], { duration: 2000 });

		try {
			let before = trigger.getBoundingClientRect().left;
			for (let frame = 0; frame < 10; frame++) {
				await nextFrames();
				const now = trigger.getBoundingClientRect().left;
				// Why between the two: the observer reports after a paint, so the float can
				// trail its anchor by a frame. A bound in pixels fails when WebKit in CI
				// skips frames, because the anchor then moves far in one frame.
				const left = panel.getBoundingClientRect().left;
				expect(left).toBeGreaterThanOrEqual(before - 1);
				expect(left).toBeLessThanOrEqual(now + 1);
				before = now;
			}
			expect(trigger.getBoundingClientRect().left).toBeGreaterThan(110);
		} finally {
			animation.cancel();
		}
	});

	test("a centered popover stays centered as its trigger shrinks", async () => {
		render(
			<Popover.Root defaultOpen>
				<Popover.Trigger style={{ ...anchorStyle, width: 140 }}>Trigger</Popover.Trigger>
				<Popover.Content style={panelStyle}>Content</Popover.Content>
			</Popover.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Trigger" });
		const panel = await screen.findByRole("dialog");
		await settle(panel);

		trigger.style.width = "60px";
		await nextFrames();

		// Why 140: the trigger center, 180 + 60 / 2, less half the 140 px panel.
		expect(panel.getBoundingClientRect().left).toBeCloseTo(140, 0);
		expect(panel.style.getPropertyValue("--anchor-width")).toBe("60px");
	});

	test("a zoomed popover lines up with its anchor", async () => {
		render(
			<Popover.Root defaultOpen>
				<Popover.Trigger style={anchorStyle}>Trigger</Popover.Trigger>
				<Popover.Content align="start" style={{ ...panelStyle, zoom: 1.5 }}>
					Content
				</Popover.Content>
			</Popover.Root>,
		);
		const panel = await screen.findByRole("dialog");

		await waitFor(() => expect(panel.getBoundingClientRect().left).toBeCloseTo(180, 0));
		// Why 236: the anchor bottom, 230, plus the 4 px side offset in the float's zoomed pixels.
		expect(panel.getBoundingClientRect().top).toBeCloseTo(236, 0);
	});
});

describe("useFloat with a portal that connects later", () => {
	test("a render before the next frame starts the float once", async () => {
		const host = document.createElement("div");
		const outside: string[] = [];
		const tree = (label: string) => (
			<LayerContainerContext.Provider value={host}>
				<Popover.Root open>
					<Popover.Trigger style={anchorStyle}>Open</Popover.Trigger>
					<Popover.Content
						data-testid="panel"
						style={panelStyle}
						onPointerDownOutside={(event) => {
							event.preventDefault();
							outside.push("outside");
						}}
					>
						{label}
					</Popover.Content>
				</Popover.Root>
			</LayerContainerContext.Provider>
		);
		const { rerender, unmount } = render(tree("First"));
		const anchor = screen.getByRole("button", { name: "Open" });
		await act(async () => {
			document.body.append(host);
			rerender(tree("Second"));
		});
		const panel = await screen.findByTestId("panel");
		await waitFor(() => expect(panel.matches(":popover-open")).toBe(true));
		await new Promise(requestAnimationFrame);

		document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		expect(outside).toEqual(["outside"]);
		unmount();
		host.remove();
		document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		expect(outside).toEqual(["outside"]);
		await waitFor(() => expect(anchor.style.getPropertyValue("anchor-name")).toBe(""));
	});
});
