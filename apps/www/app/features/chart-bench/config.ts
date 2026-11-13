/**
 * The scenario the chart benchmark page renders, read from its query string.
 * The Playwright driver in `bench/` builds the same URLs.
 */

export type Kind = "line" | "bar" | "area" | "scatter";
/**
 * - `list`: n cards
 * - `dense`: one chart with many rows
 * - `table`: n rows × 2 sparklines
 * - `agents`: n agent cards, each with a stacked In/Out bar chart and a tooltip, like the dashboard's Agents page
 * - `agents-dom`: the same cards with hand-rolled bars and one Radix tooltip per bar, as the dashboard prototype draws them
 */
export type Mode = "list" | "dense" | "table" | "agents" | "agents-dom";
/** `cv` wraps each list card in `content-visibility: auto`. */
export type Gate = "none" | "cv";
/** `list` wraps the list cards in the family's `List` part, so the charts share one live region. */
export type Group = "none" | "list";

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
	group: Group;
	/** Render the table rows with an empty box where each sparkline would be: the table's own floor. */
	noCharts: boolean;
};

export const KINDS: readonly Kind[] = ["line", "bar", "area", "scatter"];
export const MODES: readonly Mode[] = ["list", "dense", "table", "agents", "agents-dom"];
export const GATES: readonly Gate[] = ["none", "cv"];
export const GROUPS: readonly Group[] = ["none", "list"];

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
 * // { animate: false, kind: "bar", mode: "table", n: 100, points: 30, gate: "none", group: "none", noCharts: false }
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
		group: pick(params.get("group"), GROUPS, "none"),
		noCharts: params.get("nocharts") === "1",
	};
};

/**
 * Write a scenario as the query string `readConfig` reads back. Every field
 * is explicit, so a URL names its whole scenario.
 *
 * @example
 * ```ts
 * writeConfig({ animate: false, kind: "bar", mode: "table", n: 100, points: 30, gate: "none", group: "none", noCharts: false });
 * // "?animate=0&kind=bar&mode=table&n=100&points=30&gate=none&group=none&nocharts=0"
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
		group: config.group,
		nocharts: config.noCharts ? "1" : "0",
	});
	return `?${params.toString()}`;
};
