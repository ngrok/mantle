/**
 * The scenario the chart benchmark page renders, read from its query string.
 * The Playwright driver in `bench/` builds the same URLs.
 */

/** `mantle` keeps the mount animation; `mantle-static` sets `animate={false}`. */
export type Lib = "mantle" | "mantle-static";
export type Kind = "line" | "bar" | "area" | "scatter";
/** `list` is n cards, `dense` is one chart with many rows, `table` is n rows × 2 sparklines. */
export type Mode = "list" | "dense" | "table";
/** `cv` wraps each list card in `content-visibility: auto`. */
export type Gate = "none" | "cv";

export type Config = {
	lib: Lib;
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

export const LIBS: readonly Lib[] = ["mantle", "mantle-static"];
export const KINDS: readonly Kind[] = ["line", "bar", "area", "scatter"];

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
 * readConfig("?lib=mantle-static&kind=bar&mode=table&n=100&points=12");
 * // { lib: "mantle-static", kind: "bar", mode: "table", n: 100, points: 12, gate: "none", noCharts: false }
 * ```
 */
export const readConfig = (search: string): Config => {
	const params = new URLSearchParams(search);
	const modeParam = params.get("mode");
	const mode: Mode = modeParam === "dense" ? "dense" : modeParam === "table" ? "table" : "list";
	return {
		lib: pick(params.get("lib"), LIBS, "mantle"),
		kind: pick(params.get("kind"), KINDS, "line"),
		mode,
		n: mode === "dense" ? 1 : Number(params.get("n") ?? 50),
		points: Number(
			params.get("points") ?? (mode === "dense" ? 10_000 : mode === "table" ? 12 : 30),
		),
		gate: params.get("gate") === "cv" ? "cv" : "none",
		noCharts: params.get("nocharts") === "1",
	};
};
