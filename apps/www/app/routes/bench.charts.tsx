import { useLocation } from "react-router";
import { readConfig } from "~/features/chart-bench/config";
import { Controls } from "~/features/chart-bench/controls";
import { Scenario } from "~/features/chart-bench/scenario";

/**
 * The chart mount benchmark page, a chrome-less document the Playwright driver
 * in `bench/` loads: `/bench/charts?animate=0&kind=bar&mode=table&n=100`.
 * It renders on the client only, so the window the driver measures starts at
 * the chart code's load and holds one mount, like an app page that renders a
 * list after its data arrives. Linked from the Bar Chart docs page.
 */
export function meta() {
	return [
		{ title: "Chart mount benchmark — @ngrok/mantle" },
		// A benchmark fixture is not a page to index.
		{ name: "robots", content: "noindex, nofollow" },
	];
}

// Why a hydrating client loader: the server renders the fallback alone, so the
// charts mount in one client commit after hydration and the measurement never
// mixes server markup, hydration, and the mount.
export const clientLoader = () => null;
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return null;
}

export default function ChartBenchPage() {
	const location = useLocation();
	const config = readConfig(location.search);
	return (
		// Why a local font stack: a webfont that loads (or fails) after the first
		// layout re-shapes every text run in a second frame, which the window
		// would count against the charts.
		<div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
			<Controls config={config} />
			{/* Why keyed by the query: a scenario's rows are state built once, so a
			    client-side change of query mounts a fresh scenario. */}
			<Scenario key={location.search} config={config} />
		</div>
	);
}
