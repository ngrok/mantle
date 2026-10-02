import { ProgressDonut } from "@ngrok/mantle";

export const Colors = () => (
	<div className="flex items-center gap-6">
		<ProgressDonut.Root value={60} className="size-10" strokeWidth="0.375rem">
			<ProgressDonut.Indicator />
		</ProgressDonut.Root>
		<ProgressDonut.Root value={80} className="size-10" strokeWidth="0.375rem">
			<ProgressDonut.Indicator className="text-success-600" />
		</ProgressDonut.Root>
		<ProgressDonut.Root value={45} className="size-10" strokeWidth="0.375rem">
			<ProgressDonut.Indicator className="text-warning-600" />
		</ProgressDonut.Root>
		<ProgressDonut.Root value={95} className="size-10" strokeWidth="0.375rem">
			<ProgressDonut.Indicator className="text-danger-600" />
		</ProgressDonut.Root>
	</div>
);

export const UsageLegend = () => (
	<div className="flex flex-col gap-2">
		<div className="flex items-center gap-1.5 text-sm">
			<ProgressDonut.Root value={100} className="size-6">
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>
			Data transfer out
		</div>
		<div className="flex items-center gap-1.5 text-xs">
			<div className="grid w-6 place-items-center">
				<ProgressDonut.Root value={100} className="size-4" strokeWidth="0.1875rem">
					<ProgressDonut.Indicator />
				</ProgressDonut.Root>
			</div>
			Included: 1 TB
		</div>
		<div className="flex items-center gap-1.5 text-xs">
			<div className="grid w-6 place-items-center">
				<ProgressDonut.Root value={25} className="size-4" strokeWidth="0.1875rem">
					<ProgressDonut.Indicator />
				</ProgressDonut.Root>
			</div>
			Additional: 250 GB
		</div>
	</div>
);

export const Indeterminate = () => (
	<div className="flex items-center gap-3 text-sm">
		<ProgressDonut.Root value="indeterminate" className="size-10" strokeWidth="0.375rem">
			<ProgressDonut.Indicator />
		</ProgressDonut.Root>
		Waiting for the agent to connect…
	</div>
);
