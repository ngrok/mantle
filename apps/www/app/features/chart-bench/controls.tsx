import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Field } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Label } from "@ngrok/mantle/label";
import { Select } from "@ngrok/mantle/select";
import type { FormEvent } from "react";
import type { Config } from "./config";
import { GATES, KINDS, MODES, readConfig, writeConfig } from "./config";

/** Load the page with a scenario, the way the driver does: a full load, marks included. */
const load = (search: string): void => {
	window.location.assign(`${window.location.pathname}${search}`);
};

/** A picker whose change loads the scenario with that one field replaced. */
const Pick = ({
	config,
	name,
	label,
	options,
}: {
	config: Config;
	name: "animate" | "kind" | "mode" | "gate";
	label: string;
	options: ReadonlyArray<{ value: string; label: string }>;
}) => {
	const current = new URLSearchParams(writeConfig(config)).get(name) ?? "";
	return (
		<Field.Item name={name} className="w-auto">
			<Field.Label>{label}</Field.Label>
			<Field.Control>
				<Select.Root
					name={name}
					defaultValue={current}
					onValueChange={(value) => {
						// Why not the form: the hidden native select takes the new value
						// after this handler, so a submit here would send the old one.
						const params = new URLSearchParams(writeConfig(config));
						params.set(name, value);
						load(`?${params.toString()}`);
					}}
				>
					<Select.Trigger className="w-44">
						<Select.Value />
					</Select.Trigger>
					<Select.Content width="trigger">
						{options.map((option) => (
							<Select.Item key={option.value} value={option.value}>
								{option.label}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</Field.Control>
		</Field.Item>
	);
};

/**
 * The scenario picker above the benchmark. A pick loads the page again with
 * the new query, so every variant mounts the way the driver measures it. The
 * number fields and the checkbox submit the form, which reads them back
 * through `readConfig`.
 *
 * @example
 * ```tsx
 * <Controls config={readConfig(location.search)} />
 * ```
 */
export const Controls = ({ config }: { config: Config }) => {
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// Why the filter: the form holds no file inputs, so every entry is a string.
		const entries = [...new FormData(event.currentTarget).entries()].flatMap(([key, value]) =>
			typeof value === "string" ? [[key, value]] : [],
		);
		load(writeConfig(readConfig(`?${new URLSearchParams(entries).toString()}`)));
	};
	return (
		<form
			onSubmit={submit}
			className="mx-auto flex w-[1100px] flex-wrap items-end gap-3 px-6 pt-4"
			aria-label="Benchmark scenario"
		>
			<Pick
				config={config}
				name="animate"
				label="Mount animation"
				options={[
					{ value: "1", label: "on" },
					{ value: "0", label: "off" },
				]}
			/>
			<Pick
				config={config}
				name="kind"
				label="Kind"
				options={KINDS.map((kind) => ({ value: kind, label: kind }))}
			/>
			<Pick
				config={config}
				name="mode"
				label="Mode"
				options={MODES.map((mode) => ({ value: mode, label: mode }))}
			/>
			<Field.Item name="n" className="w-auto">
				<Field.Label>Charts or rows</Field.Label>
				<Field.Control>
					<Input name="n" type="number" min={1} defaultValue={config.n} className="w-28" />
				</Field.Control>
			</Field.Item>
			<Field.Item name="points" className="w-auto">
				<Field.Label>Rows per chart</Field.Label>
				<Field.Control>
					<Input
						name="points"
						type="number"
						min={1}
						defaultValue={config.points}
						className="w-28"
					/>
				</Field.Control>
			</Field.Item>
			<Pick
				config={config}
				name="gate"
				label="Card gate"
				options={GATES.map((gate) => ({
					value: gate,
					label: gate === "cv" ? "content-visibility" : "none",
				}))}
			/>
			<Label className="flex items-center gap-2 pb-2">
				<Checkbox
					name="nocharts"
					defaultValue="1"
					defaultChecked={config.noCharts}
					onChange={(event) => event.currentTarget.form?.requestSubmit()}
				/>
				No charts
			</Label>
			<Button type="submit" appearance="outlined" intent="neutral">
				Load
			</Button>
		</form>
	);
};
