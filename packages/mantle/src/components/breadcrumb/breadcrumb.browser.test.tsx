"use client";

import { render } from "@testing-library/react";
import { Fragment } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Breadcrumb } from "./breadcrumb.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this component's layout
 * rests on. Browser tests load no stylesheet, so without this every metric
 * below is degenerate and every assertion passes for the wrong reason.
 *
 * Keep each declaration identical to Tailwind's output: the geometry these tests
 * assert is only tied to the component while the class names here match the ones
 * it renders. `scroll-fade-x` is left out on purpose — a mask changes what paints,
 * never what measures, and `breadcrumb.test.tsx` pins its spelling.
 */
const STYLE = `
@layer utilities {
	.flex { display: flex; }
	.inline-flex { display: inline-flex; }
	.flex-wrap { flex-wrap: wrap; }
	.items-center { align-items: center; }
	.gap-1\\.5 { gap: 0.375rem; }
	.min-w-0 { min-width: 0; }
	.shrink-0 { flex-shrink: 0; }
	.overflow-x-auto { overflow-x: auto; }
	.overflow-x-visible { overflow-x: visible; }
	.overscroll-x-none { overscroll-behavior-x: none; }
	.-m-1 { margin: calc(0.25rem * -1); }
	.p-1 { padding: 0.25rem; }
	.scroll-px-10 { scroll-padding-inline: 2.5rem; }
	.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
}

/* The toolbar the trail has to fit into — AppLayout.Header, narrowed. */
.test-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	width: 240px;
	font-family: sans-serif;
}
.test-trigger { flex: none; width: 2rem; height: 2rem; }
`;

/** The fade zone `scroll-fade-x` masks at each inline edge, in pixels. */
const FADE_ZONE = 40;

/** One line of `text-sm` from the stylesheet above, in pixels. */
const LINE_HEIGHT = 20;

/**
 * The widest focus indicator a crumb can paint: mantle's rings are `ring-3` and
 * `ring-4` box shadows, and a bare `Breadcrumb.Link` gets the browser's own
 * outline. Every one of them paints outside the crumb's own box.
 */
const FOCUS_RING = 3;

const LONG_TRAIL = ["Home", "Endpoints", "Cloud Endpoints", "Traffic Policy", "ep_2h8xyz"];

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const Header = ({
	crumbs,
	listClassName,
}: {
	crumbs: ReadonlyArray<string>;
	listClassName?: string;
}) => (
	<div className="test-header">
		<div className="test-trigger" />
		<Breadcrumb.Root>
			<Breadcrumb.List className={listClassName}>
				{crumbs.map((crumb, index) => (
					<Fragment key={crumb}>
						{index > 0 && <Breadcrumb.Separator />}
						<Breadcrumb.Item>
							{index === crumbs.length - 1 ? (
								<Breadcrumb.Page>{crumb}</Breadcrumb.Page>
							) : (
								<Breadcrumb.Link href={`/${crumb}`}>{crumb}</Breadcrumb.Link>
							)}
						</Breadcrumb.Item>
					</Fragment>
				))}
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
);

function queryElement(root: ParentNode, selector: string) {
	const element = root.querySelector<HTMLElement>(selector);
	if (element == null) {
		throw new Error(`nothing matched ${selector}`);
	}

	return element;
}

function queryElements(root: ParentNode, selector: string) {
	return [...root.querySelectorAll<HTMLElement>(selector)];
}

/**
 * Scrolls the trail so one named crumb hangs half off the end edge, and returns
 * that crumb's link. Picking the crumb rather than discovering it keeps the
 * geometry the same on a machine whose sans-serif measures differently.
 */
function hangOffEndEdge(list: HTMLElement, label: string) {
	const crumb = queryElements(list, "[data-slot~=breadcrumb-link]").find(
		(candidate) => candidate.textContent === label,
	);
	if (crumb == null) {
		throw new Error(`no crumb labeled ${label}`);
	}

	list.scrollLeft = 0;
	list.scrollLeft +=
		crumb.getBoundingClientRect().right -
		list.getBoundingClientRect().right -
		crumb.offsetWidth / 2;

	// The precondition every assertion below rests on, asserted rather than assumed.
	const listBox = list.getBoundingClientRect();
	const crumbBox = crumb.getBoundingClientRect();
	expect(crumbBox.right).toBeGreaterThan(listBox.right);
	expect(crumbBox.left).toBeLessThan(listBox.right);

	return crumb;
}

describe("Breadcrumb overflow", () => {
	test("a trail wider than the row scrolls sideways and stays on one line", () => {
		const { container } = render(<Header crumbs={LONG_TRAIL} />);
		const header = queryElement(container, ".test-header");
		const nav = queryElement(container, "[data-slot~=breadcrumb]");
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const items = queryElements(container, "[data-slot~=breadcrumb-item]");

		// The landmark gives up width instead of pushing the toolbar wider.
		expect(nav.clientWidth).toBeLessThan(header.clientWidth);
		expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
		// One row: every crumb sits on the same baseline band as the first.
		expect(new Set(items.map((item) => item.offsetTop)).size).toBe(1);
	});

	test("a crumb keeps its label on a single line rather than squeezing", () => {
		const { container } = render(<Header crumbs={LONG_TRAIL} />);
		const items = queryElements(container, "[data-slot~=breadcrumb-item]");

		// A crumb that gave up width would break its label across two lines, which
		// shows up as a crumb twice as tall as the row's line.
		for (const item of items) {
			expect(item.getBoundingClientRect().height).toBeLessThanOrEqual(LINE_HEIGHT);
		}
	});

	test("a multi-word custom separator keeps its own label on one line", () => {
		const { container } = render(
			<div className="test-header">
				<div className="test-trigger" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item>
							<Breadcrumb.Link href="/endpoints">Cloud Endpoints</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator>then under</Breadcrumb.Separator>
						<Breadcrumb.Item>
							<Breadcrumb.Page>ep_2h8xyz</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>,
		);
		const separator = queryElement(container, "[data-slot~=breadcrumb-separator]");

		expect(separator.getBoundingClientRect().height).toBeLessThanOrEqual(LINE_HEIGHT);
	});

	test("the trail starts at its end, so the current page is in view", () => {
		const { container } = render(<Header crumbs={LONG_TRAIL} />);
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const currentPage = queryElement(container, "[data-slot~=breadcrumb-page]");

		expect(list.scrollLeft).toBe(list.scrollWidth - list.clientWidth);
		expect(list.scrollLeft).toBeGreaterThan(0);
		// Sub-pixel slack: the current page is flush with the scrollport's end.
		expect(currentPage.getBoundingClientRect().right).toBeLessThanOrEqual(
			list.getBoundingClientRect().right + 1,
		);
	});

	test("a longer trail re-pins to its new end", () => {
		const { container, rerender } = render(<Header crumbs={LONG_TRAIL} />);
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const firstEnd = list.scrollWidth - list.clientWidth;

		rerender(<Header crumbs={[...LONG_TRAIL, "Configuration History"]} />);

		const secondEnd = list.scrollWidth - list.clientWidth;
		expect(secondEnd).toBeGreaterThan(firstEnd);
		expect(list.scrollLeft).toBe(secondEnd);
	});

	test("a crumb the reader tabs to lands clear of the fade zone", () => {
		const { container } = render(<Header crumbs={LONG_TRAIL} />);
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const crumb = hangOffEndEdge(list, "Traffic Policy");

		// Focus is the browser's own scroll trigger, and scroll padding is what tells
		// it how far in to land: without the padding it leaves this crumb hanging.
		crumb.focus();

		expect(
			Math.round(list.getBoundingClientRect().right - crumb.getBoundingClientRect().right),
		).toBeGreaterThanOrEqual(FADE_ZONE);
	});

	test("a narrower row re-pins the trail so the current page stays in view", async () => {
		const { container } = render(<Header crumbs={LONG_TRAIL} />);
		const header = queryElement(container, ".test-header");
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const currentPage = queryElement(container, "[data-slot~=breadcrumb-page]");
		expect(list.scrollLeft).toBe(list.scrollWidth - list.clientWidth);

		// A window drag or a sidebar collapse resizes the row with no re-render, and
		// a narrower row puts the end further away than where the reader was left.
		header.style.width = "150px";

		await expect.poll(() => list.scrollLeft).toBe(list.scrollWidth - list.clientWidth);
		expect(currentPage.getBoundingClientRect().right).toBeLessThanOrEqual(
			list.getBoundingClientRect().right + 1,
		);
	});

	test("the row reserves room inside the scrollport for a crumb's focus ring", () => {
		const { container } = render(<Header crumbs={LONG_TRAIL} />);
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const page = queryElement(container, "[data-slot~=breadcrumb-page]");
		const listBox = list.getBoundingClientRect();
		const pageBox = page.getBoundingClientRect();

		// Everything outside the list's border box is clipped twice over — by the
		// scrollport and by the mask, whose clip box is that border box — so the
		// room has to be inside it, on all three edges a crumb can reach.
		expect(pageBox.top - listBox.top).toBeGreaterThanOrEqual(FOCUS_RING);
		expect(listBox.bottom - pageBox.bottom).toBeGreaterThanOrEqual(FOCUS_RING);
		expect(listBox.right - pageBox.right).toBeGreaterThanOrEqual(FOCUS_RING);
	});

	test("a consumer can trade the scrollport back for wrapping", () => {
		const { container } = render(
			<Header crumbs={LONG_TRAIL} listClassName="flex-wrap overflow-x-visible" />,
		);
		const list = queryElement(container, "[data-slot~=breadcrumb-list]");
		const items = queryElements(container, "[data-slot~=breadcrumb-item]");

		expect(list.scrollWidth).toBe(list.clientWidth);
		expect(new Set(items.map((item) => item.offsetTop)).size).toBeGreaterThan(1);
	});
});
