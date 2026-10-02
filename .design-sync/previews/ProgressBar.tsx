import { ProgressBar } from "@ngrok/mantle";

export const Colors = () => (
	<div className="flex w-full max-w-md flex-col gap-6">
		<ProgressBar.Root value={60}>
			<ProgressBar.Indicator className="bg-warning-600" />
		</ProgressBar.Root>
		<ProgressBar.Root value={30}>
			<ProgressBar.Indicator className="bg-accent-600" />
		</ProgressBar.Root>
		<ProgressBar.Root value={85}>
			<ProgressBar.Indicator className="bg-success-600" />
		</ProgressBar.Root>
	</div>
);

export const DeployStatus = () => (
	<div className="flex flex-col gap-3">
		<div className="flex items-center gap-3 text-sm">
			<ProgressBar.Root value={100} className="w-24">
				<ProgressBar.Indicator className="bg-success-600" />
			</ProgressBar.Root>
			us-east-1: Complete
		</div>
		<div className="flex items-center gap-3 text-sm">
			<ProgressBar.Root value={45} className="w-24">
				<ProgressBar.Indicator className="bg-warning-600" />
			</ProgressBar.Root>
			eu-central-1: In progress
		</div>
		<div className="flex items-center gap-3 text-sm">
			<ProgressBar.Root value={10} className="w-24">
				<ProgressBar.Indicator className="bg-danger-600" />
			</ProgressBar.Root>
			ap-southeast-1: Starting
		</div>
	</div>
);

export const CustomMax = () => (
	<div className="flex w-full max-w-md flex-col gap-2 text-sm">
		<div className="flex items-center justify-between">
			<span className="text-strong font-medium">Data transfer out</span>
			<span className="text-muted tabular-nums">150 GB of 200 GB</span>
		</div>
		<ProgressBar.Root value={150} max={200}>
			<ProgressBar.Indicator className="bg-accent-600" />
		</ProgressBar.Root>
	</div>
);

export const Indeterminate = () => (
	<div className="flex w-full max-w-md flex-col gap-2 text-sm">
		<span className="text-muted">Provisioning TLS certificate for api.example.com</span>
		<ProgressBar.Root value="indeterminate">
			<ProgressBar.Indicator className="bg-accent-600" />
		</ProgressBar.Root>
	</div>
);
