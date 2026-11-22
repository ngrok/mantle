import { render, screen } from "@testing-library/react";
import axe from "axe-core";
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
});
