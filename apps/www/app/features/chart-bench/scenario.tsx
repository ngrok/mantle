import { Badge } from "@ngrok/mantle/badge";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { useEffect, useMemo, useState } from "react";
import type { Config } from "./config";
import type { PointRow, Row } from "./data";
import { categoryRows, pointRows, sampleRows, sparseRows, timeRows } from "./data";
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
	if (config.kind === "bar") {
		return categoryRows(config.points, seed);
	}
	if (config.mode === "dense") {
		return sampleRows(config.points, seed);
	}
	return timeRows(config.points, seed);
};

/** The table row's second series: sparse bars, or a second walk for the other kinds. */
const releasesFor = (config: Config, seed: number): readonly Row[] => {
	if (config.kind === "bar") {
		return sparseRows(config.points, seed);
	}
	return timeRows(config.points, seed);
};

const EMPTY_ROWS: readonly Row[] = [];
const EMPTY_POINTS: readonly PointRow[] = [];

/** One chart card, or one table row with its two sparkline series. */
type Item = {
	index: number;
	rows: readonly Row[];
	/** The table row's second series; empty outside table mode. */
	releases: readonly Row[];
	points: readonly PointRow[];
	/** The scatter table row's second cloud; empty otherwise. */
	releasePoints: readonly PointRow[];
};

const buildItems = (config: Config, seedOffset: number): Item[] =>
	Array.from({ length: config.n }, (_, index) => {
		const seed = index + 1 + seedOffset;
		const scatter = config.kind === "scatter";
		const table = config.mode === "table";
		return {
			index,
			rows: scatter ? EMPTY_ROWS : rowsFor(config, seed),
			releases: table && !scatter ? releasesFor(config, seed + 100_000) : EMPTY_ROWS,
			points: scatter ? pointRows(config.points, seed) : EMPTY_POINTS,
			releasePoints: table && scatter ? pointRows(config.points, seed + 100_000) : EMPTY_POINTS,
		};
	});

/** The x one step past `x`: a minute later, the next integer, or the category with a `+` suffix. */
const nextX = (x: Row["x"]): Row["x"] => {
	if (x instanceof Date) {
		return new Date(x.getTime() + 60_000);
	}
	if (typeof x === "number") {
		return x + 1;
	}
	return `${x}+`;
};

/** Drops the oldest row and appends one: the streaming window slide. An empty series keeps its identity. */
const slide = (rows: readonly Row[]): readonly Row[] => {
	const last = rows[rows.length - 1];
	if (last == null) {
		return rows;
	}
	return [...rows.slice(1), { x: nextX(last.x), a: last.a * 1.05, b: last.b * 0.95 }];
};

/** The point-cloud slide: drops the oldest point and appends one. An empty cloud keeps its identity. */
const slidePoints = (points: readonly PointRow[]): readonly PointRow[] => {
	const last = points[points.length - 1];
	if (last == null) {
		return points;
	}
	return [...points.slice(1), { x: last.x + 1, y: last.y + 3 }];
};

const shiftItem = (item: Item, config: Config): Item => {
	if (config.kind === "scatter") {
		return {
			...item,
			points: slidePoints(item.points),
			releasePoints: slidePoints(item.releasePoints),
		};
	}
	return { ...item, rows: slide(item.rows), releases: slide(item.releases) };
};

/** Every chart family's Root slot, for the paint gate below. */
const CHART_ROOTS =
	'[data-slot="line-chart"], [data-slot="bar-chart"], [data-slot="area-chart"], [data-slot="scatter-plot"]';

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
				const roots = [...document.querySelectorAll(CHART_ROOTS)];
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

// The table is static, so it registers no client-side features.
const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Item>();

/** The sum of a series, the number beside its sparkline: the `a` values, or a cloud's `y` values. */
const total = (rows: readonly Row[], points: readonly PointRow[]): number =>
	Math.round(
		rows.reduce((sum, row) => sum + row.a, 0) + points.reduce((sum, point) => sum + point.y, 0),
	);

/** A sparkline and its total, or the empty box of the `nocharts` floor. */
const SparklineCell = ({
	rows,
	points,
	label,
	config,
}: {
	rows: readonly Row[];
	points: readonly PointRow[];
	label: string;
	config: Config;
}) => (
	<DataTable.Cell>
		<div className="flex items-center gap-2">
			{config.noCharts ? (
				<div className="h-6 w-28" />
			) : (
				<MantleSparkline
					kind={config.kind}
					rows={rows}
					points={points}
					animate={config.animate}
					label={label}
				/>
			)}
			<span className="text-muted min-w-10 text-right text-xs tabular-nums">
				{total(rows, points)}
			</span>
		</div>
	</DataTable.Cell>
);

/** The app list's columns: a name, two badges, two sparklines, and a date, like the dashboard's. */
const tableColumns = (config: Config) =>
	columnHelper.columns([
		columnHelper.accessor("index", {
			id: "name",
			header: () => <DataTable.Header>Name</DataTable.Header>,
			cell: (props) => (
				<DataTable.Cell className="text-strong truncate font-mono text-xs" translate="no">
					{`app-${props.getValue() + 1}`}
				</DataTable.Cell>
			),
		}),
		columnHelper.display({
			id: "kind",
			header: () => <DataTable.Header className="w-28">Kind</DataTable.Header>,
			cell: () => (
				<DataTable.Cell>
					<Badge appearance="muted" color="neutral">
						GitHub
					</Badge>
				</DataTable.Cell>
			),
		}),
		columnHelper.display({
			id: "status",
			header: () => <DataTable.Header className="w-28">Status</DataTable.Header>,
			cell: () => (
				<DataTable.Cell>
					<Badge appearance="muted" color="success">
						Enabled
					</Badge>
				</DataTable.Cell>
			),
		}),
		columnHelper.display({
			id: "requests",
			header: () => <DataTable.Header className="w-44">Requests</DataTable.Header>,
			cell: (props) => (
				<SparklineCell
					rows={props.row.original.rows}
					points={props.row.original.points}
					label={`Requests for app ${props.row.original.index + 1}`}
					config={config}
				/>
			),
		}),
		columnHelper.display({
			id: "releases",
			header: () => <DataTable.Header className="w-44">Releases</DataTable.Header>,
			cell: (props) => (
				<SparklineCell
					rows={props.row.original.releases}
					points={props.row.original.releasePoints}
					label={`Releases for app ${props.row.original.index + 1}`}
					config={config}
				/>
			),
		}),
		columnHelper.accessor("index", {
			id: "created",
			header: () => <DataTable.Header className="w-24">Created</DataTable.Header>,
			cell: (props) => <DataTable.Cell>{`${props.getValue() + 1}w ago`}</DataTable.Cell>,
		}),
	]);

/** The sparkline table: `n` app rows with two dense sparklines each, in a `DataTable`. */
const SparklineTable = ({ config, items }: { config: Config; items: Item[] }) => {
	const columns = useMemo(() => tableColumns(config), [config]);
	const table = useTable({ features, data: items, columns });
	return (
		<main className="mx-auto w-[1100px] p-6">
			<h1 className="mb-4 text-lg font-semibold">
				{config.kind} sparkline table / n={config.n} rows × 2 charts / points={config.points} /
				animation {config.animate ? "on" : "off"}
				{config.noCharts && " / no charts"}
			</h1>
			<DataTable.Root table={table} className="[&_table]:table-fixed">
				<DataTable.Head />
				<DataTable.Body>
					{table.getRowModel().rows.map((row) => (
						<DataTable.Row key={row.id} row={row} data-bench-chart />
					))}
				</DataTable.Body>
			</DataTable.Root>
			<Ready />
		</main>
	);
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
		return <SparklineTable config={config} items={items} />;
	}
	return (
		<main className="mx-auto flex w-[640px] flex-col gap-6 p-6">
			<h1 className="text-lg font-semibold">
				{config.kind} / {config.mode} / n={config.n} / points={config.points} / animation{" "}
				{config.animate ? "on" : "off"}
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
