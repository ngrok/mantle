import { useEffect, useState } from "react";
import type { Config } from "./config";
import type { PointRow, Row } from "./data";
import { categoryRows, pointRows, sampleRows, timeRows } from "./data";
import { MantleChart, MantleSparkline } from "./mantle-charts";
import type { UpdateMode } from "./metrics";
import { startMetrics } from "./metrics";

// Why at module scope: the chart modules above load with this one, so this
// mark is the moment the chart code is on the client and the mount can start.
if (typeof window !== "undefined") {
	startMetrics();
	performance.mark("lib-loaded");
}

const rowsFor = (config: Config, seed: number): readonly Row[] => {
	if (config.kind === "bar" || config.mode === "table") {
		return categoryRows(config.points, seed);
	}
	if (config.mode === "dense") {
		return sampleRows(config.points, seed);
	}
	return timeRows(config.points, seed);
};

const EMPTY_ROWS: readonly Row[] = [];
const EMPTY_POINTS: readonly PointRow[] = [];

type Item = { index: number; rows: readonly Row[]; points: readonly PointRow[] };

const buildItems = (config: Config, seedOffset: number): Item[] =>
	Array.from({ length: config.n }, (_, index) => ({
		index,
		rows: config.kind === "scatter" ? EMPTY_ROWS : rowsFor(config, index + 1 + seedOffset),
		points:
			config.kind === "scatter" ? pointRows(config.points, index + 1 + seedOffset) : EMPTY_POINTS,
	}));

/** Drops the oldest row and appends one: the streaming window slide. */
const shiftItem = (item: Item, config: Config): Item => {
	if (config.kind === "scatter") {
		const last = item.points[item.points.length - 1] ?? { x: 0, y: 0 };
		return { ...item, points: [...item.points.slice(1), { x: last.x + 1, y: last.y + 3 }] };
	}
	const last = item.rows[item.rows.length - 1];
	if (last == null) {
		return item;
	}
	const nextX =
		last.x instanceof Date
			? new Date(last.x.getTime() + 60_000)
			: typeof last.x === "number"
				? last.x + 1
				: `${last.x}+`;
	return {
		...item,
		rows: [...item.rows.slice(1), { x: nextX, a: last.a * 1.05, b: last.b * 0.95 }],
	};
};

/**
 * Marks the commit that mounts every chart. An effect on the last sibling runs
 * after every chart's own effects. Two frames after every visible chart holds
 * a sized canvas, the first paint of every chart has gone out.
 */
const Ready = () => {
	useEffect(() => {
		performance.mark("charts-mounted");
		// Why cached: the visible set is fixed after the first layout, and a
		// per-frame rect read of every root costs more than the charts do.
		let visible: Element[] | null = null;
		const painted = () => {
			if (visible == null) {
				const roots = [...document.querySelectorAll('[data-slot$="-chart"]')];
				if (roots.length === 0) {
					return true;
				}
				visible = roots.filter((root) => {
					const box = root.getBoundingClientRect();
					return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
				});
			}
			if (visible.length === 0) {
				return true;
			}
			return visible.every((root) => (root.querySelector("canvas")?.width ?? 0) > 0);
		};
		let frames = 0;
		const tick = () => {
			if (!painted() && frames < 120) {
				frames += 1;
				requestAnimationFrame(tick);
				return;
			}
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					performance.mark("charts-painted");
					window.__bench.ready = true;
				});
			});
		};
		requestAnimationFrame(tick);
	}, []);
	return null;
};

/**
 * The benchmark page body: `n` chart cards, one dense chart, or a table of
 * sparklines, per `config`. Publishes `window.__bench.update` so the driver
 * can replace or slide every chart's data.
 *
 * @example
 * ```tsx
 * <Scenario config={readConfig("?mode=table&n=100")} />
 * ```
 */
export const Scenario = ({ config }: { config: Config }) => {
	const [items, setItems] = useState(() => buildItems(config, 0));
	useEffect(() => {
		let version = 0;
		window.__bench.update = (mode: UpdateMode) => {
			if (mode === "replace") {
				version += 1;
				setItems(buildItems(config, version * 1000));
			} else {
				setItems((current) => current.map((item) => shiftItem(item, config)));
			}
		};
	}, [config]);
	if (config.mode === "table") {
		const animate = config.lib === "mantle";
		return (
			<main className="mx-auto w-[1100px] p-6">
				<h1 className="text-lg font-semibold">
					{config.lib} / sparkline table / n={config.n} rows × 2 charts / points={config.points}
					{config.noCharts && " / no charts"}
				</h1>
				<table className="w-full text-sm">
					<thead>
						<tr className="text-left text-neutral-500">
							<th className="py-2">Name</th>
							<th>Kind</th>
							<th>Status</th>
							<th>Requests</th>
							<th>Releases</th>
							<th>Created</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => (
							<tr key={item.index} className="border-t border-neutral-200" data-bench-chart>
								<td className="py-2 font-mono text-blue-700">app-{item.index + 1}</td>
								<td>GitHub</td>
								<td>Enabled</td>
								<td>
									<div className="flex items-center gap-2">
										{config.noCharts ? (
											<div className="h-6 w-28" />
										) : (
											<MantleSparkline
												data={item.rows}
												animate={animate}
												label={`Requests for app ${item.index + 1}`}
											/>
										)}
										<span>{Math.round(item.rows.reduce((sum, row) => sum + row.a, 0))}</span>
									</div>
								</td>
								<td>
									<div className="flex items-center gap-2">
										{config.noCharts ? (
											<div className="h-6 w-28" />
										) : (
											<MantleSparkline
												data={item.rows.slice(0, Math.max(3, Math.floor(config.points / 2)))}
												animate={animate}
												label={`Releases for app ${item.index + 1}`}
											/>
										)}
										<span>{item.index + 2}</span>
									</div>
								</td>
								<td>{item.index + 1}w ago</td>
							</tr>
						))}
					</tbody>
				</table>
				<Ready />
			</main>
		);
	}
	return (
		<main className="mx-auto flex w-[640px] flex-col gap-6 p-6">
			<h1 className="text-lg font-semibold">
				{config.lib} / {config.kind} / {config.mode} / n={config.n} / points={config.points}
				{config.gate === "cv" && " / content-visibility"}
			</h1>
			{items.map((item) => (
				<section
					key={item.index}
					className="rounded-lg border border-neutral-300 p-4"
					style={
						config.gate === "cv"
							? { contentVisibility: "auto", containIntrinsicSize: "auto 376px" }
							: undefined
					}
					data-bench-chart
				>
					<h2 className="mb-2 text-sm font-medium">Endpoint {item.index + 1}</h2>
					<MantleChart
						config={config}
						rows={item.rows}
						points={item.points}
						label={`Endpoint ${item.index + 1}`}
					/>
				</section>
			))}
			<Ready />
		</main>
	);
};
