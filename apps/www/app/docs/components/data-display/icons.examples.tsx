import {
	AutoThemeIcon,
	NgrokLettermarkIcon,
	NgrokWordmarkIcon,
	SortIcon,
	ThemeIcon,
	TrafficPolicyFileIcon,
} from "@ngrok/mantle/icons";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";

import { Icon } from "@ngrok/mantle/icon";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Icons docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="gap-4">
			<SortIcon mode="time" direction="newest-to-oldest" />
			<ThemeIcon theme="system" />
			<AutoThemeIcon />
			<TrafficPolicyFileIcon />
			<NgrokLettermarkIcon />
			<NgrokWordmarkIcon />
		</PreviewCanvas>
	);
}

/** The "Color-coded icons" example on the Icons docs page. */
export function ColorCodedIconsExample() {
	return (
		<PreviewCanvas className="flex-col items-start gap-2">
			<p className="flex items-center gap-2">
				<Icon svg={<CheckCircleIcon weight="fill" />} className="text-success-600" />
				Online
			</p>
			<p className="flex items-center gap-2">
				<Icon svg={<WarningIcon weight="fill" />} className="text-warning-600" />
				Degraded
			</p>
			<p className="flex items-center gap-2">
				<Icon svg={<XCircleIcon weight="fill" />} className="text-danger-600" />
				Offline
			</p>
		</PreviewCanvas>
	);
}
