import { Field, Slider } from "@ngrok/mantle";

export const WithField = () => (
	<Field.Item name="sample-rate" className="w-80">
		<Field.Label>Sample rate</Field.Label>
		<Field.Control>
			<Slider aria-label="Sample rate" defaultValue={25} max={100} step={1} />
		</Field.Control>
		<Field.Description>Percent of requests to capture in Traffic Inspector.</Field.Description>
	</Field.Item>
);

export const Range = () => (
	<div className="w-80">
		<Slider aria-label="Latency budget" defaultValue={[20, 60]} max={100} step={5} />
	</div>
);

export const Ticks = () => (
	<div className="flex w-80 flex-col gap-6">
		<Slider aria-label="Replicas" defaultValue={40} max={100} step={10} showTicks />
		<Slider aria-label="Rate limit window" defaultValue={[20, 80]} max={100} step={20} showTicks />
	</div>
);

export const Colors = () => (
	<div className="flex w-80 flex-col gap-6">
		<Slider
			aria-label="Warning threshold"
			defaultValue={67}
			max={100}
			step={1}
			color="bg-warning-600"
		/>
		<Slider
			aria-label="Danger threshold"
			defaultValue={85}
			max={100}
			step={1}
			color="bg-danger-600"
		/>
		<Slider
			aria-label="Healthy threshold"
			defaultValue={40}
			max={100}
			step={1}
			color="bg-emerald-600"
		/>
	</div>
);

export const Disabled = () => (
	<div className="w-80">
		<Slider aria-label="Sample rate" defaultValue={67} max={100} step={1} disabled />
	</div>
);

export const Vertical = () => (
	<div className="flex h-40 items-center gap-8">
		<Slider aria-label="CPU limit" defaultValue={67} max={100} step={1} orientation="vertical" />
		<Slider aria-label="Memory limit" defaultValue={30} max={100} step={1} orientation="vertical" />
	</div>
);
