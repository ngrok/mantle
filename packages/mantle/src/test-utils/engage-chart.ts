import { act, screen } from "@testing-library/react";

/**
 * Focus a chart's interaction overlay, the way a reader who tabs to it does.
 * Focus inside a chart Root mounts its sr-only data table, so a test that
 * reads the table calls this first. `name` picks one chart when several
 * render.
 *
 * @example
 * ```ts
 * render(<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">…</BarChart.Root>);
 * engageChart();
 * expect(screen.getByRole("table")).toBeInTheDocument();
 * ```
 */
const engageChart = (name?: string): void => {
	act(() => {
		screen.getByRole("application", name == null ? undefined : { name }).focus();
	});
};

export {
	//,
	engageChart,
};
