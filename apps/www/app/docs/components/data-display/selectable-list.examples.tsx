import { Badge } from "@ngrok/mantle/badge";
import { Button } from "@ngrok/mantle/button";
import { optionLabelText, SelectableList } from "@ngrok/mantle/selectable-list";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const accessKeyOptions = Array.from({ length: 60 }, (_, index) => {
	const names = [
		"Onboarding Key",
		"prod",
		"staging",
		"CI deploy",
		"edge worker",
		"analytics",
		"backup",
		"webhook relay",
	];
	const name = names[index % names.length] ?? "key";
	return {
		value: `key-${index}`,
		label: index < names.length ? name : `${name} ${Math.floor(index / names.length) + 1}`,
		description: `ng-${index.toString(36).padStart(6, "0")}***${(index * 7).toString(36).padStart(4, "0")}`,
		// A disabled row renders dimmed and can't be toggled or "select all"-ed.
		disabled: index === 2,
	};
});

export const keyOptions = [
	{ value: "onboarding", label: "Onboarding Key", description: "ng-3FbZthp***xcc3" },
	{ value: "prod", label: "prod", description: "ng-3FaThZL***8xiA" },
	{ value: "staging", label: "staging", description: "ng-7HkLmNp***1q2w" },
	{ value: "ci", label: "CI deploy", description: "ng-9XyZ012***3r4t" },
	{ value: "edge", label: "edge worker", description: "ng-4QrStUv***5w6x" },
];

export function SelectableListExample() {
	const [selected, setSelected] = useState(["key-0", "key-1"]);
	return (
		<div className="w-full max-w-md">
			<SelectableList.Root options={accessKeyOptions} value={selected} onValueChange={setSelected}>
				<SelectableList.Filter placeholder="Filter access keys…" aria-label="Filter access keys" />
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
				<SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
				<SelectableList.Empty>No access keys found.</SelectableList.Empty>
			</SelectableList.Root>
			<p className="text-muted mt-3 text-sm">{selected.length} selected</p>
		</div>
	);
}

export const keyStatus: Record<string, string> = {
	onboarding: "expiring soon",
	prod: "active",
	staging: "active",
	ci: "active",
	edge: "expiring soon",
};

export function CustomRowsDemo() {
	const [selected, setSelected] = useState(["prod"]);
	return (
		<div className="w-full max-w-md">
			<SelectableList.Root options={keyOptions} value={selected} onValueChange={setSelected}>
				<SelectableList.Viewport aria-label="Access keys" className="max-h-80">
					{(option) => {
						// Rich row data that isn't part of the option: look it up by `option.value`.
						const status = keyStatus[option.value];
						return (
							<SelectableList.Item value={option.value}>
								{/* Stopgap: inside Item you are hand-rolling the row's content cell.
								    Keep ItemTitle: it is the label that names the row's checkbox. */}
								<div className="flex items-center gap-2">
									<SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
									<Badge appearance="muted" color={status === "active" ? "success" : "warning"}>
										{status}
									</Badge>
								</div>
								<SelectableList.ItemDescription translate="no" className="font-mono">
									{option.description}
								</SelectableList.ItemDescription>
							</SelectableList.Item>
						);
					}}
				</SelectableList.Viewport>
			</SelectableList.Root>
		</div>
	);
}

export function ControlledDemo() {
	const [selected, setSelected] = useState(["onboarding"]);
	return (
		<div className="w-full max-w-md space-y-3">
			<SelectableList.Root options={keyOptions} value={selected} onValueChange={setSelected}>
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
				<SelectableList.Viewport aria-label="Access keys" className="max-h-72" />
			</SelectableList.Root>
			<div className="flex items-center justify-between text-sm">
				<span className="text-muted">{selected.length} selected</span>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setSelected([])}
					disabled={selected.length === 0}
				>
					Clear
				</Button>
			</div>
		</div>
	);
}

export function UncontrolledDemo() {
	return (
		<div className="w-full max-w-md">
			<SelectableList.Root options={keyOptions} defaultValue={["prod"]}>
				<SelectableList.Filter placeholder="Filter access keys…" aria-label="Filter access keys" />
				<SelectableList.Viewport aria-label="Access keys" className="max-h-72" />
				<SelectableList.Empty>No access keys found.</SelectableList.Empty>
			</SelectableList.Root>
		</div>
	);
}

export function ControlledQueryExample() {
	const [query, setQuery] = useState("ng-3f");
	const [selected, setSelected] = useState(["prod"]);
	return (
		<div className="w-full max-w-md space-y-3">
			<SelectableList.Root
				options={keyOptions}
				value={selected}
				onValueChange={setSelected}
				query={query}
				onQueryChange={setQuery}
				filter={(option, query) => {
					const needle = query.trim().toLowerCase();
					if (needle === "") {
						return true;
					}
					const description = typeof option.description === "string" ? option.description : "";
					return (
						optionLabelText(option).toLowerCase().includes(needle) ||
						description.toLowerCase().includes(needle)
					);
				}}
			>
				<SelectableList.Filter
					placeholder="Filter by name or key…"
					aria-label="Filter access keys"
				/>
				<SelectableList.Viewport aria-label="Access keys" className="max-h-72" />
				<SelectableList.Empty>No access keys found.</SelectableList.Empty>
			</SelectableList.Root>
			<p className="text-muted text-sm">
				query: <span>{`“${query}”`}</span>
			</p>
		</div>
	);
}

export const disabledOptions = [
	{ value: "prod", label: "prod", description: "ng-3FaThZL***8xiA" },
	{ value: "staging", label: "staging", description: "ng-7HkLmNp***1q2w" },
	// A disabled row renders dimmed and can't be toggled or "select all"-ed.
	{ value: "legacy", label: "legacy", description: "ng-1AbCdEf***0000", disabled: true },
];

export function DisabledRowExample() {
	const [selected, setSelected] = useState(["prod"]);
	return (
		<div className="w-full max-w-md">
			<SelectableList.Root options={disabledOptions} value={selected} onValueChange={setSelected}>
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
				<SelectableList.Viewport aria-label="Access keys" className="max-h-72" />
			</SelectableList.Root>
		</div>
	);
}

export function VirtualViewportExample() {
	const [selected, setSelected] = useState(["key-0", "key-1"]);
	return (
		<div className="w-full max-w-md">
			<SelectableList.Root options={accessKeyOptions} value={selected} onValueChange={setSelected}>
				<SelectableList.Filter placeholder="Filter access keys…" aria-label="Filter access keys" />
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
				<SelectableList.VirtualViewport aria-label="Access keys" className="max-h-80" />
				<SelectableList.Empty>No access keys found.</SelectableList.Empty>
			</SelectableList.Root>
		</div>
	);
}

/** The first example on the Selectable List docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<SelectableListExample />
		</PreviewCanvas>
	);
}

/** The "Disabled rows" example on the Selectable List docs page. */
export function DisabledRowsExample() {
	return (
		<PreviewCanvas>
			<DisabledRowExample />
		</PreviewCanvas>
	);
}

/** The "Custom rows" example on the Selectable List docs page. */
export function CustomRowsExample() {
	return (
		<PreviewCanvas>
			<CustomRowsDemo />
		</PreviewCanvas>
	);
}

/** The "Virtualization" example on the Selectable List docs page. */
export function VirtualizationExample() {
	return (
		<PreviewCanvas>
			<VirtualViewportExample />
		</PreviewCanvas>
	);
}

/** The "Controlled" example on the Selectable List docs page. */
export function ControlledExample() {
	return (
		<PreviewCanvas>
			<ControlledDemo />
		</PreviewCanvas>
	);
}

/** The "Uncontrolled" example on the Selectable List docs page. */
export function UncontrolledExample() {
	return (
		<PreviewCanvas>
			<UncontrolledDemo />
		</PreviewCanvas>
	);
}

/** The "Controlled query and custom filter" example on the Selectable List docs page. */
export function ControlledQueryAndCustomFilterExample() {
	return (
		<PreviewCanvas>
			<ControlledQueryExample />
		</PreviewCanvas>
	);
}
