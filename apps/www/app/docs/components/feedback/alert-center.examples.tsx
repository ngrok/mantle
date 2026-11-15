import {
	AlertCenterCustomContentExample,
	AlertCenterExample,
	AlertCenterMixedDismissabilityExample,
	AlertCenterPersistedDismissExample,
	AlertCenterRouteAlertExample,
	AlertCenterSingleAlertExample,
	AlertCenterSupportingCopyExample,
} from "~/features/alert-center-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Alert Center docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<AlertCenterSingleAlertExample />
		</PreviewCanvas>
	);
}

/** The "Several alerts" example on the Alert Center docs page. */
export function SeveralAlertsExample() {
	return (
		<PreviewCanvas>
			<AlertCenterExample />
		</PreviewCanvas>
	);
}

/** The "Dismissability" example on the Alert Center docs page. */
export function DismissabilityExample() {
	return (
		<PreviewCanvas>
			<AlertCenterMixedDismissabilityExample />
		</PreviewCanvas>
	);
}

/** The "Persisting dismissals" example on the Alert Center docs page. */
export function PersistingDismissalsExample() {
	return (
		<PreviewCanvas>
			<AlertCenterPersistedDismissExample />
		</PreviewCanvas>
	);
}

/** The "Supporting copy in the bar" example on the Alert Center docs page. */
export function SupportingCopyInTheBarExample() {
	return (
		<PreviewCanvas>
			<AlertCenterSupportingCopyExample />
		</PreviewCanvas>
	);
}

/** The "Where AlertCenter.Root goes" example on the Alert Center docs page. */
export function WhereAlertcenterRootGoesExample() {
	return (
		<PreviewCanvas>
			<AlertCenterRouteAlertExample />
		</PreviewCanvas>
	);
}

/** The "Custom content" example on the Alert Center docs page. */
export function CustomContentExample() {
	return (
		<PreviewCanvas>
			<AlertCenterCustomContentExample />
		</PreviewCanvas>
	);
}
