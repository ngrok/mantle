import {
	ArrowClockwiseIcon,
	CopyIcon,
	DotsThreeIcon,
	GearIcon,
	GlobeIcon,
	IconButton,
	TrashIcon,
} from "@ngrok/mantle";

export const Appearances = () => (
	<div className="flex items-center gap-2">
		<IconButton
			appearance="ghost"
			intent="neutral"
			label="Open endpoint settings"
			icon={<GearIcon />}
		/>
		<IconButton
			appearance="filled"
			intent="neutral"
			label="Open endpoint settings"
			icon={<GearIcon />}
		/>
		<IconButton
			appearance="outlined"
			intent="neutral"
			label="Open endpoint settings"
			icon={<GearIcon />}
		/>
	</div>
);

export const Sizes = () => (
	<div className="flex items-center gap-2">
		<IconButton
			appearance="outlined"
			intent="neutral"
			size="xs"
			label="View domain"
			icon={<GlobeIcon />}
		/>
		<IconButton
			appearance="outlined"
			intent="neutral"
			size="sm"
			label="View domain"
			icon={<GlobeIcon />}
		/>
		<IconButton
			appearance="outlined"
			intent="neutral"
			size="md"
			label="View domain"
			icon={<GlobeIcon />}
		/>
		<IconButton
			appearance="outlined"
			intent="neutral"
			size="lg"
			label="View domain"
			icon={<GlobeIcon />}
		/>
		<IconButton
			appearance="outlined"
			intent="neutral"
			size="xl"
			label="View domain"
			icon={<GlobeIcon />}
		/>
	</div>
);

export const RowActions = () => (
	<div className="flex w-full max-w-md items-center justify-between rounded-md border border-card bg-card px-3 py-2">
		<span className="font-mono text-sm text-strong">https://api.example.ngrok.app</span>
		<div className="flex items-center gap-1">
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="sm"
				label="Copy URL"
				icon={<CopyIcon />}
			/>
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="sm"
				label="Restart endpoint"
				icon={<ArrowClockwiseIcon />}
			/>
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="sm"
				label="More actions"
				icon={<DotsThreeIcon weight="bold" />}
			/>
		</div>
	</div>
);

export const States = () => (
	<div className="flex items-center gap-2">
		<IconButton
			appearance="outlined"
			intent="neutral"
			label="Refresh traffic"
			isLoading
			icon={<ArrowClockwiseIcon />}
		/>
		<IconButton
			appearance="outlined"
			intent="neutral"
			label="Delete agent"
			disabled
			icon={<TrashIcon />}
		/>
		<IconButton
			appearance="filled"
			intent="neutral"
			label="Delete agent"
			disabled
			icon={<TrashIcon />}
		/>
	</div>
);
