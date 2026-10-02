import {
	ButtonGroup,
	CaretLeftIcon,
	CaretRightIcon,
	CodeIcon,
	CopyIcon,
	DownloadSimpleIcon,
	IconButton,
	PencilSimpleIcon,
	Separator,
	TrashIcon,
} from "@ngrok/mantle";

export const Panel = () => (
	<ButtonGroup appearance="panel">
		<IconButton
			appearance="ghost"
			intent="neutral"
			size="sm"
			label="Edit traffic policy"
			icon={<PencilSimpleIcon />}
		/>
		<IconButton
			appearance="ghost"
			intent="neutral"
			size="sm"
			label="Copy traffic policy"
			icon={<CopyIcon />}
		/>
		<IconButton
			appearance="ghost"
			intent="neutral"
			size="sm"
			label="Download traffic policy"
			icon={<DownloadSimpleIcon />}
		/>
		<Separator orientation="vertical" className="min-h-5" />
		<IconButton
			appearance="ghost"
			intent="neutral"
			size="sm"
			label="Delete traffic policy"
			icon={<TrashIcon />}
		/>
	</ButtonGroup>
);

export const Pagination = () => (
	<div className="flex items-center gap-3">
		<span className="text-muted text-sm">Showing 1–20 of 248 endpoints</span>
		<ButtonGroup appearance="panel">
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="sm"
				label="Previous page"
				disabled
				icon={<CaretLeftIcon />}
			/>
			<Separator orientation="vertical" className="min-h-5" />
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="sm"
				label="Next page"
				icon={<CaretRightIcon />}
			/>
		</ButtonGroup>
	</div>
);

export const Ghost = () => (
	<ButtonGroup appearance="ghost">
		<IconButton appearance="ghost" intent="neutral" label="View source" icon={<CodeIcon />} />
		<IconButton appearance="ghost" intent="neutral" label="Copy request" icon={<CopyIcon />} />
		<IconButton
			appearance="ghost"
			intent="neutral"
			label="Download request"
			icon={<DownloadSimpleIcon />}
		/>
	</ButtonGroup>
);
