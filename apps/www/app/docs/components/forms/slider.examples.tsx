import { Button } from "@ngrok/mantle/button";
import { Field, toErrorMessages } from "@ngrok/mantle/field";
import { Slider, SliderValue } from "@ngrok/mantle/slider";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { PreviewCanvas } from "~/components/preview-canvas";

export const formSchema = z.object({
	volume: z.number().min(25, "Choose at least 25."),
});

export function TanStackFormExample() {
	const defaultValues = {
		volume: 50,
	};
	const form = useForm({
		defaultValues,
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
			<form.Field name="volume">
				{(field) => (
					<Field.Item name={field.name}>
						<Field.Label>Volume</Field.Label>
						<Field.Control>
							<Slider
								aria-label="Volume"
								value={field.state.value}
								onBlur={field.handleBlur}
								onValueChange={(value) => field.handleChange(value[0] ?? 0)}
								max={100}
								step={1}
							/>
						</Field.Control>
						<Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
					</Field.Item>
				)}
			</form.Field>
			<Button type="submit" appearance="filled" intent="neutral">
				Submit
			</Button>
		</form>
	);
}

/** The first example on the Slider docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Field.Item name="volume">
				<Field.Label>Volume</Field.Label>
				<Field.Control>
					<Slider aria-label="Volume" defaultValue={67} max={100} step={1} />
				</Field.Control>
				<Field.Description>Drag to adjust playback volume.</Field.Description>
			</Field.Item>
		</PreviewCanvas>
	);
}

/** The "Disabled" example on the Slider docs page. */
export function DisabledExample() {
	return (
		<PreviewCanvas>
			<Slider aria-label="Disabled volume" defaultValue={67} max={100} step={1} disabled />
		</PreviewCanvas>
	);
}

/** The "Vertical" example on the Slider docs page. */
export function VerticalExample() {
	return (
		<PreviewCanvas>
			<Slider
				aria-label="Vertical volume"
				defaultValue={67}
				max={100}
				step={1}
				orientation="vertical"
			/>
		</PreviewCanvas>
	);
}

/** The "With TanStack Form" example on the Slider docs page. */
export function WithTanstackFormExample() {
	return (
		<PreviewCanvas className="w-full">
			<TanStackFormExample />
		</PreviewCanvas>
	);
}

/** The "Single thumb" example on the Slider docs page. */
export function SingleThumbExample() {
	return (
		<PreviewCanvas>
			<Slider aria-label="Volume" defaultValue={67} max={100} step={1} />
		</PreviewCanvas>
	);
}

/** The "Range" example on the Slider docs page. */
export function RangeExample() {
	return (
		<PreviewCanvas>
			<Slider aria-label="Price" defaultValue={[25, 50]} max={100} step={5} />
		</PreviewCanvas>
	);
}

/** The "Multiple thumbs" example on the Slider docs page. */
export function MultipleThumbsExample() {
	return (
		<PreviewCanvas>
			<Slider aria-label="Breakpoint" defaultValue={[10, 20, 70]} max={100} step={10} />
		</PreviewCanvas>
	);
}

/** The "Color" example on the Slider docs page. */
export function ColorExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Slider
				aria-label="Warning threshold"
				defaultValue={67}
				max={100}
				step={1}
				color="bg-warning-600"
			/>
			<Slider
				aria-label="Danger threshold"
				defaultValue={67}
				max={100}
				step={1}
				color="bg-danger-600"
			/>
			<Slider
				aria-label="Success threshold"
				defaultValue={67}
				max={100}
				step={1}
				color="bg-emerald-600"
			/>
		</PreviewCanvas>
	);
}

/** The "Ticks" example on the Slider docs page. */
export function TicksExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<Slider aria-label="Volume" defaultValue={50} max={100} step={10} showTicks />
			<Slider aria-label="Price" defaultValue={[20, 80]} max={100} step={20} showTicks />
		</PreviewCanvas>
	);
}

export function ValueExample() {
	return (
		<PreviewCanvas className="flex-col gap-12 pt-12">
			<Slider aria-label="Volume" defaultValue={40} formatValue={(value) => `${value}%`}>
				<SliderValue />
			</Slider>
			<Slider aria-label="Price" defaultValue={[20, 80]} formatValue={(value) => `$${value}`}>
				<SliderValue placement="track" />
			</Slider>
		</PreviewCanvas>
	);
}
