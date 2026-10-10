/**
 * The scenario the chart benchmark page renders, read from its query string.
 * The Playwright driver in `bench/` builds the same URLs.
 */

export type Kind = "line" | "bar" | "area" | "scatter";
/** `list` is n cards, `dense` is one chart with many rows, `table` is n rows × 2 sparklines. */
export type Mode = "list" | "dense" | "table";
/** `cv` wraps each list card in `content-visibility: auto`. */
export type Gate = "none" | "cv";

export type Config = {
	/** Whether the charts play their mount animation. `animate=0` in the query turns it off. */
	animate: boolean;
	kind: Kind;
	mode: Mode;
	/** Charts on the page. Always 1 in dense mode. */
	n: number;
	/** Rows per chart. */
	points: number;
	gate: Gate;
	/** Render the table rows with an empty box where each sparkline would be: the table's own floor. */
	noCharts: boolean;
};

export const KINDS: readonly Kind[] = ["line", "bar", "area", "scatter"];
export const MODES: readonly Mode[] = ["list", "dense", "table"];
export const GATES: readonly Gate[] = ["none", "cv"];

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T => {
	for (const candidate of allowed) {
		if (candidate === value) {
			return candidate;
		}
	}
	return fallback;
};

/**
 * Read a scenario from a query string.
 *
 * @example
 * ```ts
 * readConfig("?animate=0&kind=bar&mode=table&n=100&points=30");
 * // { animate: false, kind: "bar", mode: "table", n: 100, points: 30, gate: "none", noCharts: false }
 * ```
 */
export const readConfig = (search: string): Config => {
	const params = new URLSearchParams(search);
	const mode = pick(params.get("mode"), MODES, "list");
	return {
		animate: params.get("animate") !== "0",
		kind: pick(params.get("kind"), KINDS, "line"),
		mode,
		n: mode === "dense" ? 1 : Number(params.get("n") ?? 50),
		points: Number(params.get("points") ?? (mode === "dense" ? 10_000 : 30)),
		gate: pick(params.get("gate"), GATES, "none"),
		noCharts: params.get("nocharts") === "1",
	};
};

/**
 * Write a scenario as the query string `readConfig` reads back. Every field
 * is explicit, so a URL names its whole scenario.
 *
 * @example
 * ```ts
 * writeConfig({ animate: false, kind: "bar", mode: "table", n: 100, points: 30, gate: "none", noCharts: false });
 * // "?animate=0&kind=bar&mode=table&n=100&points=30&gate=none&nocharts=0"
 * ```
 */
export const writeConfig = (config: Config): string => {
	const params = new URLSearchParams({
		animate: config.animate ? "1" : "0",
		kind: config.kind,
		mode: config.mode,
		n: String(config.n),
		points: String(config.points),
		gate: config.gate,
		nocharts: config.noCharts ? "1" : "0",
	});
	return `?${params.toString()}`;
};
