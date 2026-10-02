import {
	Badge,
	CheckCircleIcon,
	GlobeHemisphereWestIcon,
	LightningIcon,
	WarningIcon,
	XCircleIcon,
} from "@ngrok/mantle";

export const Status = () => (
	<div className="flex flex-wrap items-center gap-2">
		<Badge appearance="muted" color="success" icon={<CheckCircleIcon />}>
			Online
		</Badge>
		<Badge appearance="muted" color="warning" icon={<WarningIcon />}>
			Degraded
		</Badge>
		<Badge appearance="muted" color="danger" icon={<XCircleIcon />}>
			Offline
		</Badge>
		<Badge appearance="muted" color="neutral">
			Pending
		</Badge>
	</div>
);

export const FunctionalColors = () => (
	<div className="flex flex-wrap items-center gap-2">
		<Badge appearance="muted" color="neutral">
			Neutral
		</Badge>
		<Badge appearance="muted" color="accent">
			Accent
		</Badge>
		<Badge appearance="muted" color="info">
			Info
		</Badge>
		<Badge appearance="muted" color="success">
			Success
		</Badge>
		<Badge appearance="muted" color="warning">
			Warning
		</Badge>
		<Badge appearance="muted" color="danger">
			Danger
		</Badge>
	</div>
);

export const NamedHues = () => (
	<div className="flex flex-wrap items-center gap-2">
		<Badge appearance="muted" color="blue" icon={<GlobeHemisphereWestIcon />}>
			us-east
		</Badge>
		<Badge appearance="muted" color="emerald" icon={<GlobeHemisphereWestIcon />}>
			eu-central
		</Badge>
		<Badge appearance="muted" color="amber" icon={<GlobeHemisphereWestIcon />}>
			ap-southeast
		</Badge>
		<Badge appearance="muted" color="violet" icon={<GlobeHemisphereWestIcon />}>
			sa-east
		</Badge>
		<Badge appearance="muted" color="pink" icon={<LightningIcon />}>
			Beta
		</Badge>
	</div>
);

export const InContext = () => (
	<div className="flex w-full max-w-md items-center justify-between rounded-md border border-card bg-card px-4 py-3">
		<div className="flex flex-col">
			<span className="text-strong text-sm font-medium">https://api.acme.ngrok.app</span>
			<span className="text-muted text-xs">Cloud endpoint · us-east</span>
		</div>
		<Badge appearance="muted" color="success" icon={<CheckCircleIcon />}>
			Healthy
		</Badge>
	</div>
);
