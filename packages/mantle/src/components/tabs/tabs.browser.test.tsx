import { act, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import * as Tabs from "./tabs-parts.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities these tests read: the
 * slot-scoped icon rule the trigger carries, the root's `--tabs-gap` flex
 * layout that `Tabs.Separator` cancels with a parent-scoped negative margin,
 * and the horizontal list's scroll-container box. Preflight's `box-sizing`
 * rule matters for that box: on a content-box list, `w-full` plus
 * the padding still reaches the root's right edge and the bug hides.
 * Inlined so the tests stay hermetic and need no Tailwind build step: a browser
 * test loads no stylesheet, so without this the wrapper would report its initial
 * `display`, the separator would sit a gap below the list, and the assertions
 * would pass for the wrong reason.
 */
const TABS_LAYOUT_STYLE = `
:root { --spacing: 0.25rem; }
@layer base {
	*, ::before, ::after { box-sizing: border-box; }
}
@layer utilities {
	.contents { display: contents; }
	.flex { display: flex; }
	.flex-col { flex-direction: column; }
	.flex-row { flex-direction: row; }
	.\\[--tabs-gap\\:--spacing\\(4\\)\\] { --tabs-gap: calc(var(--spacing) * 4); }
	.gap-\\(--tabs-gap\\) { gap: var(--tabs-gap); }
	.h-px { height: 1px; }
	.w-px { width: 1px; }
	.w-full { width: 100%; }
	.select-none { user-select: none; }
	.h-full { height: 100%; }
	.h-auto { height: auto; }
	.self-stretch { align-self: stretch; }
	.overflow-x-auto { overflow-x: auto; }
	.px-1 { padding-inline: calc(var(--spacing) * 1); }
	.-mx-1 { margin-inline: calc(var(--spacing) * -1); }
	[data-slot~=tabs] > .\\[\\[data-slot\\~\\=tabs\\]\\>\\&\\]\\:-mt-\\(--tabs-gap\\) { margin-top: calc(var(--tabs-gap) * -1); }
	[data-slot~=tabs] > .\\[\\[data-slot\\~\\=tabs\\]\\>\\&\\]\\:-ml-\\(--tabs-gap\\) { margin-left: calc(var(--tabs-gap) * -1); }
	.\\[\\[hidden\\=until-found\\]\\]\\:sr-only[hidden=until-found] { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
	.p-6 { padding: 1.5rem; }
	.tabs-trigger { display: flex; align-items: center; gap: 0.5rem; }
	.tabs-trigger > [data-slot="tabs-trigger-label"] > svg { width: 1.25rem; height: 1.25rem; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = TABS_LAYOUT_STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

test("the label span generates no box, so an icon stays a flex child of the trigger", () => {
	render(
		<Tabs.Root orientation="horizontal" defaultValue="a">
			<Tabs.List>
				<Tabs.Trigger className="tabs-trigger" value="a">
					<svg data-testid="glyph" />
					Tab A
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Panel A</Tabs.Content>
		</Tabs.Root>,
	);

	const trigger = screen.getByRole("tab");
	const label = trigger.querySelector('[data-slot="tabs-trigger-label"]');
	if (label == null) {
		throw new Error('No element carries data-slot="tabs-trigger-label".');
	}

	expect(getComputedStyle(label).display).toBe("contents");
	expect(label.getClientRects()).toHaveLength(0);

	// The slot-scoped rule reaches the icon through the wrapper, and the `gap`
	// still separates icon from text because the wrapper generates no box.
	const glyph = screen.getByTestId("glyph");
	expect(glyph.getBoundingClientRect().width).toBe(20);
	expect(glyph.parentElement).toBe(label);
});

/** The separator the tree renders, or a thrown error when the slot is missing. */
function getSeparator(container: HTMLElement): HTMLElement {
	const separator = container.querySelector<HTMLElement>('[data-slot~="tabs-separator"]');
	if (separator == null) {
		throw new Error("No element carries the tabs-separator slot.");
	}
	return separator;
}

test("a horizontal separator sits flush under the list and spans the root's width", () => {
	const { container } = render(
		<Tabs.Root orientation="horizontal" defaultValue="a" style={{ width: 320 }}>
			<Tabs.List>
				<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Separator />
			<Tabs.Content value="a">Panel A</Tabs.Content>
		</Tabs.Root>,
	);

	const root = container.querySelector('[data-slot="tabs"]');
	if (root == null) {
		throw new Error('No element carries data-slot="tabs".');
	}
	const list = screen.getByRole("tablist").getBoundingClientRect();
	const separator = getSeparator(container).getBoundingClientRect();
	const content = screen.getByRole("tabpanel").getBoundingClientRect();

	// The root's gap is 16px, so a separator that is one gap below the list
	// has lost its offset, and content one gap below the separator keeps it.
	expect(separator.top).toBe(list.bottom);
	expect(separator.height).toBe(1);
	expect(separator.width).toBe(root.getBoundingClientRect().width);
	expect(content.top).toBe(separator.bottom + 16);
});

test("a vertical separator sits flush beside the list and spans the root's height", () => {
	const { container } = render(
		<Tabs.Root orientation="vertical" defaultValue="a">
			<Tabs.List>
				<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Separator />
			<Tabs.Content value="a" style={{ height: 120 }}>
				Panel A
			</Tabs.Content>
		</Tabs.Root>,
	);

	const list = screen.getByRole("tablist").getBoundingClientRect();
	const separator = getSeparator(container).getBoundingClientRect();
	const content = screen.getByRole("tabpanel").getBoundingClientRect();

	expect(separator.left).toBe(list.right);
	expect(separator.width).toBe(1);
	// `Separator` alone sets `h-full`, which a row with auto height resolves to
	// 0px. The part's `h-auto self-stretch` is what reaches the content's height.
	expect(separator.height).toBe(120);
	expect(content.left).toBe(separator.right + 16);
});

test("a separator keeps its offset under a root whose slot an ancestor's chain joins", () => {
	const { container } = render(
		// The `data-slot` prop stands in for the chain an `asChild` ancestor
		// forwards, so the root renders `data-slot="shell tabs"`.
		<Tabs.Root orientation="horizontal" defaultValue="a" data-slot="shell">
			<Tabs.List>
				<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Separator />
			<Tabs.Content value="a">Panel A</Tabs.Content>
		</Tabs.Root>,
	);

	const root = container.querySelector('[data-slot="shell tabs"]');
	if (root == null) {
		throw new Error('No element carries data-slot="shell tabs".');
	}
	const list = screen.getByRole("tablist").getBoundingClientRect();
	const separator = getSeparator(container).getBoundingClientRect();

	// An exact `[data-slot=tabs]` parent match misses the joined value, and the
	// separator then sits one gap below the list.
	expect(separator.top).toBe(list.bottom);
});

test("a separator inside a wrapper of the consumer's own keeps its flow position", () => {
	const { container } = render(
		<Tabs.Root orientation="horizontal" defaultValue="a">
			<div>
				<Tabs.List>
					<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Separator />
			</div>
			<Tabs.Content value="a">Panel A</Tabs.Content>
		</Tabs.Root>,
	);

	const list = screen.getByRole("tablist").getBoundingClientRect();
	const separator = getSeparator(container).getBoundingClientRect();

	// The wrapper lays out with no gap, so the parent-scoped margin must not
	// fire: a separator pulled up 16px here would overlap the triggers.
	expect(separator.top).toBe(list.bottom);
});

test("a horizontal list's triggers line up with the separator at both scroll ends", () => {
	const { container } = render(
		<Tabs.Root orientation="horizontal" defaultValue="a" style={{ width: 240 }}>
			<Tabs.List>
				<Tabs.Trigger value="a" style={{ flex: "0 0 160px" }}>
					Tab A
				</Tabs.Trigger>
				<Tabs.Trigger value="b" style={{ flex: "0 0 160px" }}>
					Tab B
				</Tabs.Trigger>
				<Tabs.Trigger value="c" style={{ flex: "0 0 160px" }}>
					Tab C
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Separator />
			<Tabs.Content value="a">Panel A</Tabs.Content>
		</Tabs.Root>,
	);

	const list = screen.getByRole("tablist");
	const first = screen.getByRole("tab", { name: "Tab A" });
	const last = screen.getByRole("tab", { name: "Tab C" });
	const separator = getSeparator(container).getBoundingClientRect();

	// The list's `-mx-1 px-1` give the focus ring room past the root on both
	// sides, so the list must stretch across those margins. A list sized to
	// `100%` of the root instead lands 8px short on the right edge alone.
	list.scrollLeft = 0;
	expect(first.getBoundingClientRect().left).toBe(separator.left);
	list.scrollLeft = list.scrollWidth;
	expect(last.getBoundingClientRect().right).toBe(separator.right);
});

/**
 * A controlled root that never takes the value it is handed. Radix focuses the
 * trigger inside its own mousedown handler, and that focus activates the
 * trigger again before any state flushes, so the dedupe depends on the order
 * a real mousedown, its focus, and the microtask after them run in. A
 * synthetic mousedown shares one stack with the focus by construction, so
 * only Chromium pins that order.
 */
function ControlledTabs({ onValueChange }: { onValueChange: (value: string) => void }) {
	return (
		<Tabs.Root value="a" onValueChange={onValueChange}>
			<Tabs.List>
				<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
				<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
	);
}

test("a real click on a controlled root fires onValueChange once", async () => {
	const onValueChange = vi.fn<(value: string) => void>();
	render(<ControlledTabs onValueChange={onValueChange} />);

	await userEvent.click(screen.getByRole("tab", { name: "Tab B" }));

	expect(onValueChange).toHaveBeenCalledTimes(1);
	expect(onValueChange).toHaveBeenLastCalledWith("b");
});

test("a second real click on the same trigger fires again when the root kept its value", async () => {
	const onValueChange = vi.fn<(value: string) => void>();
	render(<ControlledTabs onValueChange={onValueChange} />);
	const tab = screen.getByRole("tab", { name: "Tab B" });

	await userEvent.click(tab);
	await userEvent.click(tab);

	expect(onValueChange).toHaveBeenCalledTimes(2);
});

function PlainTabs() {
	return (
		<Tabs.Root defaultValue="a">
			<Tabs.List>
				<Tabs.Trigger value="a">Tab A</Tabs.Trigger>
				<Tabs.Trigger value="b">Tab B</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Panel A</Tabs.Content>
			<Tabs.Content value="b">Panel B</Tabs.Content>
		</Tabs.Root>
	);
}

// Why Tab first: Chromium gives a focus moved by script the focus ring state of
// the element that had focus before, so the bug shows only after keyboard focus.
test("a click after keyboard focus activates the tab without the focus ring", async () => {
	render(<PlainTabs />);
	const tab = screen.getByRole("tab", { name: "Tab B" });
	await userEvent.keyboard("{Tab}");

	await userEvent.click(tab);

	expect(tab).toHaveAttribute("aria-selected", "true");
	expect(tab).toHaveFocus();
	expect(tab.matches(":focus-visible")).toBe(false);
});

test("the arrow keys move a focus that shows the focus ring", async () => {
	render(<PlainTabs />);
	const tab = screen.getByRole("tab", { name: "Tab B" });
	await userEvent.click(screen.getByRole("tab", { name: "Tab A" }));

	await userEvent.keyboard("{ArrowRight}");

	expect(tab).toHaveFocus();
	expect(tab.matches(":focus-visible")).toBe(true);
});

/** Tabs whose triggers are `asChild` links, the shape a router link takes. */
function LinkTabs() {
	return (
		<Tabs.Root defaultValue="a">
			<Tabs.List>
				<Tabs.Trigger value="a" asChild>
					<a href="#a">Tab A</a>
				</Tabs.Trigger>
				<Tabs.Trigger value="b" asChild>
					<a href="#b">Tab B</a>
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Panel A</Tabs.Content>
			<Tabs.Content value="b">Panel B</Tabs.Content>
		</Tabs.Root>
	);
}

test("a click on an asChild link follows it and activates its tab without the focus ring", async () => {
	render(<LinkTabs />);
	const tab = screen.getByRole("tab", { name: "Tab B" });
	await userEvent.keyboard("{Tab}");

	await userEvent.click(tab);

	expect(window.location.hash).toBe("#b");
	expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
	expect(tab).toHaveFocus();
	expect(tab.matches(":focus-visible")).toBe(false);
});

// Why: a link follows only a press released on it, so the tab must not switch
// on the press alone, or the panel and the URL disagree.
test("a press released off an asChild link switches no tab", async () => {
	render(<LinkTabs />);
	const hash = window.location.hash;

	await userEvent.dragAndDrop(
		screen.getByRole("tab", { name: "Tab B" }),
		screen.getByRole("tablist"),
	);

	expect(window.location.hash).toBe(hash);
	expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
});

test("a press that moves on an asChild link starts no drag", async () => {
	render(<LinkTabs />);
	const tab = screen.getByRole("tab", { name: "Tab B" });
	let dragStarted = false;
	tab.addEventListener("dragstart", () => {
		dragStarted = true;
	});

	await userEvent.dragAndDrop(tab, screen.getByRole("tab", { name: "Tab A" }));

	expect(dragStarted).toBe(false);
});

// Why: in manual mode the Radix focus handler activates nothing, so a link
// trigger that skips the press must activate on its click.
test("a click on an asChild link activates its tab in manual activation mode", async () => {
	render(
		<Tabs.Root defaultValue="a" activationMode="manual">
			<Tabs.List>
				<Tabs.Trigger value="a" asChild>
					<a href="#a">Tab A</a>
				</Tabs.Trigger>
				<Tabs.Trigger value="b" asChild>
					<a href="#b">Tab B</a>
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Panel A</Tabs.Content>
			<Tabs.Content value="b">Panel B</Tabs.Content>
		</Tabs.Root>,
	);

	await userEvent.click(screen.getByRole("tab", { name: "Tab B" }));

	expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
});

test("a second click on a focused asChild link fires again when the root kept its value", async () => {
	const onValueChange = vi.fn<(value: string) => void>();
	render(
		<Tabs.Root value="a" onValueChange={onValueChange}>
			<Tabs.List>
				<Tabs.Trigger value="a" asChild>
					<a href="#a">Tab A</a>
				</Tabs.Trigger>
				<Tabs.Trigger value="b" asChild>
					<a href="#b">Tab B</a>
				</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>,
	);
	const tab = screen.getByRole("tab", { name: "Tab B" });

	await userEvent.click(tab);
	await userEvent.click(tab);

	expect(onValueChange).toHaveBeenCalledTimes(2);
	expect(onValueChange).toHaveBeenLastCalledWith("b");
});

test("a click that the consumer cancels on an asChild link switches no tab", async () => {
	render(
		<Tabs.Root defaultValue="a">
			<Tabs.List>
				<Tabs.Trigger value="a" asChild>
					<a href="#a">Tab A</a>
				</Tabs.Trigger>
				<Tabs.Trigger value="b" asChild>
					<a href="#b" onClick={(event) => event.preventDefault()}>
						Tab B
					</a>
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Panel A</Tabs.Content>
			<Tabs.Content value="b">Panel B</Tabs.Content>
		</Tabs.Root>,
	);

	await userEvent.click(screen.getByRole("tab", { name: "Tab B" }));

	expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
});

// Why a fully visible tab: Playwright scrolls a clipped target into view before
// it clicks. Tab B sits right of the list's center, so a keyboard-path focus
// would scroll it to the center.
test("a pointer click on an asChild link in an overflowing list does not scroll it into view", async () => {
	render(
		<Tabs.Root defaultValue="a" style={{ width: 400 }}>
			<Tabs.List>
				{["a", "b", "c"].map((value) => (
					<Tabs.Trigger key={value} value={value} asChild style={{ flex: "0 0 160px" }}>
						<a href={`#${value}`}>Tab {value.toUpperCase()}</a>
					</Tabs.Trigger>
				))}
			</Tabs.List>
		</Tabs.Root>,
	);
	const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

	await userEvent.click(screen.getByRole("tab", { name: "Tab B" }));

	expect(screen.getByRole("tab", { name: "Tab B" })).toHaveFocus();
	expect(scrollIntoView).not.toHaveBeenCalled();
	scrollIntoView.mockRestore();
});

test("a selection across the tabs copies the panel text and no tab label", () => {
	const { container } = render(<PlainTabs />);

	document.getSelection()?.selectAllChildren(container);

	expect(document.getSelection()?.toString()).toBe("Panel A");
});

const axeViolations = async () => {
	// Why WCAG tags only: `region` is a best practice for whole pages, and a test page has no landmarks.
	// Why no `target-size`: the test page loads no Tailwind, so a trigger is one bare line of text.
	const results = await axe.run(document.body, {
		resultTypes: ["violations"],
		rules: { "target-size": { enabled: false } },
		runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
	});
	return results.violations.map((violation) => violation.id);
};

const tab = (name: string) => screen.getByRole("tab", { name });

describe("Tabs keyboard, focus, and ARIA contract", () => {
	const FourTabs = (props: Partial<Parameters<typeof Tabs.Root>[0]> & { loop?: boolean }) => {
		const { loop, ...rootProps } = props;
		return (
			<>
				<button type="button">Before</button>
				<Tabs.Root defaultValue="b" {...rootProps}>
					<Tabs.List aria-label="Settings" loop={loop}>
						<Tabs.Trigger value="a">A</Tabs.Trigger>
						<Tabs.Trigger value="b">B</Tabs.Trigger>
						<Tabs.Trigger value="c" disabled>
							C
						</Tabs.Trigger>
						<Tabs.Trigger value="d">D</Tabs.Trigger>
					</Tabs.List>
					{["a", "b", "c", "d"].map((value) => (
						<Tabs.Content key={value} value={value}>
							Panel {value.toUpperCase()}
						</Tabs.Content>
					))}
				</Tabs.Root>
			</>
		);
	};

	test("joins each tab to its panel, and only the active tab is a Tab stop", async () => {
		render(<FourTabs />);
		const panel = screen.getByRole("tabpanel");

		expect(tab("B")).toHaveAttribute("aria-selected", "true");
		expect(tab("A")).toHaveAttribute("aria-selected", "false");
		expect(tab("B").getAttribute("aria-controls")).toBe(panel.id);
		expect(panel).toHaveAccessibleName("B");
		expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
		expect(await axeViolations()).toEqual([]);

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");
		expect(tab("B")).toHaveFocus();
		await userEvent.keyboard("{Tab}");
		expect(panel).toHaveFocus();
	});

	test("the arrow keys skip a disabled tab, wrap, and activate in automatic mode", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<FourTabs onValueChange={onValueChange} />);
		tab("B").focus();

		await userEvent.keyboard("{ArrowRight}");
		expect(tab("D")).toHaveFocus();
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel D");
		await userEvent.keyboard("{ArrowRight}");
		expect(tab("A")).toHaveFocus();
		await userEvent.keyboard("{ArrowLeft}");
		expect(tab("D")).toHaveFocus();
		await userEvent.keyboard("{Home}");
		expect(tab("A")).toHaveFocus();
		await userEvent.keyboard("{End}");
		expect(tab("D")).toHaveFocus();
		// A horizontal list ignores the vertical arrows.
		await userEvent.keyboard("{ArrowDown}");
		expect(tab("D")).toHaveFocus();
		expect(onValueChange.mock.calls).toEqual([["d"], ["a"], ["d"], ["a"], ["d"]]);
	});

	test("Home on the first tab keeps focus there", async () => {
		render(<FourTabs />);
		tab("A").focus();

		await userEvent.keyboard("{Home}");

		expect(tab("A")).toHaveFocus();
	});

	test("without loop, the arrow keys stop at the ends", async () => {
		render(<FourTabs loop={false} />);
		tab("B").focus();

		await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
		expect(tab("A")).toHaveFocus();
		await userEvent.keyboard("{End}{ArrowRight}");
		expect(tab("D")).toHaveFocus();
	});

	test("a vertical list moves with the up and down arrows only", async () => {
		render(<FourTabs orientation="vertical" />);
		tab("B").focus();

		await userEvent.keyboard("{ArrowRight}");
		expect(tab("B")).toHaveFocus();
		await userEvent.keyboard("{ArrowUp}");
		expect(tab("A")).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}{ArrowDown}");
		expect(tab("D")).toHaveFocus();
	});

	test("a right-to-left list swaps the left and right arrows", async () => {
		render(
			<div dir="rtl">
				<FourTabs />
			</div>,
		);
		tab("B").focus();

		await userEvent.keyboard("{ArrowLeft}");
		expect(tab("D")).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		expect(tab("B")).toHaveFocus();
	});

	test("manual mode moves focus with the arrows and activates on Enter or Space", async () => {
		render(<FourTabs activationMode="manual" />);
		tab("B").focus();

		await userEvent.keyboard("{ArrowLeft}");
		expect(tab("A")).toHaveFocus();
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
		await userEvent.keyboard("{Enter}");
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
		await userEvent.keyboard("{End} ");
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel D");
	});

	test("with no active tab, Tab reaches the first tab and its focus activates it", async () => {
		render(<FourTabs defaultValue={undefined} />);

		expect(screen.queryByRole("tabpanel")).toBeNull();
		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");
		expect(tab("A")).toHaveFocus();
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
	});

	test("Enter on a link tab fires onValueChange once on a controlled root", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Tabs.Root value="a" onValueChange={onValueChange} activationMode="manual">
				<Tabs.List aria-label="Pages">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b" asChild>
						<a href="#b">B</a>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);
		tab("A").focus();

		await userEvent.keyboard("{ArrowRight}{Enter}");

		expect(tab("B")).toHaveFocus();
		expect(onValueChange.mock.calls).toEqual([["b"]]);
		history.replaceState(null, "", window.location.pathname);
	});

	test("a panel hidden until found reveals and activates its tab on a fragment link", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Tabs.Root defaultValue="a" onValueChange={onValueChange}>
				<Tabs.List aria-label="Docs">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b">B</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="a" hiddenUntilFound>
					Panel A
				</Tabs.Content>
				<Tabs.Content value="b" hiddenUntilFound className="p-6">
					<p id="deep-link-target">Panel B</p>
				</Tabs.Content>
			</Tabs.Root>,
		);
		const panelB = screen.getByText("Panel B").parentElement;
		expect(panelB).toHaveAttribute("hidden", "until-found");
		// The hidden panel's own padding and the root's gap take no space.
		expect(panelB?.getBoundingClientRect().height).toBeLessThanOrEqual(1);
		expect(getComputedStyle(panelB as HTMLElement).position).toBe("absolute");
		expect(screen.getByText("Panel A").closest("[hidden]")).toBeNull();

		window.location.hash = "#deep-link-target";

		await vi.waitFor(() => {
			expect(tab("B")).toHaveAttribute("aria-selected", "true");
		});
		expect(panelB).not.toHaveAttribute("hidden");
		expect(onValueChange.mock.calls).toEqual([["b"]]);
		history.replaceState(null, "", window.location.pathname);
	});

	test("an asChild button tab inside a form selects without submitting", async () => {
		const onSubmit = vi.fn<() => void>();
		render(
			<form
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<Tabs.Root defaultValue="a">
					<Tabs.List aria-label="Form tabs">
						<Tabs.Trigger value="a">A</Tabs.Trigger>
						<Tabs.Trigger value="b" asChild>
							{/* oxlint-disable-next-line react/button-has-type -- Why: the test needs a child with no type of its own. */}
							<button>B</button>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</form>,
		);

		await userEvent.click(tab("B"));

		expect(tab("B")).toHaveAttribute("aria-selected", "true");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("in manual mode, Tab leaves the list from the focused tab", async () => {
		render(<FourTabs activationMode="manual" />);
		tab("B").focus();

		await userEvent.keyboard("{ArrowLeft}{Tab}");

		expect(screen.getByRole("tabpanel")).toHaveFocus();
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		expect(tab("A")).toHaveFocus();
	});

	test("a selection made outside the list is where Tab comes back", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		const Controlled = () => {
			const [value, setValue] = useState("a");
			return (
				<>
					<button type="button">Before</button>
					<Tabs.Root
						value={value}
						onValueChange={(next) => {
							onValueChange(next);
							setValue(next);
						}}
					>
						<Tabs.List aria-label="Controlled">
							<Tabs.Trigger value="a">A</Tabs.Trigger>
							<Tabs.Trigger value="b">B</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
					<button type="button" onClick={() => setValue("b")}>
						Pick B
					</button>
				</>
			);
		};
		render(<Controlled />);

		await userEvent.click(tab("A"));
		await userEvent.click(screen.getByRole("button", { name: "Pick B" }));
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

		expect(tab("B")).toHaveFocus();
		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(tab("B")).toHaveFocus();
		expect(tab("B")).toHaveAttribute("aria-selected", "true");
		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("in manual mode, a Tab forward into the list enters on the selected tab", async () => {
		render(<FourTabs activationMode="manual" />);
		tab("B").focus();
		await userEvent.keyboard("{ArrowLeft}{Tab}");

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(tab("B")).toHaveFocus();
	});

	test.each([
		{ name: "the selected tab", defaultValue: "a" },
		{ name: "the first tab, with no selection", defaultValue: undefined },
	])("Tab reaches the list when $name cannot take focus", async ({ defaultValue }) => {
		render(
			<>
				<button type="button">Before</button>
				<Tabs.Root defaultValue={defaultValue}>
					<Tabs.List aria-label="Hidden stop">
						<Tabs.Trigger value="a" style={{ display: "none" }}>
							A
						</Tabs.Trigger>
						<Tabs.Trigger value="b">B</Tabs.Trigger>
						<Tabs.Trigger value="c">C</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(tab("B")).toHaveFocus();
	});

	test("a press that a focus handler nests in another root selects each tab once", async () => {
		const calls: string[] = [];
		render(
			<>
				<Tabs.Root value="x" onValueChange={(value) => calls.push(value)}>
					<Tabs.List aria-label="Other">
						<Tabs.Trigger value="x" asChild>
							<a href="#x">X</a>
						</Tabs.Trigger>
						<Tabs.Trigger value="y" asChild>
							<a href="#y">Y</a>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
				<Tabs.Root value="a" onValueChange={(value) => calls.push(value)}>
					<Tabs.List aria-label="Pressed">
						<Tabs.Trigger value="a" asChild>
							<a href="#a">A</a>
						</Tabs.Trigger>
						<Tabs.Trigger value="b" asChild onFocus={() => tab("Y").click()}>
							<a href="#b">B</a>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</>,
		);

		await userEvent.click(tab("B"));

		expect(calls).toEqual(["y", "b"]);
		history.replaceState(null, "", window.location.pathname);
	});

	test("a focus request from before the list focuses the requested tab", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<>
				<button type="button" onClick={() => tab("B").focus()}>
					Focus B
				</button>
				<Tabs.Root defaultValue="a" onValueChange={onValueChange}>
					<Tabs.List aria-label="Requested">
						<Tabs.Trigger value="a">A</Tabs.Trigger>
						<Tabs.Trigger value="b">B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Focus B" }));

		expect(tab("B")).toHaveFocus();
		expect(onValueChange.mock.calls).toEqual([["b"]]);
	});

	test("a selection made while focus stays on a tab keeps that tab the Tab stop", async () => {
		const Controlled = ({ value }: { value: string }) => (
			<Tabs.Root value={value} onValueChange={() => {}}>
				<Tabs.List aria-label="Async">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b">B</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="a">Panel A</Tabs.Content>
				<Tabs.Content value="b">Panel B</Tabs.Content>
			</Tabs.Root>
		);
		const { rerender } = render(<Controlled value="a" />);
		await userEvent.click(tab("A"));

		rerender(<Controlled value="b" />);
		await userEvent.keyboard("{Tab}");

		expect(screen.getByRole("tabpanel")).toHaveFocus();
		expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
	});

	test.each([
		{ name: "display: none", style: { display: "none" } },
		{ name: "visibility: hidden", style: { visibility: "hidden" } },
	] as const)("Tab enters past a selected tab that $name hides after mount", async ({ style }) => {
		const Hidden = ({ hide }: { hide: boolean }) => (
			<>
				<button type="button">Before</button>
				<Tabs.Root defaultValue="a">
					<Tabs.List aria-label="Later hidden">
						<Tabs.Trigger value="a" style={hide ? style : undefined}>
							A
						</Tabs.Trigger>
						<Tabs.Trigger value="b">B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</>
		);
		const { rerender } = render(<Hidden hide={false} />);
		rerender(<Hidden hide />);

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(tab("B")).toHaveFocus();
	});

	test("Shift+Tab leaves tabs that mount under a hidden ancestor", async () => {
		const Shown = ({ shown }: { shown: boolean }) => (
			<>
				<button type="button">Before</button>
				<div style={shown ? undefined : { display: "none" }}>
					<Tabs.Root defaultValue="a">
						<Tabs.List aria-label="Shown later">
							<Tabs.Trigger value="a">A</Tabs.Trigger>
							<Tabs.Trigger value="b">B</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</div>
			</>
		);
		const { rerender } = render(<Shown shown={false} />);
		rerender(<Shown shown />);
		tab("A").focus();

		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

		expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
	});

	test("Shift+Tab leaves a list whose inline ref attaches again on each key", async () => {
		const Rerendering = () => {
			const [, setKeys] = useState(0);
			return (
				<>
					<button type="button">Before</button>
					<Tabs.Root defaultValue="a">
						<Tabs.List
							aria-label="Inline ref"
							ref={(node) => void node}
							onKeyDown={() => setKeys((keys) => keys + 1)}
						>
							<Tabs.Trigger value="a">A</Tabs.Trigger>
							<Tabs.Trigger value="b">B</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				</>
			);
		};
		render(<Rerendering />);
		tab("A").focus();

		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

		expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
	});

	test("Tab entry follows a focus handler that sends focus elsewhere", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<>
				<button type="button">Before</button>
				<Tabs.Root defaultValue="a" onValueChange={onValueChange}>
					<Tabs.List aria-label="Redirect">
						<Tabs.Trigger
							value="a"
							onFocus={() => screen.getByRole("button", { name: "Elsewhere" }).focus()}
						>
							A
						</Tabs.Trigger>
						<Tabs.Trigger value="b">B</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
				<button type="button">Elsewhere</button>
			</>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("a click on the list's blank space activates no tab", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Tabs.Root value="" onValueChange={onValueChange}>
				<Tabs.List aria-label="Blank" style={{ paddingLeft: "4rem" }}>
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b">B</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);

		await userEvent.click(screen.getByRole("tablist"), { position: { x: 8, y: 8 } });

		expect(onValueChange).not.toHaveBeenCalled();
		expect(tab("A")).not.toHaveFocus();
	});

	test("Tab passes a list with no enabled tab", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Tabs.Root>
					<Tabs.List aria-label="All disabled">
						<Tabs.Trigger value="a" disabled>
							A
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
				<button type="button">After</button>
			</>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
	});

	test("a list keeps the tabIndex its consumer sets", async () => {
		render(
			<>
				<Tabs.Root defaultValue="a">
					<Tabs.List aria-label="Explicit" tabIndex={-1}>
						<Tabs.Trigger value="a">A</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
				<button type="button">After</button>
			</>,
		);

		expect(screen.getByRole("tablist")).toHaveAttribute("tabindex", "-1");
		tab("A").focus();
		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("tablist")).toHaveAttribute("tabindex", "-1");
	});

	test("when the selected tab is disabled, Tab reaches the first enabled tab", async () => {
		render(<FourTabs defaultValue="c" activationMode="manual" />);

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.keyboard("{Tab}");

		expect(tab("A")).toHaveFocus();
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
	});

	test("a click selects a tab whose focus handler prevents focus activation", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Tabs.Root value="a" onValueChange={onValueChange}>
				<Tabs.List aria-label="Prevented">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b" onFocus={(event) => event.preventDefault()}>
						B
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);

		await userEvent.click(tab("B"));

		expect(onValueChange.mock.calls).toEqual([["b"]]);
	});

	test("a tab that stops key propagation still moves with the arrows", async () => {
		render(
			<Tabs.Root defaultValue="a">
				<Tabs.List aria-label="Stopped">
					<Tabs.Trigger value="a" onKeyDown={(event) => event.stopPropagation()}>
						A
					</Tabs.Trigger>
					<Tabs.Trigger value="b">B</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);
		tab("A").focus();

		await userEvent.keyboard("{ArrowRight}");

		expect(tab("B")).toHaveFocus();
	});

	test("the arrows skip a tab that cannot take focus", async () => {
		render(
			<Tabs.Root defaultValue="a">
				<Tabs.List aria-label="Hidden tab">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b" style={{ display: "none" }}>
						B
					</Tabs.Trigger>
					<Tabs.Trigger value="c">C</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);
		tab("A").focus();

		await userEvent.keyboard("{ArrowRight}");

		expect(tab("C")).toHaveFocus();
	});

	test("Space on a link tab activates it without scrolling the page", async () => {
		render(
			<Tabs.Root defaultValue="a" activationMode="manual">
				<Tabs.List aria-label="Links">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b" asChild>
						<a href="#b">B</a>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);
		tab("B").focus();
		// Why the default: Space on a link scrolls the page unless a handler cancels it.
		let scrolls = true;
		const record = (event: KeyboardEvent) => {
			scrolls = !event.defaultPrevented;
		};
		window.addEventListener("keydown", record);

		await userEvent.keyboard(" ");

		window.removeEventListener("keydown", record);
		expect(tab("B")).toHaveAttribute("aria-selected", "true");
		expect(scrolls).toBe(false);
	});

	test("Space in a field inside an asChild tab does not activate the tab", async () => {
		render(
			<Tabs.Root defaultValue="a" activationMode="manual">
				<Tabs.List aria-label="Field tab">
					<Tabs.Trigger value="a">A</Tabs.Trigger>
					<Tabs.Trigger value="b" asChild>
						<div>
							B <input aria-label="Filter" />
						</div>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>,
		);
		screen.getByRole("textbox", { name: "Filter" }).focus();

		await userEvent.keyboard(" ");

		expect(tab("A")).toHaveAttribute("aria-selected", "true");
	});

	const UntilFound = ({
		value,
		onValueChange,
		inner = false,
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		inner?: boolean;
	}) => (
		<Tabs.Root
			defaultValue={value == null ? "a" : undefined}
			value={value}
			onValueChange={onValueChange}
		>
			<Tabs.List aria-label="Docs">
				<Tabs.Trigger value="a">A</Tabs.Trigger>
				<Tabs.Trigger value="b">B</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a" hiddenUntilFound>
				Panel A
			</Tabs.Content>
			<Tabs.Content value="b" hiddenUntilFound>
				{inner ? (
					<Tabs.Root defaultValue="x">
						<Tabs.List aria-label="Inner">
							<Tabs.Trigger value="x">X</Tabs.Trigger>
							<Tabs.Trigger value="y">Y</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="x" hiddenUntilFound>
							Panel X
						</Tabs.Content>
						<Tabs.Content value="y" hiddenUntilFound>
							<p id="deep-inner">Panel Y</p>
						</Tabs.Content>
					</Tabs.Root>
				) : (
					<p id="deep-b">Panel B</p>
				)}
			</Tabs.Content>
		</Tabs.Root>
	);

	test("a controlled root that keeps its tab hides a revealed panel again", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<UntilFound value="a" onValueChange={onValueChange} />);
		const panelB = screen.getByText("Panel B").parentElement;

		window.location.hash = "#deep-b";

		await vi.waitFor(() => {
			expect(onValueChange.mock.calls).toEqual([["b"]]);
		});
		expect(tab("A")).toHaveAttribute("aria-selected", "true");
		expect(panelB).toHaveAttribute("hidden", "until-found");
		history.replaceState(null, "", window.location.pathname);
	});

	test("a reveal of a nested panel selects each tab once", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Tabs.Root defaultValue="outer">
				<Tabs.List aria-label="Outer">
					<Tabs.Trigger value="outer">Outer</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="outer">
					<UntilFound inner onValueChange={onValueChange} />
				</Tabs.Content>
			</Tabs.Root>,
		);

		window.location.hash = "#deep-inner";

		await vi.waitFor(() => {
			expect(tab("Y")).toHaveAttribute("aria-selected", "true");
		});
		expect(tab("B")).toHaveAttribute("aria-selected", "true");
		expect(onValueChange.mock.calls).toEqual([["b"]]);
		history.replaceState(null, "", window.location.pathname);
	});

	test("Tab skips the inactive panels that are hidden until found", async () => {
		render(
			<>
				<UntilFound value="b" />
				<button type="button">After</button>
			</>,
		);
		tab("B").focus();

		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("tabpanel", { name: "B" })).toHaveFocus();
		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
	});

	test("a panel revealed before hydration selects its tab once hydrated", async () => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(<UntilFound />);
		document.body.append(container);
		// The browser revealed the panel, as a fragment link does before hydration.
		container.querySelector("#deep-b")?.parentElement?.removeAttribute("hidden");
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});

		const root = await act(async () => hydrateRoot(container, <UntilFound />));

		await vi.waitFor(() => {
			expect(tab("B")).toHaveAttribute("aria-selected", "true");
		});
		expect(container.querySelector('[role="tabpanel"]')).toHaveAttribute("hidden", "until-found");
		// Why the filter: React warns about the uppercase `HIDDEN` name on purpose.
		const unexpected = errors.mock.calls
			.map((args) => args.map(String).join(" "))
			.filter((message) => !message.includes("Invalid DOM property"));
		expect(unexpected).toEqual([]);
		act(() => {
			root.unmount();
		});
		container.remove();
		errors.mockRestore();
	});
});
