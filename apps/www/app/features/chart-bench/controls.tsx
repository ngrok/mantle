import { cx } from "@ngrok/mantle/cx";
import type { ChangeEvent } from "react";
import type { Config, Gate, Mode } from "./config";
import { KINDS, LIBS } from "./config";

const MODES: readonly Mode[] = ["list", "dense", "table"];
const GATES: readonly Gate[] = ["none", "cv"];

const FIELD = "flex flex-col gap-1";
const LABEL = "text-muted text-xs";
const CONTROL = "rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm";

/** Submit the form a control sits in, so a pick loads the page with the new query. */
const submitOnChange = (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
	event.currentTarget.form?.requestSubmit();
};

/**
 * The variant picker above a scenario. A plain GET form: the browser builds
 * the query string from the field names and loads the page again, so every
 * variant mounts the way the driver measures it, marks included.
 *
 * @example
 * ```tsx
 * <Controls config={readConfig(location.search)} />
 * ```
 */
export const Controls = ({ config }: { config: Config }) => (
	<form
		method="get"
		className="mx-auto flex w-[1100px] flex-wrap items-end gap-3 px-6 pt-4"
		aria-label="Benchmark scenario"
	>
		<label className={FIELD}>
			<span className={LABEL}>lib</span>
			<select name="lib" defaultValue={config.lib} onChange={submitOnChange} className={CONTROL}>
				{LIBS.map((lib) => (
					<option key={lib} value={lib}>
						{lib}
					</option>
				))}
			</select>
		</label>
		<label className={FIELD}>
			<span className={LABEL}>kind</span>
			<select name="kind" defaultValue={config.kind} onChange={submitOnChange} className={CONTROL}>
				{KINDS.map((kind) => (
					<option key={kind} value={kind}>
						{kind}
					</option>
				))}
			</select>
		</label>
		<label className={FIELD}>
			<span className={LABEL}>mode</span>
			<select name="mode" defaultValue={config.mode} onChange={submitOnChange} className={CONTROL}>
				{MODES.map((mode) => (
					<option key={mode} value={mode}>
						{mode}
					</option>
				))}
			</select>
		</label>
		<label className={FIELD}>
			<span className={LABEL}>n</span>
			<input
				name="n"
				type="number"
				min={1}
				defaultValue={config.n}
				className={cx(CONTROL, "w-24")}
			/>
		</label>
		<label className={FIELD}>
			<span className={LABEL}>points</span>
			<input
				name="points"
				type="number"
				min={1}
				defaultValue={config.points}
				className={cx(CONTROL, "w-24")}
			/>
		</label>
		<label className={FIELD}>
			<span className={LABEL}>gate</span>
			<select name="gate" defaultValue={config.gate} onChange={submitOnChange} className={CONTROL}>
				{GATES.map((gate) => (
					<option key={gate} value={gate}>
						{gate === "cv" ? "content-visibility" : "none"}
					</option>
				))}
			</select>
		</label>
		<label className="flex items-center gap-2 pb-1 text-sm">
			<input
				name="nocharts"
				type="checkbox"
				value="1"
				defaultChecked={config.noCharts}
				onChange={submitOnChange}
			/>
			<span>no charts</span>
		</label>
		<button type="submit" className={CONTROL}>
			Load
		</button>
	</form>
);
