import {
	CertificateIcon,
	FireIcon,
	GlobeIcon,
	Icon,
	KeyIcon,
	RobotIcon,
	ShieldCheckIcon,
} from "@ngrok/mantle";

export const Default = () => (
	<div className="flex items-center gap-4">
		<Icon svg={<GlobeIcon />} />
		<Icon svg={<RobotIcon />} />
		<Icon svg={<KeyIcon />} />
		<Icon svg={<CertificateIcon />} />
		<Icon svg={<ShieldCheckIcon />} />
	</div>
);

export const Colors = () => (
	<div className="flex items-center gap-4">
		<Icon className="text-danger-600" svg={<FireIcon weight="fill" />} />
		<Icon className="text-success-600" svg={<ShieldCheckIcon weight="fill" />} />
		<Icon className="text-warning-600" svg={<CertificateIcon weight="fill" />} />
		<Icon className="text-accent-600" svg={<GlobeIcon weight="fill" />} />
		<Icon className="text-muted" svg={<RobotIcon />} />
	</div>
);

export const Sizes = () => (
	<div className="flex items-end gap-4">
		<Icon className="size-4" svg={<FireIcon />} />
		<Icon svg={<FireIcon />} />
		<Icon className="size-8" svg={<FireIcon />} />
		<Icon className="size-12" svg={<FireIcon />} />
		<Icon className="size-16" svg={<FireIcon />} />
	</div>
);

export const InlineWithText = () => (
	<div className="flex flex-col gap-2 text-sm">
		<span className="flex items-center gap-1.5">
			<Icon className="text-success-600" svg={<ShieldCheckIcon weight="fill" />} />
			TLS certificate valid until Mar 14, 2027
		</span>
		<span className="flex items-center gap-1.5">
			<Icon className="text-muted" svg={<GlobeIcon />} />
			api.example.com
		</span>
	</div>
);
