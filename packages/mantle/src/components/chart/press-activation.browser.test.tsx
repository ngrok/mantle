"use client";

import { act, render } from "@testing-library/react";
import { createIntersectionObserverStub } from "../../test-utils/mock-intersection-observer.js";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser test of a press that lands before a chart's activation slice
 * runs. The engine must exist and hold a size when pointer-down arrives, or
 * pointer-up finds no press and the first click is lost. The hit test needs
 * real layout, so happy-dom cannot run this.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #d4d4d4;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
/* Browser tests load no Tailwind build; mirror the chart's structural layout so
   the overlay has a size for the hit test. */
[data-slot="bar-chart"] {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot$="-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot$="-plot"] > canvas,
[data-slot$="-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
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

const data = [
	{ cat: "A", v: 40 },
	{ cat: "B", v: 90 },
	{ cat: "C", v: 65 },
];

test("a press on a chart whose activation is still queued activates its datum", () => {
	// A stub delivers every chart in one task, once per band observer, and a
	// stepped clock makes each flush overspend its slice on one chart. Three
	// bands flush three charts; the fourth is still queued when the press lands.
	const stub = createIntersectionObserverStub({ intersecting: false });
	vi.stubGlobal("IntersectionObserver", stub.Observer);
	let clock = 0;
	vi.spyOn(performance, "now").mockImplementation(() => (clock += 5));
	const onDatumActivate = vi.fn<(event: object) => void>();
	const names = ["First", "Second", "Third", "Fourth"];
	const { container } = render(
		<>
			{names.map((name) => (
				<div key={name} style={{ width: 600, height: 300 }}>
					<BarChart.Root
						data={data}
						xKey="cat"
						animate={false}
						aria-label={name}
						onDatumActivate={name === "Fourth" ? onDatumActivate : undefined}
					>
						<BarChart.Bar dataKey="v" label="Value" />
					</BarChart.Root>
				</div>
			))}
		</>,
	);
	const plots = [...container.querySelectorAll('[data-slot="bar-chart-plot"]')];
	const fourth = plots[3];
	if (plots.length !== 4 || fourth == null) {
		throw new Error("expected four plots");
	}
	act(() => {
		stub.enter(...plots);
	});
	expect(plots[2]?.querySelector("canvas")).toBeInTheDocument();
	expect(fourth.querySelector("canvas")).toBeNull();
	const overlay = fourth.querySelector('[role="application"]');
	if (!(overlay instanceof HTMLElement)) {
		throw new Error("expected the interaction overlay to render");
	}
	// The plot's center is the middle category.
	const rect = overlay.getBoundingClientRect();
	const clientX = rect.left + rect.width / 2;
	const clientY = rect.top + rect.height / 2;
	for (const type of ["pointerdown", "pointerup"]) {
		overlay.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, clientY }));
	}
	expect(onDatumActivate).toHaveBeenCalledTimes(1);
	expect(onDatumActivate).toHaveBeenLastCalledWith(
		expect.objectContaining({ index: 1, xValue: "B", datum: data[1] }),
	);
});
