import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Strata } from "./strata.js";

/**
 * Real-browser computed style for `Strata.Section`'s column split and
 * `Strata.Root`'s hairline. happy-dom substitutes no custom properties and lays
 * nothing out, so `grid-template-columns` reads back as the author string and
 * every border width reads back empty — the assertions below would pass whatever
 * the two parts emit.
 *
 * The stylesheet is Tailwind 4.3.3's own output for the utilities these parts
 * emit, keyed by the same escaped class selectors. Keyed that way on purpose:
 * misspell `--strata-columns` in `Section`, put a bare `1fr` back in its
 * fallback, or move `divide-y` off `Root`, and the rule stops matching and
 * these assertions fail.
 *
 * The `md:` rule is copied **without** its `@media (width >= 48rem)` wrapper.
 * The subject is the custom property's name and fallback, not the breakpoint, and
 * the runner's iframe is narrower than 48rem — keeping the wrapper would make
 * every assertion here pass for the wrong reason.
 */
const STYLE = `
:root {
	--spacing: 0.25rem;
}
@property --tw-border-style {
	syntax: "*";
	inherits: false;
	initial-value: solid;
}
@property --tw-divide-y-reverse {
	syntax: "*";
	inherits: false;
	initial-value: 0;
}
.grid { display: grid; }
.py-8 { padding-block: calc(var(--spacing) * 8); }
.first\\:pt-0:first-child { padding-top: 0px; }
.md\\:grid-cols-\\(--strata-columns\\,minmax\\(0\\,1fr\\)_minmax\\(0\\,2fr\\)\\) { grid-template-columns: var(--strata-columns,minmax(0,1fr) minmax(0,2fr)); }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.block { display: block; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.divide-y > :not(:last-child)) {
	border-bottom-style: var(--tw-border-style);
	border-bottom-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));
}
/* Not a Tailwind class: the contract is that any rule setting the variable on an
   ancestor reaches the section, so a plain selector states it without pinning a
   second arbitrary-property spelling. */
.halves { --strata-columns: 1fr 1fr; }
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** The section's resolved column widths, in CSS pixels. */
function columnWidths(section: HTMLElement): number[] {
	return getComputedStyle(section)
		.gridTemplateColumns.split(" ")
		.map((width) => Number.parseFloat(width));
}

/** The body column's width as a multiple of the header column's. */
function columnRatio(section: HTMLElement): number {
	const [headerColumn = 0, bodyColumn = 0] = columnWidths(section);
	return bodyColumn / headerColumn;
}

/**
 * A page sized in code rather than by the runner's viewport, so the column
 * widths do not move with the browser window.
 */
function TwoSectionPage({ className }: { className?: string }) {
	return (
		<Strata.Root className={className} style={{ width: 900 }}>
			<Strata.Section data-testid="providers">
				<Strata.Header>
					<Strata.Title>Providers</Strata.Title>
				</Strata.Header>
				<Strata.Body>providers</Strata.Body>
			</Strata.Section>
			<Strata.Section data-testid="rules">
				<Strata.Header>
					<Strata.Title>Routing rules</Strata.Title>
				</Strata.Header>
				<Strata.Body>rules</Strata.Body>
			</Strata.Section>
		</Strata.Root>
	);
}

describe("Strata.Section column split", () => {
	test("splits the header and body one to two by default", () => {
		render(<TwoSectionPage />);

		expect(columnWidths(screen.getByTestId("providers"))).toHaveLength(2);
		expect(columnRatio(screen.getByTestId("providers"))).toBeCloseTo(2, 2);
	});

	test("--strata-columns on Root re-splits every section", () => {
		render(<TwoSectionPage className="halves" />);

		expect(columnRatio(screen.getByTestId("providers"))).toBeCloseTo(1, 2);
		expect(columnRatio(screen.getByTestId("rules"))).toBeCloseTo(1, 2);
	});

	test("--strata-columns on one Section leaves its siblings alone", () => {
		render(
			<Strata.Root style={{ width: 900 }}>
				<Strata.Section className="halves" data-testid="providers">
					<Strata.Header>
						<Strata.Title>Providers</Strata.Title>
					</Strata.Header>
					<Strata.Body>providers</Strata.Body>
				</Strata.Section>
				<Strata.Section data-testid="rules">
					<Strata.Header>
						<Strata.Title>Routing rules</Strata.Title>
					</Strata.Header>
					<Strata.Body>rules</Strata.Body>
				</Strata.Section>
			</Strata.Root>,
		);

		expect(columnRatio(screen.getByTestId("providers"))).toBeCloseTo(1, 2);
		expect(columnRatio(screen.getByTestId("rules"))).toBeCloseTo(2, 2);
	});
});

describe("Strata.Section tracks", () => {
	test("a truncating value in Body clips inside the section instead of widening it", () => {
		render(
			<Strata.Root style={{ width: 600 }}>
				<Strata.Section data-testid="section">
					<Strata.Header>
						<Strata.Title>Gateway URL</Strata.Title>
					</Strata.Header>
					<Strata.Body>
						<span data-testid="text" className="block truncate">
							https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22very-long-value%22%7D&limit=200&offset=0
						</span>
					</Strata.Body>
				</Strata.Section>
			</Strata.Root>,
		);
		const section = screen.getByTestId("section");
		const text = screen.getByTestId("text");
		// The section has nothing to scroll: the body track shrank to the room left beside the header.
		expect(section.scrollWidth).toBe(section.clientWidth);
		// The span clips its own text, which is what paints the ellipsis.
		expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
	});
});

describe("Strata.Root rhythm", () => {
	test("rules a hairline between sections, and none below the last", () => {
		render(<TwoSectionPage />);

		expect(getComputedStyle(screen.getByTestId("providers")).borderBottomWidth).toBe("1px");
		expect(getComputedStyle(screen.getByTestId("rules")).borderBottomWidth).toBe("0px");
	});

	test("the first section drops its top padding, and later ones keep it", () => {
		render(<TwoSectionPage />);

		expect(getComputedStyle(screen.getByTestId("providers")).paddingTop).toBe("0px");
		expect(getComputedStyle(screen.getByTestId("rules")).paddingTop).toBe("32px");
	});
});
