"use client";

import { act, render } from "@testing-library/react";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { createIntersectionObserverStub } from "../../test-utils/mock-intersection-observer.js";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser test of which chart in a List holds the shared tooltip. A
 * pointer hover needs real layout, so happy-dom cannot run this.
 */
const STYLE = `
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
[data-slot$="-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
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

const Pair = ({ ingress }: { ingress: typeof data }) => (
	<BarChart.List>
		{[
			{ name: "Ingress", rows: ingress },
			{ name: "Egress", rows: data },
		].map(({ name, rows }) => (
			<div key={name} style={{ width: 600, height: 300 }}>
				<BarChart.Root data={rows} xKey="cat" animate={false} aria-label={name}>
					<BarChart.Bar dataKey="v" label="Value" />
				</BarChart.Root>
			</div>
		))}
	</BarChart.List>
);

/** Wait for the shared animation frame that commits a data change. */
const nextFrame = () =>
	new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});

test("a data update does not take the tooltip from the chart under the pointer", async () => {
	const stub = createIntersectionObserverStub({ intersecting: false });
	vi.stubGlobal("IntersectionObserver", stub.Observer);
	const { container, rerender } = render(<Pair ingress={data} />);
	const plots = [...container.querySelectorAll('[data-slot="bar-chart-plot"]')];
	act(() => {
		stub.enter(...plots);
	});
	const [ingress, egress] = plots.map((plot) => plot.querySelector('[role="application"]'));
	if (!(ingress instanceof HTMLElement) || !(egress instanceof HTMLElement)) {
		throw new Error("expected two interaction overlays");
	}
	// Ingress keeps its keyboard hover while focus stays on it.
	act(() => {
		ingress.focus();
		ingress.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
	});
	const rect = egress.getBoundingClientRect();
	act(() => {
		egress.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: rect.left + rect.width / 2,
				clientY: rect.top + rect.height / 2,
			}),
		);
	});
	const surfaces = () => container.querySelectorAll('[data-slot="bar-chart-tooltip"]');
	expect(egress.parentElement?.contains(surfaces()[0] ?? null)).toBe(true);
	rerender(<Pair ingress={data.map((row) => ({ ...row, v: row.v + 1 }))} />);
	await act(nextFrame);
	expect(surfaces()).toHaveLength(1);
	expect(egress.parentElement?.contains(surfaces()[0] ?? null)).toBe(true);
});
