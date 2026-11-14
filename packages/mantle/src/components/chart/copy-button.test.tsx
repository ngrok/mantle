import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { ChartContextValue } from "./context.js";
import { ChartContext } from "./context.js";
import { ChartCopyButtonPrimitive } from "./copy-button.js";
import { ChartStore } from "./store.js";

/**
 * The context a Root gives its parts, with one `p50` series and the data props
 * a copy reads. The Root writes `dataRef`, so a hand-built one pins what the
 * button reads from it.
 */
const contextWith = (current: ChartContextValue["dataRef"]["current"]): ChartContextValue => {
	const store = new ChartStore();
	store.registerSeries({
		dataKey: "p50",
		label: "p50",
		color: "blue",
		mark: "line",
		curve: "linear",
		markers: false,
		connectNulls: false,
		shape: "circle",
		texture: "solid",
	});
	return {
		kind: "line",
		componentName: "LineChart",
		store,
		engineRef: { current: null },
		dataRef: { current },
	};
};

test("a copy on a time scale writes an epoch x as ISO 8601", async () => {
	const user = userEvent.setup();
	const onCopy = vi.fn<(value: string) => void>();
	const context = contextWith({
		data: [{ time: Date.UTC(2026, 6, 18, 10, 0), p50: 120 }],
		xKey: "time",
		xScale: "time",
		zKey: undefined,
	});
	render(
		<ChartContext.Provider value={context}>
			<ChartCopyButtonPrimitive
				partName="LineChart.CopyButton"
				slotName="line-chart"
				onCopy={onCopy}
			/>
		</ChartContext.Provider>,
	);
	await user.click(screen.getByRole("button", { name: "Copy data as Markdown" }));
	await vi.waitFor(() => {
		expect(onCopy).toHaveBeenCalledExactlyOnceWith(
			["| time | p50 |", "| --- | --- |", "| 2026-07-18T10:00:00.000Z | 120 |"].join("\n"),
		);
	});
});

test("a consumer data-slot joins the part's slot instead of replacing it", () => {
	const context = contextWith({ data: [], xKey: "time", xScale: "time", zKey: undefined });
	render(
		<ChartContext.Provider value={context}>
			<ChartCopyButtonPrimitive
				partName="LineChart.CopyButton"
				slotName="line-chart"
				data-slot="toolbar-action"
			/>
		</ChartContext.Provider>,
	);
	expect(screen.getByRole("button", { name: "Copy data as Markdown" })).toHaveAttribute(
		"data-slot",
		"toolbar-action line-chart-copy-button icon-button",
	);
});
