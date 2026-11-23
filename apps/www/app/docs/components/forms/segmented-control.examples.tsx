import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { SegmentedControl } from "@ngrok/mantle/segmented-control";
import { ListIcon } from "@phosphor-icons/react/List";
import { SquaresFourIcon } from "@phosphor-icons/react/SquaresFour";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export function ControlledDemo() {
	const [view, setView] = useState("list");

	return (
		<div className="flex flex-col items-center gap-3">
			<SegmentedControl.Root aria-label="View" value={view} onValueChange={setView}>
				<SegmentedControl.Item value="list">List</SegmentedControl.Item>
				<SegmentedControl.Item value="board">Board</SegmentedControl.Item>
				<SegmentedControl.Item value="calendar">Calendar</SegmentedControl.Item>
			</SegmentedControl.Root>
			<p className="text-muted text-sm">Current view: {view}</p>
		</div>
	);
}

export const formSchema = z.object({
	region: z.string().min(1, "Choose a region."),
});

export function TanStackFormExample() {
	const form = useForm({
		defaultValues: { region: "" },
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			window.alert(`Submitted: ${JSON.stringify(value, null, 2)}`);
		},
	});

	return (
		<form
			className="w-full max-w-sm space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="region">
				{(field) => (
					<Field.Set>
						<Field.Legend>Region</Field.Legend>
						<SegmentedControl.Root
							name={field.name}
							value={field.state.value}
							onValueChange={field.handleChange}
						>
							<SegmentedControl.Item value="us">US</SegmentedControl.Item>
							<SegmentedControl.Item value="eu">EU</SegmentedControl.Item>
							<SegmentedControl.Item value="ap">AP</SegmentedControl.Item>
						</SegmentedControl.Root>
						<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
					</Field.Set>
				)}
			</form.Field>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
}

/** The first example on the Segmented Control docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<SegmentedControl.Root
				aria-label="Environment"
				defaultValue="production"
				className="w-full max-w-md"
			>
				<SegmentedControl.Item value="development">Dev</SegmentedControl.Item>
				<SegmentedControl.Item value="staging" disabled>
					Staging
				</SegmentedControl.Item>
				<SegmentedControl.Item value="production">Prod</SegmentedControl.Item>
			</SegmentedControl.Root>
		</PreviewCanvas>
	);
}

/** The "Controlled" example on the Segmented Control docs page. */
export function ControlledExample() {
	return (
		<PreviewCanvas>
			<ControlledDemo />
		</PreviewCanvas>
	);
}

/** The "Icon segments" example on the Segmented Control docs page. */
export function IconSegmentsExample() {
	return (
		<PreviewCanvas>
			<SegmentedControl.Root aria-label="Layout" defaultValue="list" className="w-fit">
				<SegmentedControl.Item value="list">
					<ListIcon aria-hidden className="size-5" />
					<span className="sr-only">List</span>
				</SegmentedControl.Item>
				<SegmentedControl.Item value="grid">
					<SquaresFourIcon aria-hidden className="size-5" />
					<span className="sr-only">Grid</span>
				</SegmentedControl.Item>
			</SegmentedControl.Root>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Segmented Control docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}
