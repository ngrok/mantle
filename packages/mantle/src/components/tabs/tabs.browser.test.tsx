import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { Tabs } from "./tabs.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities these tests read: the
 * slot-scoped icon rule the trigger carries, the root's `--tabs-gap` flex
 * layout that `Tabs.Separator` cancels with a parent-scoped negative margin,
 * and the horizontal list's scroll-container box. Preflight's `box-sizing`
 * rule is load-bearing for that box: on a content-box list, `w-full` plus
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
	.h-full { height: 100%; }
	.h-auto { height: auto; }
	.self-stretch { align-self: stretch; }
	.overflow-x-auto { overflow-x: auto; }
	.px-1 { padding-inline: calc(var(--spacing) * 1); }
	.-mx-1 { margin-inline: calc(var(--spacing) * -1); }
	[data-slot~=tabs] > .\\[\\[data-slot\\~\\=tabs\\]\\>\\&\\]\\:-mt-\\(--tabs-gap\\) { margin-top: calc(var(--tabs-gap) * -1); }
	[data-slot~=tabs] > .\\[\\[data-slot\\~\\=tabs\\]\\>\\&\\]\\:-ml-\\(--tabs-gap\\) { margin-left: calc(var(--tabs-gap) * -1); }
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
	const separator = container.querySelector<HTMLElement>('[data-slot="tabs-separator"]');
	if (separator == null) {
		throw new Error('No element carries data-slot="tabs-separator".');
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
